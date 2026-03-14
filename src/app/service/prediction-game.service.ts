import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PgUserProfile {
    id: string;
    username: string;
    display_name: string;
    phone_number: string;
    initial_tokens: number;
    token_balance: number;
    tokens_spent: number;
    tokens_won: number;
    total_predictions: number;
    correct_predictions: number;
    accuracy_percentage: number;
    role?: string;
    needs_token_setup?: boolean;
    created_at?: string;
}

export interface PgTeam {
    id: string;
    team_name: string;
    team_short_name: string;
    team_color: string;
}

export interface PgPlayer {
    id: string;
    player_name: string;
    player_role: string;
    base_price: number;
    final_team_id?: string;
    final_price?: number;
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

export interface PgPoolInfo {
    player_id: string;
    predicted_team_id: string;
    total_tokens: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionGameService {

    private userProfileSubject = new BehaviorSubject<PgUserProfile | null>(null);
    private teamsSubject = new BehaviorSubject<PgTeam[]>([]);
    private playersSubject = new BehaviorSubject<PgPlayer[]>([]);
    private predictionsSubject = new BehaviorSubject<PgPrediction[]>([]);
    private poolInfoSubject = new BehaviorSubject<PgPoolInfo[]>([]);

    userProfile$ = this.userProfileSubject.asObservable();
    teams$ = this.teamsSubject.asObservable();
    players$ = this.playersSubject.asObservable();
    predictions$ = this.predictionsSubject.asObservable();
    poolInfo$ = this.poolInfoSubject.asObservable();

    private realtimeChannel: any = null;

    constructor(private supabaseService: SupabaseService) { }

    // ─── AUTH ──────────────────────────────────────────────────────────────

    async signUp(
        username: string,
        password: string,
        phone: string,
        displayName: string,
        initialTokens: number
    ): Promise<PgUserProfile> {
        const { data, error } = await this.supabaseService.client
            .rpc('pg_sign_up', {
                p_username: username.trim().toLowerCase(),
                p_password: password,
                p_phone: phone.trim(),
                p_display_name: displayName.trim(),
                p_tokens: initialTokens
            });

        if (error) throw new Error(error.message);

        const profile = data as PgUserProfile;
        this.userProfileSubject.next(profile);
        return profile;
    }

    async signIn(username: string, password: string): Promise<PgUserProfile> {
        const { data, error } = await this.supabaseService.client
            .rpc('pg_sign_in', {
                p_username: username.trim().toLowerCase(),
                p_password: password
            });

        if (error) throw new Error(error.message);

        const profile = data as PgUserProfile;
        this.userProfileSubject.next(profile);
        return profile;
    }

    async getProfileByUsername(username: string): Promise<PgUserProfile | null> {
        const { data } = await this.supabaseService.client
            .from('users')
            .select('id,username,display_name,phone_number,initial_tokens,token_balance,tokens_spent,tokens_won,total_predictions,correct_predictions,accuracy_percentage,role,needs_token_setup,created_at')
            .eq('username', username.trim().toLowerCase())
            .maybeSingle();
        return data as PgUserProfile | null;
    }

    async refreshProfile(userId: string): Promise<void> {
        const { data } = await this.supabaseService.client
            .from('users')
            .select('id,username,display_name,phone_number,initial_tokens,token_balance,tokens_spent,tokens_won,total_predictions,correct_predictions,accuracy_percentage,created_at')
            .eq('id', userId)
            .maybeSingle();
        if (data) this.userProfileSubject.next(data as PgUserProfile);
    }

    clearSession(): void {
        this.userProfileSubject.next(null);
        this.teamsSubject.next([]);
        this.playersSubject.next([]);
        this.predictionsSubject.next([]);
        this.poolInfoSubject.next([]);
        this.unsubscribeRealtime();
    }

    get isAdmin(): boolean {
        return this.userProfileSubject.value?.role === 'admin';
    }

    async resetAllPredictions(userId: string): Promise<{ predictions_deleted: number; message: string }> {
        const { data, error } = await this.supabaseService.client
            .rpc('reset_all_predictions', { p_user_id: userId });

        if (error) throw new Error(error.message);
        return data;
    }

    async setUserTokens(userId: string, tokens: number): Promise<void> {
        const { error } = await this.supabaseService.client
            .rpc('set_user_tokens', { p_user_id: userId, p_tokens: tokens });

        if (error) throw new Error(error.message);

        // Refresh profile to get updated balance
        await this.refreshProfile(userId);
    }

    // ─── DATA LOADING ──────────────────────────────────────────────────────

    async loadTeams(): Promise<void> {
        const { data } = await this.supabaseService.client
            .from('teams').select('*').order('team_short_name');
        if (data) this.teamsSubject.next(data as PgTeam[]);
    }

    async loadPlayers(): Promise<void> {
        const { data } = await this.supabaseService.client
            .from('auction_players').select('*').order('player_name', { ascending: true });
        if (data) this.playersSubject.next(data as PgPlayer[]);
    }

    async loadUserProfile(userId: string): Promise<void> {
        await this.refreshProfile(userId);
    }

    async loadUserPredictions(userId: string): Promise<void> {
        const { data } = await this.supabaseService.client
            .from('predictions').select('*')
            .eq('user_id', userId);
        if (data) this.predictionsSubject.next(data as PgPrediction[]);
    }

    async loadAllPoolInfo(): Promise<void> {
        const { data } = await this.supabaseService.client
            .from('predictions')
            .select('player_id, predicted_team_id, tokens_bet, status');

        if (!data) return;

        const poolMap = new Map<string, number>();
        for (const row of data) {
            const key = `${row.player_id}::${row.predicted_team_id}`;
            poolMap.set(key, (poolMap.get(key) || 0) + row.tokens_bet);
        }

        const pool: PgPoolInfo[] = [];
        poolMap.forEach((total, key) => {
            const [player_id, predicted_team_id] = key.split('::');
            pool.push({ player_id, predicted_team_id, total_tokens: total });
        });
        this.poolInfoSubject.next(pool);
    }

    // ─── TOKEN ALLOCATION ──────────────────────────────────────────────────

    async updateTokenAllocation(
        userId: string, playerId: string, teamId: string, tokenAmount: number
    ): Promise<void> {
        const { error } = await this.supabaseService.client
            .rpc('update_token_allocation', {
                p_user_id: userId,
                p_player_id: playerId,
                p_team_id: teamId,
                p_token_amount: tokenAmount
            });
        if (error) throw new Error(error.message);
        await Promise.all([
            this.loadUserPredictions(userId),
            this.loadAllPoolInfo(),
            this.refreshProfile(userId)
        ]);
    }

    // ─── REALTIME ──────────────────────────────────────────────────────────

    subscribeToRealtime(userId: string, onUpdate: () => void): void {
        this.unsubscribeRealtime();
        this.realtimeChannel = this.supabaseService.client
            .channel('predictions-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, onUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, onUpdate)
            .subscribe();
    }

    unsubscribeRealtime(): void {
        if (this.realtimeChannel) {
            this.supabaseService.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
    }

    // ─── LEADERBOARD ───────────────────────────────────────────────────────

    async loadLeaderboard(): Promise<PgUserProfile[]> {
        const { data } = await this.supabaseService.client
            .from('users')
            .select('id,username,display_name,token_balance,correct_predictions,total_predictions,accuracy_percentage,tokens_won')
            .order('token_balance', { ascending: false })
            .limit(50);
        return (data as PgUserProfile[]) || [];
    }

    async addTokens(userId: string, amount: number): Promise<PgUserProfile> {
        const { data, error } = await this.supabaseService.client
            .from('users')
            .update({ token_balance: (this.userProfileSubject.getValue()?.token_balance ?? 0) + amount })
            .eq('id', userId)
            .select('id,username,display_name,phone_number,initial_tokens,token_balance,tokens_spent,tokens_won,total_predictions,correct_predictions,accuracy_percentage,created_at')
            .single();
        if (error) throw new Error(error.message);
        const updated = data as PgUserProfile;
        this.userProfileSubject.next(updated);
        return updated;
    }

    /**
     * Called after a player is sold at auction.
     * Triggers process_player_auction() in Supabase which:
     *  - Marks winning/losing predictions
     *  - Adds tokens to winner balances
     *  - Refunds everyone if nobody bet on winning team
     * The prediction leaderboard auto-refreshes via Supabase Realtime.
     */
    async processAuctionResult(
        playerSupabaseId: string,
        teamSupabaseId: string,
        finalPrice: number
    ): Promise<{ totalPredictors: number; winners: number; totalTokensBet: number; tokensWon: number }> {
        const result = { totalPredictors: 0, winners: 0, totalTokensBet: 0, tokensWon: 0 };

        const { error } = await this.supabaseService.client.rpc('process_player_auction', {
            p_player_id: playerSupabaseId,
            p_winning_team_id: teamSupabaseId,
            p_final_price: finalPrice
        });

        if (error) {
            console.error('process_player_auction failed:', error.message);
            return result;
        }

        // Query prediction stats for this player after processing
        try {
            const { data: preds } = await this.supabaseService.client
                .from('predictions')
                .select('status, tokens_bet, tokens_won')
                .eq('player_id', playerSupabaseId);

            if (preds && preds.length > 0) {
                result.totalPredictors = preds.length;
                result.winners = preds.filter((p: any) => p.status === 'won').length;
                result.totalTokensBet = preds.reduce((sum: number, p: any) => sum + (p.tokens_bet || 0), 0);
                result.tokensWon = preds.filter((p: any) => p.status === 'won')
                    .reduce((sum: number, p: any) => sum + (p.tokens_won || 0), 0);
            }
        } catch (e) {
            console.warn('Could not load prediction stats:', e);
        }

        return result;
    }
}
