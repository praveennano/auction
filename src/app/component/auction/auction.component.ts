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
}