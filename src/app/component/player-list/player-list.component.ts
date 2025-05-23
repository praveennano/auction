
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Player, PlayerRole } from '../../models/player.model';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined;


@Component({
  selector: 'app-player-list',
  standalone: true,
   imports: [CommonModule, CardModule, TagModule],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.scss'
})
export class PlayerListComponent {
  @Input() title: string = '';
  @Input() players: Player[] = [];
  @Input() headerClass: string = 'bg-primary';
  @Input() priceTagClass: string = '';

  // Helper method to determine role tag color
  getRoleTagSeverity(role: string | PlayerRole): TagSeverity {
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