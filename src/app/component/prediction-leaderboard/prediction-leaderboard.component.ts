import { Component, OnInit, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionGameService, PgUserProfile } from '../../service/prediction-game.service';

@Component({
    selector: 'app-prediction-leaderboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './prediction-leaderboard.component.html',
    styleUrl: './prediction-leaderboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PredictionLeaderboardComponent implements OnInit {
    @Input() currentUserId: string | null = null;

    leaderboard: PgUserProfile[] = [];
    loading = true;
    refreshing = false;
    error = '';
    lastRefreshed: Date | null = null;

    constructor(
        private pgService: PredictionGameService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadData();
    }

    async refresh(): Promise<void> {
        this.refreshing = true;
        this.cdr.markForCheck();
        await this.loadData();
        this.refreshing = false;
        this.cdr.markForCheck();
    }

    private async loadData(): Promise<void> {
        try {
            this.leaderboard = await this.pgService.loadLeaderboard();
            this.lastRefreshed = new Date();
        } catch (err: any) {
            this.error = err.message;
        } finally {
            this.loading = false;
            this.cdr.markForCheck();
        }
    }

    isCurrentUser(user: PgUserProfile): boolean {
        return !!this.currentUserId && user.id === this.currentUserId;
    }

    getRankIcon(index: number): string {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}`;
    }

    getAccuracyColor(accuracy: number): string {
        if (accuracy >= 70) return '#4ade80';
        if (accuracy >= 50) return '#f59e0b';
        return '#f87171';
    }

    getProfitLoss(user: PgUserProfile): number {
        return (user.token_balance ?? 0) - (user.initial_tokens ?? 0);
    }
}
