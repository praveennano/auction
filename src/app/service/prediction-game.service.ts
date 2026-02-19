import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PgTeam {
    id: string;
    team_name: string;
    team_short_name: string;
    team_logo_url: string;
    team_color: string;
}

export interface PgPlayer {
    id: string;
    player_name: string;
    player_image_url: string;
    player_role: string;
    base_price: number;
    final_team_id: string | null;
    final_price: number | null;
    auction_status: 'upcoming' | 'sold' | 'unsold';
    auction_order: number;
}

export interface PgPrediction {
    id: string;
    user_id: string;
    player_id: string;
    predicted_team_id: string;
    tokens_bet: number;
    tokens_won: number;
    status: 'active' | 'won' | 'lost';
}

export interface PgUserProfile {
    id: string;
    phone_number: string;
    display_name: string;
    initial_tokens: number;
    token_balance: number;
    tokens_spent: number;
    tokens_won: number;
    total_predictions: number;
    correct_predictions: number;
    accuracy_percentage: number;
    email?: string;
}

// Map: playerId -> teamId -> tokens
export type PredictionMap = Map<string, Map<string, number>>;

// Pool info per player: total tokens bet by all users + per team
export interface PlayerPoolInfo {
    player_id: string;
    total_tokens: number;
    team_tokens: Map<string, number>;
}

@Injectable({
    providedIn: 'root'
})
export class PredictionGameService {
    private teamsSubject = new BehaviorSubject<PgTeam[]>([]);
    teams$: Observable<PgTeam[]> = this.teamsSubject.asObservable();

    private playersSubject = new BehaviorSubject<PgPlayer[]>([]);
    players$: Observable<PgPlayer[]> = this.playersSubject.asObservable();

    private userProfileSubject = new BehaviorSubject<PgUserProfile | null>(null);
    userProfile$: Observable<PgUserProfile | null> = this.userProfileSubject.asObservable();

    private predictionsSubject = new BehaviorSubject<PredictionMap>(new Map());
    predictions$: Observable<PredictionMap> = this.predictionsSubject.asObservable();

    private poolInfoSubject = new BehaviorSubject<Map<string, PlayerPoolInfo>>(new Map());
    poolInfo$: Observable<Map<string, PlayerPoolInfo>> = this.poolInfoSubject.asObservable();

    private realtimeChannel: any = null;

    constructor(private supabaseService: SupabaseService) { }

    async loadTeams(): Promise<PgTeam[]> {
        const { data, error } = await this.supabaseService.client
            .from('teams')
            .select('*')
            .order('team_short_name');
        if (error) throw error;
        this.teamsSubject.next(data || []);
        return data || [];
    }

    async loadPlayers(): Promise<PgPlayer[]> {
        const { data, error } = await this.supabaseService.client
            .from('auction_players')
            .select('*')
            .order('auction_order');
        if (error) throw error;
        this.playersSubject.next(data || []);
        return data || [];
    }

    async loadUserProfile(userId: string): Promise<PgUserProfile | null> {
        const { data, error } = await this.supabaseService.client
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) return null;
        this.userProfileSubject.next(data);
        return data;
    }

    async loadUserPredictions(userId: string): Promise<void> {
        const { data, error } = await this.supabaseService.client
            .from('predictions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) throw error;

        const predMap: PredictionMap = new Map();
        (data || []).forEach((pred: PgPrediction) => {
            if (!predMap.has(pred.player_id)) {
                predMap.set(pred.player_id, new Map());
            }
            predMap.get(pred.player_id)!.set(pred.predicted_team_id, pred.tokens_bet);
        });
        this.predictionsSubject.next(predMap);
    }

    async loadAllPoolInfo(): Promise<void> {
        const { data, error } = await this.supabaseService.client
            .from('predictions')
            .select('player_id, predicted_team_id, tokens_bet')
            .eq('status', 'active');

        if (error) return;

        const poolMap = new Map<string, PlayerPoolInfo>();
        (data || []).forEach((pred: any) => {
            if (!poolMap.has(pred.player_id)) {
                poolMap.set(pred.player_id, {
                    player_id: pred.player_id,
                    total_tokens: 0,
                    team_tokens: new Map()
                });
            }
            const info = poolMap.get(pred.player_id)!;
            info.total_tokens += pred.tokens_bet;
            const existing = info.team_tokens.get(pred.predicted_team_id) || 0;
            info.team_tokens.set(pred.predicted_team_id, existing + pred.tokens_bet);
        });
        this.poolInfoSubject.next(poolMap);
    }

    async updateTokenAllocation(playerId: string, teamId: string, amount: number): Promise<any> {
        const profile = this.userProfileSubject.value;
        if (!profile) throw new Error('Not logged in');
        const { data, error } = await this.supabaseService.client.rpc('update_token_allocation', {
            p_user_id: profile.id,
            p_player_id: playerId,
            p_team_id: teamId,
            p_token_amount: amount
        });
        if (error) throw error;
        return data;
    }

    subscribeToRealtime(userId: string, onUpdate: () => void): void {
        this.unsubscribeRealtime();
        this.realtimeChannel = this.supabaseService.client
            .channel('predictions-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'predictions'
            }, () => {
                this.loadAllPoolInfo();
                onUpdate();
            })
            .subscribe();
    }

    unsubscribeRealtime(): void {
        if (this.realtimeChannel) {
            this.supabaseService.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
    }

    getTokensForPlayerTeam(playerId: string, teamId: string): number {
        const predMap = this.predictionsSubject.value;
        return predMap.get(playerId)?.get(teamId) || 0;
    }

    getTotalTokensForPlayer(playerId: string): number {
        const predMap = this.predictionsSubject.value;
        const teamMap = predMap.get(playerId);
        if (!teamMap) return 0;
        let total = 0;
        teamMap.forEach(v => total += v);
        return total;
    }

    getPoolTotal(playerId: string): number {
        return this.poolInfoSubject.value.get(playerId)?.total_tokens || 0;
    }

    getPayoutMultiplier(playerId: string, teamId: string): number {
        const info = this.poolInfoSubject.value.get(playerId);
        if (!info || info.total_tokens === 0) return 0;
        const teamTokens = info.team_tokens.get(teamId) || 0;
        if (teamTokens === 0) return 0;
        return Math.round((info.total_tokens / teamTokens) * 10) / 10;
    }

    updateLocalPrediction(playerId: string, teamId: string, amount: number): void {
        const predMap = new Map(this.predictionsSubject.value);
        if (!predMap.has(playerId)) {
            predMap.set(playerId, new Map());
        }
        const teamMap = new Map(predMap.get(playerId)!);
        if (amount === 0) {
            teamMap.delete(teamId);
        } else {
            teamMap.set(teamId, amount);
        }
        predMap.set(playerId, teamMap);
        this.predictionsSubject.next(predMap);
    }

    updateLocalBalance(newBalance: number): void {
        const profile = this.userProfileSubject.value;
        if (profile) {
            this.userProfileSubject.next({ ...profile, token_balance: newBalance });
        }
    }

    async loadLeaderboard(): Promise<PgUserProfile[]> {
        const { data, error } = await this.supabaseService.client
            .from('users')
            .select('*')
            .order('token_balance', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    /**
     * Join or login by phone number (no Supabase Auth).
     * If phone exists → return existing profile.
     * If new → create profile with given name and tokens.
     */
    async joinOrLogin(phone: string, displayName: string, initialTokens: number): Promise<PgUserProfile> {
        // Check if user already exists
        const existing = await this.getProfileByPhone(phone);
        if (existing) {
            this.userProfileSubject.next(existing);
            return existing;
        }

        // Create new user (no auth — just a row in users table)
        const newUser = {
            phone_number: phone,
            display_name: displayName,
            initial_tokens: initialTokens,
            token_balance: initialTokens,
            tokens_spent: 0,
            tokens_won: 0,
            total_predictions: 0,
            correct_predictions: 0,
            accuracy_percentage: 0
        };

        const { data, error } = await this.supabaseService.client
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) throw new Error(error.message);
        this.userProfileSubject.next(data);
        return data;
    }

    async getProfileByPhone(phone: string): Promise<PgUserProfile | null> {
        const { data, error } = await this.supabaseService.client
            .from('users')
            .select('*')
            .eq('phone_number', phone)
            .maybeSingle();
        if (error || !data) return null;
        this.userProfileSubject.next(data);
        return data;
    }

    clearSession(): void {
        this.userProfileSubject.next(null);
        this.predictionsSubject.next(new Map());
        this.poolInfoSubject.next(new Map());
        this.unsubscribeRealtime();
    }
}
