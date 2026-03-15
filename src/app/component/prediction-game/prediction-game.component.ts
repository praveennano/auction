import {
    Component, OnInit, OnDestroy, ChangeDetectorRef,
    ChangeDetectionStrategy, PLATFORM_ID, Inject, Output, EventEmitter
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import {
    FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { PredictionGameService, PgUserProfile, PgTeam, PgPlayer } from '../../service/prediction-game.service';
import { PredictionLeaderboardComponent } from '../prediction-leaderboard/prediction-leaderboard.component';

@Component({
    selector: 'app-prediction-game',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        ToastModule,
        PredictionLeaderboardComponent
    ],
    providers: [MessageService],
    templateUrl: './prediction-game.component.html',
    styleUrls: ['./prediction-game.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PredictionGameComponent implements OnInit, OnDestroy {

    // ── Auth state ──────────────────────────────────────────────────────
    authTab: 'signin' | 'signup' = 'signin';
    signInForm!: FormGroup;
    signUpForm!: FormGroup;
    authLoading = false;
    showSignInPassword = false;
    showSignUpPassword = false;

    isLoggedIn = false;
    userProfile: PgUserProfile | null = null;
    teams: PgTeam[] = [];
    players: PgPlayer[] = [];
    loading = false;
    activeSubTab: 'predictions' | 'leaderboard' = 'predictions';
    hideCompletedPlayers = true;

    // ── Local state ─────────────────────────────────────────────────────
    private localTokens = new Map<string, number>(); // 'playerId_teamId' → tokens
    private loadingStates = new Map<string, boolean>();
    private subscriptions = new Subscription();

    // Admin event emitter
    @Output() adminStatusChange = new EventEmitter<boolean>();
    resetLoading = false;
    showResetConfirm = false;

    constructor(
        public pgService: PredictionGameService,
        private messageService: MessageService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) private platformId: object
    ) { }

    teamCaptains: { [key: string]: string } = {
        'WI': 'Sharan',
        'ENG': 'Nage',
        'SA': 'Sriram',
        'AUS': 'S N K',
        'NZ': 'A G'
    };

    ngOnInit(): void {
        this.signInForm = this.fb.group({
            username: ['', [Validators.required, Validators.minLength(3)]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });

        this.signUpForm = this.fb.group({
            username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            display_name: ['', [Validators.required, Validators.minLength(2)]],
            phone_number: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
        });

        this.subscriptions.add(
            this.pgService.userProfile$.subscribe(p => {
                this.userProfile = p;
                this.cdr.markForCheck();
            })
        );

        this.subscriptions.add(
            this.pgService.teams$.subscribe(t => { this.teams = t; this.cdr.markForCheck(); })
        );

        this.subscriptions.add(
            this.pgService.players$.subscribe(p => { this.players = p; this.cdr.markForCheck(); })
        );

        this.subscriptions.add(
            this.pgService.predictions$.subscribe(preds => {
                this.localTokens.clear();
                for (const pred of preds) {
                    this.localTokens.set(`${pred.player_id}_${pred.predicted_team_id}`, pred.tokens_bet);
                }
                this.cdr.markForCheck();
            })
        );

        // Auto-login: try stored username + re-fetch profile
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem('pg_username');
            if (saved) {
                this.pgService.getProfileByUsername(saved).then(profile => {
                    if (profile) {
                        this.pgService['userProfileSubject'].next(profile);
                        this.isLoggedIn = true;
                        this.userProfile = profile;
                        this.adminStatusChange.emit(profile.role === 'admin');

                        // Automatically give user 50 tokens if they need setup
                        if (profile.needs_token_setup) {
                            this.pgService.setUserTokens(profile.id, 50).then(() => {
                                this.loadGameData(profile.id);
                            });
                        } else {
                            this.loadGameData(profile.id);
                        }
                    }
                    this.cdr.markForCheck();
                });
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.pgService.unsubscribeRealtime();
    }

    // ── Auth Actions ────────────────────────────────────────────────────

    async onSignIn(): Promise<void> {
        if (this.signInForm.invalid) return;
        this.authLoading = true;
        try {
            const { username, password } = this.signInForm.value;
            const profile = await this.pgService.signIn(username, password);
            this.persistSession(profile.username);
            // Automatically initialize their tokens to 50 under the hood
            await this.pgService.setUserTokens(profile.id, 50);

            this.userProfile = profile;
            this.isLoggedIn = true;
            this.adminStatusChange.emit(profile.role === 'admin');

            this.messageService.add({
                severity: 'success',
                summary: `Welcome back, ${profile.display_name}! 🎉`,
                detail: `You have ${profile.token_balance} tokens.`
            });
            await this.loadGameData(profile.id);
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Sign In Failed', detail: err.message });
        } finally {
            this.authLoading = false;
            this.cdr.markForCheck();
        }
    }

    async onSignUp(): Promise<void> {
        if (this.signUpForm.invalid) return;
        this.authLoading = true;
        try {
            const { username, password, display_name, phone_number } = this.signUpForm.value;
            const profile = await this.pgService.signUp(
                username, password, phone_number, display_name, 50
            );
            this.persistSession(profile.username);
            this.isLoggedIn = true;
            this.messageService.add({
                severity: 'success',
                summary: `Account created! Welcome, ${profile.display_name} 🎉`,
                detail: `You start with ${profile.token_balance} tokens.`
            });
            await this.loadGameData(profile.id);
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Sign Up Failed', detail: err.message });
        } finally {
            this.authLoading = false;
            this.cdr.markForCheck();
        }
    }

    onLogout(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('pg_username');
        }
        this.pgService.clearSession();
        this.isLoggedIn = false;
        this.localTokens.clear();
        this.signInForm.reset();
        this.signUpForm.reset();
        this.adminStatusChange.emit(false);
        this.cdr.markForCheck();
    }

    // ── Admin: Reset All Predictions ──────────────────────────────────────
    async resetPredictions(): Promise<void> {
        if (!this.userProfile || !this.pgService.isAdmin) return;
        this.resetLoading = true;
        this.cdr.markForCheck();
        try {
            const result = await this.pgService.resetAllPredictions(this.userProfile.id);
            this.messageService.add({
                severity: 'success',
                summary: '🔄 Predictions Reset',
                detail: `${result.predictions_deleted} predictions cleared. All balances restored.`
            });
            // Reload game data
            await this.loadGameData(this.userProfile.id);
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Reset Failed', detail: err.message });
        } finally {
            this.resetLoading = false;
            this.showResetConfirm = false;

            // Admin auto-gets 50 tokens on reset
            await this.pgService.setUserTokens(this.userProfile.id, 50);
            await this.loadGameData(this.userProfile.id);
            this.cdr.markForCheck();
        }
    }



    private persistSession(username: string): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('pg_username', username);
        }
    }

    // ── Game Loading ────────────────────────────────────────────────────

    private async loadGameData(userId: string): Promise<void> {
        this.loading = true;
        this.cdr.markForCheck();
        try {
            await Promise.all([
                this.pgService.loadTeams(),
                this.pgService.loadPlayers(),
                this.pgService.loadUserPredictions(userId),
                this.pgService.loadAllPoolInfo()
            ]);
            this.pgService.subscribeToRealtime(userId, () => {
                this.pgService.loadUserPredictions(userId).then(() => this.cdr.markForCheck());
                this.pgService.loadAllPoolInfo().then(() => this.cdr.markForCheck());
            });
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Load Error', detail: err.message });
        } finally {
            this.loading = false;
            this.cdr.markForCheck();
        }
    }

    // ── Token Stepper ───────────────────────────────────────────────────

    getTokens(playerId: string, teamId: string): number {
        return this.localTokens.get(`${playerId}_${teamId}`) || 0;
    }

    getTotalForPlayer(playerId: string): number {
        let total = 0;
        this.teams.forEach(t => { total += this.getTokens(playerId, t.id); });
        return total;
    }

    isPlayerMaxed(playerId: string): boolean {
        return this.getTotalForPlayer(playerId) >= 5;
    }

    hasAnyBet(playerId: string): boolean {
        return this.getTotalForPlayer(playerId) > 0;
    }

    canIncrement(playerId: string, teamId: string): boolean {
        return this.getTokens(playerId, teamId) < 5 && this.getTotalForPlayer(playerId) < 5;
    }

    canDecrement(playerId: string, teamId: string): boolean {
        return this.getTokens(playerId, teamId) > 0;
    }

    isLoading(playerId: string, teamId: string): boolean {
        return this.loadingStates.get(`${playerId}_${teamId}`) || false;
    }

    increment(playerId: string, teamId: string): void {
        const current = this.getTokens(playerId, teamId);
        if (current < 5 && this.getTotalForPlayer(playerId) < 5) {
            this.updateAllocation(playerId, teamId, current + 1);
        }
    }

    decrement(playerId: string, teamId: string): void {
        const current = this.getTokens(playerId, teamId);
        if (current > 0) {
            this.updateAllocation(playerId, teamId, current - 1);
        }
    }

    private async updateAllocation(playerId: string, teamId: string, newAmount: number): Promise<void> {
        if (!this.userProfile) return;
        const key = `${playerId}_${teamId}`;
        this.loadingStates.set(key, true);
        const old = this.getTokens(playerId, teamId);

        // Optimistic update
        this.localTokens.set(key, newAmount);
        this.cdr.markForCheck();

        try {
            await this.pgService.updateTokenAllocation(
                this.userProfile.id, playerId, teamId, newAmount
            );
        } catch (err: any) {
            // Rollback
            this.localTokens.set(key, old);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        } finally {
            this.loadingStates.set(key, false);
            this.cdr.markForCheck();
        }
    }

    // ── Pool & Multiplier ───────────────────────────────────────────────

    getPoolTotal(playerId: string): number {
        const pool = this.pgService['poolInfoSubject'].getValue();
        return pool.filter(p => p.player_id === playerId)
            .reduce((s, p) => s + p.total_tokens, 0);
    }

    getBestMultiplier(playerId: string): number {
        if (!this.userProfile) return 0;
        const pool = this.pgService['poolInfoSubject'].getValue();
        const total = this.getPoolTotal(playerId);
        if (total === 0) return 0;

        let best = 0;
        this.teams.forEach(t => {
            const myBet = this.getTokens(playerId, t.id);
            if (myBet > 0) {
                const teamPool = pool.find(p => p.player_id === playerId && p.predicted_team_id === t.id);
                if (teamPool && teamPool.total_tokens > 0) {
                    const mult = parseFloat((total / teamPool.total_tokens).toFixed(1));
                    if (mult > best) best = mult;
                }
            }
        });
        return best;
    }

    getTeamFlag(shortName: string): string {
        const flags: { [key: string]: string } = {
            'WI': 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2230%22%20viewBox%3D%220%200%2040%2030%22%3E%3Crect%20width%3D%2240%22%20height%3D%2230%22%20fill%3D%22%237b0041%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2220%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20fill%3D%22%23facc15%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%3EWI%3C%2Ftext%3E%3C%2Fsvg%3E',
            'ENG': 'https://flagcdn.com/w40/gb-eng.png',
            'SA': 'https://flagcdn.com/w40/za.png',
            'AUS': 'https://flagcdn.com/w40/au.png',
            'NZ': 'https://flagcdn.com/w40/nz.png',
        };
        return flags[shortName] || 'https://flagcdn.com/w40/un.png';
    }

    getStatusBadge(player: PgPlayer): string {
        if (player.auction_status === 'sold') return '✓ SOLD';
        if (player.auction_status === 'unsold') return '✗ UNSOLD';
        return '';
    }

    // ── TrackBy ─────────────────────────────────────────────────────────
    trackByTeamId(_: number, t: PgTeam): string { return t.id; }
    trackByPlayerId(_: number, p: PgPlayer): string { return p.id; }
}
