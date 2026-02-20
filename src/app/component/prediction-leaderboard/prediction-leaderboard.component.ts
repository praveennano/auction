import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionGameService, PgUserProfile } from '../../service/prediction-game.service';

@Component({
    selector: 'app-prediction-leaderboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './prediction-leaderboard.component.html',
    styleUrl: './prediction-leaderboard.component.scss'
})
export class PredictionLeaderboardComponent implements OnInit {
    leaderboard: PgUserProfile[] = [];
    loading = true;
    error = '';

    constructor(private pgService: PredictionGameService) { }

    async ngOnInit(): Promise<void> {
        try {
            this.leaderboard = await this.pgService.loadLeaderboard();
        } catch (err: any) {
            this.error = err.message;
        } finally {
            this.loading = false;
        }
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
