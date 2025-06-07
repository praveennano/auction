// Simplified auction.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuctionService } from '../../service/auction.service';
import { Player, PlayerRole } from '../../models/player.model';
import { Team } from '../../models/team.model';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-auction',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule],
  templateUrl: './auction.component.html',
  styleUrl: './auction.component.scss'
})
export class AuctionComponent {
  @Input() currentPlayer: Player | null = null;
  @Input() auctionInProgress: boolean = false;
  @Input() currentBid: number = 0;
  @Input() currentTeam: Team | null = null;
  @Input() availablePlayers: Player[] = [];
  @Input() unsoldPlayers: Player[] = [];

  constructor(private auctionService: AuctionService) { }

  startAuction(): void {
    this.auctionService.startPlayerAuction();
  }

  sellPlayer(): void {
    this.auctionService.sellPlayer();
  }

  markUnsold(): void {
    this.auctionService.markUnsold();
  }

  startNextRound(): void {
    this.auctionService.startNextRound();
  }

  // Helper method to get color based on player role
  getRoleColor(role: string | PlayerRole): TagSeverity {
    switch (role) {
      case PlayerRole.BATSMAN:
      case 'Batsman':
        return 'info';
      case PlayerRole.BOWLER:
      case 'Bowler':
        return 'success';
      case PlayerRole.ALL_ROUNDER:
      case 'All-Rounder':
        return 'warning';
      case PlayerRole.WICKET_KEEPER:
      case 'Wicket Keeper':
        return 'danger';
      default:
        return 'info';
    }
  }

  // Format large numbers for display (e.g., 1500 becomes "1.5K")
 formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Check if player has bowling stats to display
  hasBowlingStats(): boolean {
    return this.currentPlayer?.bowlingStats !== undefined;
  }

  // Get batting strike rate with proper formatting
  getBattingStrikeRate(): string {
    return this.currentPlayer?.battingStats.strikeRate.toFixed(1) || '0.0';
  }

  // Get bowling economy with proper formatting
  getBowlingEconomy(): string {
    return this.currentPlayer?.bowlingStats?.economy.toFixed(1) || '0.0';
  }

  // Get total runs formatted
  getTotalRuns(): string {
    return this.formatNumber(this.currentPlayer?.battingStats.runs || 0);
  }

  // Get total wickets
  getTotalWickets(): number {
    return this.currentPlayer?.bowlingStats?.wickets || 0;
  }

  // Get MVP ranking
  getMVPRanking(): number {
    return this.currentPlayer?.mvpRanking || 0;
  }

  // Check if player is a pure batsman (no bowling stats)
  isPureBatsman(): boolean {
    return !this.hasBowlingStats() && 
           (this.currentPlayer?.role === PlayerRole.BATSMAN || 
            this.currentPlayer?.role === PlayerRole.WICKET_KEEPER);
  }

  // Check if player is a pure bowler
  isPureBowler(): boolean {
    return this.currentPlayer?.role === PlayerRole.BOWLER;
  }

  // Check if player is an all-rounder
  isAllRounder(): boolean {
    return this.currentPlayer?.role === PlayerRole.ALL_ROUNDER;
  }

  // Get quick player summary for tooltip or additional info
  getPlayerSummary(): string {
    if (!this.currentPlayer) return '';
    
    const player = this.currentPlayer;
    let summary = `${player.role} | MVP #${player.mvpRanking}`;
    
    // Add key stats based on role
    if (this.isPureBatsman()) {
      summary += ` | ${this.getTotalRuns()} runs @ ${this.getBattingStrikeRate()} SR`;
    } else if (this.isPureBowler()) {
      summary += ` | ${this.getTotalWickets()} wickets @ ${this.getBowlingEconomy()} ER`;
    } else if (this.isAllRounder()) {
      summary += ` | ${this.getTotalRuns()} runs, ${this.getTotalWickets()} wickets`;
    }
    
    return summary;
  }
}