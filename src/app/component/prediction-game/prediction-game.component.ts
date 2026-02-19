import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PredictionGameService, PgTeam, PgPlayer, PgUserProfile } from '../../service/prediction-game.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PredictionLeaderboardComponent } from '../prediction-leaderboard/prediction-leaderboard.component';

@Component({
    selector: 'app-prediction-game',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ToastModule,
        PredictionLeaderboardComponent
    ],
    providers: [MessageService],
    templateUrl: './prediction-game.component.html',
    styleUrl: './prediction-game.component.scss'
})
export class PredictionGameComponent implements OnInit, OnDestroy {
    // Auth state
    isLoggedIn = false;
    userProfile: PgUserProfile | null = null;

    // Join form (no auth — just name + phone + tokens)
    joinForm: FormGroup;
    joinLoading = false;
    tokenSliderValue = 50;

    // Data
    teams: PgTeam[] = [];
    players: PgPlayer[] = [];
    loading = true;

    // Active sub-tab
    activeSubTab: 'predictions' | 'leaderboard' = 'predictions';

    // Search & filter
    searchQuery = '';
    roleFilter = 'All';
    roleOptions = ['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

    // Loading states per player-team
    loadingStates: Map<string, boolean> = new Map();

    private subscriptions = new Subscription();

    constructor(
        public pgService: PredictionGameService,
        private messageService: MessageService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.joinForm = this.fb.group({
            display_name: ['', [Validators.required, Validators.minLength(2)]],
            phone_number: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
        });
    }

    ngOnInit(): void {
        this.subscriptions.add(
            this.pgService.userProfile$.subscribe(profile => {
                this.userProfile = profile;
                this.isLoggedIn = !!profile;
                this.cdr.detectChanges();
            })
        );

        // Check if user is already stored in localStorage
        if (isPlatformBrowser(this.platformId)) {
            const savedPhone = localStorage.getItem('pg_phone');
            if (savedPhone) {
                this.loginByPhone(savedPhone);
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.pgService.unsubscribeRealtime();
    }

    // =====================
    // JOIN / LOGIN
    // =====================

    async onJoin(): Promise<void> {
        if (this.joinForm.invalid) return;
        this.joinLoading = true;
        try {
            const { display_name, phone_number } = this.joinForm.value;
            const profile = await this.pgService.joinOrLogin(phone_number, display_name, this.tokenSliderValue);
            if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem('pg_phone', phone_number);
            }
            this.messageService.add({
                severity: 'success',
                summary: `Welcome, ${profile.display_name}! 🎉`,
                detail: `You have ${profile.token_balance} tokens.`
            });
            await this.loadGameData(profile.id);
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        } finally {
            this.joinLoading = false;
        }
    }

    private async loginByPhone(phone: string): Promise<void> {
        try {
            const profile = await this.pgService.getProfileByPhone(phone);
            if (profile) {
                await this.loadGameData(profile.id);
            } else {
                if (isPlatformBrowser(this.platformId)) {
                    localStorage.removeItem('pg_phone');
                }
            }
        } catch {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.removeItem('pg_phone');
            }
        }
    }

    async onLogout(): Promise<void> {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('pg_phone');
        }
        this.pgService.clearSession();
        this.isLoggedIn = false;
        this.userProfile = null;
        this.teams = [];
        this.players = [];
    }

    private async loadGameData(userId: string): Promise<void> {
        this.loading = true;
        try {
            await Promise.all([
                this.pgService.loadTeams(),
                this.pgService.loadPlayers(),
                this.pgService.loadUserProfile(userId),
                this.pgService.loadUserPredictions(userId),
                this.pgService.loadAllPoolInfo()
            ]);

            this.subscriptions.add(
                this.pgService.teams$.subscribe(t => { this.teams = t; this.cdr.detectChanges(); })
            );
            this.subscriptions.add(
                this.pgService.players$.subscribe(p => { this.players = p; this.cdr.detectChanges(); })
            );

            this.pgService.subscribeToRealtime(userId, () => {
                this.pgService.loadUserPredictions(userId);
                this.cdr.detectChanges();
            });
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Load Error', detail: err.message });
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    // =====================
    // TOKEN STEPPER
    // =====================

    getTokens(playerId: string, teamId: string): number {
        return this.pgService.getTokensForPlayerTeam(playerId, teamId);
    }

    getTotalForPlayer(playerId: string): number {
        return this.pgService.getTotalTokensForPlayer(playerId);
    }

    canIncrement(playerId: string, teamId: string): boolean {
        if (!this.userProfile) return false;
        const playerTotal = this.getTotalForPlayer(playerId);
        const currentForTeam = this.getTokens(playerId, teamId);
        return playerTotal < 5 && currentForTeam < 5 && this.userProfile.token_balance > 0;
    }

    canDecrement(playerId: string, teamId: string): boolean {
        return this.getTokens(playerId, teamId) > 0;
    }

    isPlayerMaxed(playerId: string): boolean {
        return this.getTotalForPlayer(playerId) >= 5;
    }

    hasAnyBet(playerId: string): boolean {
        return this.getTotalForPlayer(playerId) > 0;
    }

    isLoading(playerId: string, teamId: string): boolean {
        return this.loadingStates.get(`${playerId}_${teamId}`) || false;
    }

    async increment(playerId: string, teamId: string): Promise<void> {
        if (!this.canIncrement(playerId, teamId)) return;
        await this.updateAllocation(playerId, teamId, this.getTokens(playerId, teamId) + 1);
    }

    async decrement(playerId: string, teamId: string): Promise<void> {
        if (!this.canDecrement(playerId, teamId)) return;
        await this.updateAllocation(playerId, teamId, this.getTokens(playerId, teamId) - 1);
    }

    private async updateAllocation(playerId: string, teamId: string, newAmount: number): Promise<void> {
        const key = `${playerId}_${teamId}`;
        this.loadingStates.set(key, true);
        const oldAmount = this.getTokens(playerId, teamId);
        const diff = newAmount - oldAmount;

        // Optimistic update
        this.pgService.updateLocalPrediction(playerId, teamId, newAmount);
        if (this.userProfile) {
            this.pgService.updateLocalBalance(this.userProfile.token_balance - diff);
        }

        try {
            const result = await this.pgService.updateTokenAllocation(playerId, teamId, newAmount);
            if (result?.tokens_remaining !== undefined) {
                this.pgService.updateLocalBalance(result.tokens_remaining);
            }
            await this.pgService.loadAllPoolInfo();
        } catch (err: any) {
            // Revert
            this.pgService.updateLocalPrediction(playerId, teamId, oldAmount);
            if (this.userProfile) {
                this.pgService.updateLocalBalance(this.userProfile.token_balance + diff);
            }
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        } finally {
            this.loadingStates.set(key, false);
            this.cdr.detectChanges();
        }
    }

    // =====================
    // POOL INFO
    // =====================

    getPoolTotal(playerId: string): number {
        return this.pgService.getPoolTotal(playerId);
    }

    getPayoutMultiplier(playerId: string, teamId: string): number {
        return this.pgService.getPayoutMultiplier(playerId, teamId);
    }

    getBestMultiplier(playerId: string): number {
        let best = 0;
        this.teams.forEach(t => {
            const m = this.getPayoutMultiplier(playerId, t.id);
            if (m > best) best = m;
        });
        return best;
    }

    // =====================
    // FILTER & HELPERS
    // =====================

    get filteredPlayers(): PgPlayer[] {
        return this.players.filter(p => {
            const matchesSearch = !this.searchQuery ||
                p.player_name.toLowerCase().includes(this.searchQuery.toLowerCase());
            const matchesRole = this.roleFilter === 'All' || p.player_role === this.roleFilter;
            return matchesSearch && matchesRole;
        });
    }

    getRoleIcon(role: string): string {
        switch (role) {
            case 'Batsman': return '🏏';
            case 'Bowler': return '🎯';
            case 'All-Rounder': return '⭐';
            case 'Wicket-Keeper': return '🧤';
            default: return '🏏';
        }
    }

    getStatusBadge(player: PgPlayer): string {
        if (player.auction_status === 'sold') return 'SOLD';
        if (player.auction_status === 'unsold') return 'UNSOLD';
        return '';
    }

    trackByPlayerId(_: number, player: PgPlayer): string { return player.id; }
    trackByTeamId(_: number, team: PgTeam): string { return team.id; }
}
