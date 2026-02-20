import {
  Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PredictionGameService, PgTeam, PgPoolInfo } from '../../service/prediction-game.service';
import { Player } from '../../models/player.model';

export interface TeamPrediction {
  team: PgTeam;
  tokens: number;
  percentage: number;
  userCount: number;
}

@Component({
  selector: 'app-auction-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auction-stats.component.html',
  styleUrl: './auction-stats.component.scss'
})
export class AuctionStatsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() currentPlayer: Player | null = null;

  pgTeams: PgTeam[] = [];
  teamPredictions: TeamPrediction[] = [];
  totalTokens = 0;

  private sub = new Subscription();

  constructor(private pgService: PredictionGameService) { }

  ngOnInit(): void {
    // Subscribe to teams list
    this.sub.add(
      this.pgService.teams$.subscribe(teams => {
        this.pgTeams = teams;
        this.rebuild();
      })
    );

    // Subscribe to pool info — recalculate whenever bets change
    this.sub.add(
      this.pgService.poolInfo$.subscribe(() => this.rebuild())
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPlayer']) {
      this.rebuild();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private rebuild(): void {
    if (!this.currentPlayer || this.pgTeams.length === 0) {
      this.teamPredictions = [];
      this.totalTokens = 0;
      return;
    }

    const pool: PgPoolInfo[] = (this.pgService as any)['poolInfoSubject'].getValue();

    // Find matching pool rows for this player using player_name match
    // We need to match the app.component currentPlayer (old Player model)
    // against PgPlayer names from the DB
    const pgPlayers = (this.pgService as any)['playersSubject'].getValue();
    const matchedPgPlayer = pgPlayers.find(
      (p: any) => p.player_name?.toLowerCase().trim() ===
        this.currentPlayer!.name?.toLowerCase().trim()
    );

    const playerId = matchedPgPlayer?.id;

    let grandTotal = 0;
    const rows: TeamPrediction[] = this.pgTeams.map(team => {
      let tokens = 0;
      if (playerId) {
        const poolRow = pool.find(
          r => r.player_id === playerId && r.predicted_team_id === team.id
        );
        tokens = poolRow?.total_tokens ?? 0;
      }
      grandTotal += tokens;
      return { team, tokens, percentage: 0, userCount: 0 };
    });

    this.totalTokens = grandTotal;

    // Calculate percentages
    this.teamPredictions = rows.map(r => ({
      ...r,
      percentage: grandTotal > 0 ? Math.round((r.tokens / grandTotal) * 100) : 0
    }));

    // Sort: most tokens first
    this.teamPredictions.sort((a, b) => b.tokens - a.tokens);
  }

  getMultiplier(tokens: number): string {
    if (this.totalTokens === 0 || tokens === 0) return '—';
    return (this.totalTokens / tokens).toFixed(1) + '×';
  }
}
