import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { AuctionService } from '../../service/auction.service';
import { Team } from '../../models/team.model';
import { Player, PlayerRole } from '../../models/player.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule, TagModule],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss'
})
export class TeamListComponent  implements OnInit {
  teams: Team[] = [];
  currentBid: number = 0;
  auctionInProgress: boolean = false;
  
  constructor(private auctionService: AuctionService) { }

  ngOnInit(): void {
    // Subscribe to team updates
    this.auctionService.teams$.subscribe(teams => {
      this.teams = teams;
    });

    // Subscribe to auction state
    this.auctionService.auctionInProgress$.subscribe(inProgress => {
      this.auctionInProgress = inProgress;
    });

    // Subscribe to current bid
    this.auctionService.currentBid$.subscribe(bid => {
      this.currentBid = bid;
    });
  }

  getPlayerCountLabel(count: number): string {
    if (count === 0) {
      return 'No players';
    } else if (count === 1) {
      return '1 player';
    } else {
      return `${count} players`;
    }
  }

  getColorStyle(color: string): object {
    if (!color) {
      return {};
    }
    
    return {
      'border-left': `4px solid ${color}`
    };
  }

  placeBid(teamId: number, amount: number): void {
    this.auctionService.placeBid(teamId, amount);
  }

  trackByPlayerId(index: number, player: any): any {
  return player.id || index;
}


  // Helper method to get color class for role tags
  getRoleTagSeverity(role: PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN:
        return 'info';
      case PlayerRole.BOWLER:
        return 'success';
      case PlayerRole.ALL_ROUNDER:
        return 'warning';
      case PlayerRole.WICKET_KEEPER:
        return 'danger';
      default:
        return 'info';
    }
  }
}