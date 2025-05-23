import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-auction-stats',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './auction-stats.component.html',
  styleUrl: './auction-stats.component.scss'
})
export class AuctionStatsComponent {
 @Input() soldPlayers: Player[] = [];
  @Input() unsoldPlayers: Player[] = [];
  @Input() availablePlayers: Player[] = [];

  get totalPlayers(): number {
    return this.soldPlayers.length + this.unsoldPlayers.length + this.availablePlayers.length;
  }

  get soldPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.soldPlayers.length / this.totalPlayers) * 100);
  }

  get unsoldPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.unsoldPlayers.length / this.totalPlayers) * 100);
  }

  get pendingPercentage(): number {
    if (this.totalPlayers === 0) return 0;
    return Math.round((this.availablePlayers.length / this.totalPlayers) * 100);
  }
}
