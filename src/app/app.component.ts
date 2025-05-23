import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuctionService } from './service/auction.service';
import { Team } from './models/team.model';
import { Player,PlayerRole } from './models/player.model';
import { combineLatest } from 'rxjs';
import { AuctionComponent } from './component/auction/auction.component';
import { AuctionStatsComponent } from './component/auction-stats/auction-stats.component';
import { PlayerListComponent } from './component/player-list/player-list.component';
import { TeamListComponent } from './component/team-list/team-list.component';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule,
    RouterOutlet,
    AuctionComponent,
    AuctionStatsComponent,
    PlayerListComponent,
    TeamListComponent,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
     title = 'Cricket Player Auction';
  teams: Team[] = [];
  availablePlayers: Player[] = [];
  soldPlayers: Player[] = [];
  unsoldPlayers: Player[] = [];
  currentPlayer: Player | null = null;
  auctionInProgress: boolean = false;
  currentBid: number = 0;
  currentTeam: Team | null = null;
  
  constructor(private auctionService: AuctionService) { }
  
  ngOnInit(): void {
    // Subscribe to teams
    this.auctionService.teams$.subscribe(teams => {
      this.teams = teams;
      
      // Calculate sold players by collecting all players across teams
      this.soldPlayers = [];
      teams.forEach(team => {
        this.soldPlayers = [...this.soldPlayers, ...team.players];
      });
    });
    
    // Subscribe to available players
    this.auctionService.availablePlayers$.subscribe(players => {
      this.availablePlayers = players;
    });
    
    // Subscribe to unsold players
    this.auctionService.unsoldPlayers$.subscribe(players => {
      this.unsoldPlayers = players;
    });
    
    // Subscribe to current auction state
    combineLatest([
      this.auctionService.currentPlayer$,
      this.auctionService.currentBid$,
      this.auctionService.currentTeam$,
      this.auctionService.auctionInProgress$
    ]).subscribe(([player, bid, team, inProgress]) => {
      this.currentPlayer = player;
      this.currentBid = bid;
      this.currentTeam = team;
      this.auctionInProgress = inProgress;
    });
  }

  // Start auction using the service method
  startAuction(): void {
    this.auctionService.startPlayerAuction();
  }

  // Sell the current player
  sellPlayer(): void {
    this.auctionService.sellPlayer();
  }

  // Mark the current player as unsold
  markUnsold(): void {
    this.auctionService.markUnsold();
  }

  // Start next round with unsold players
  startNextRound(): void {
    this.auctionService.startNextRound();
  }

  // Place a bid on behalf of a team
  placeBid(teamId: number, amount: number): void {
    this.auctionService.placeBid(teamId, amount);
  }

  // Helper method to get CSS class based on player role
  getRoleClass(role: string | PlayerRole): string {
    switch (role) {
      case PlayerRole.BATSMAN:
      case 'Batsman':
        return 'batsman';
      case PlayerRole.BOWLER:
      case 'Bowler':
        return 'bowler';
      case PlayerRole.ALL_ROUNDER:
      case 'All-Rounder':
        return 'all-rounder';
      case PlayerRole.WICKET_KEEPER:
      case 'Wicket Keeper':
        return 'wicket-keeper';
      default:
        return '';
    }
  }

  // Helper method to get team for a player
  getTeamForPlayer(player: Player): Team | null {
    if (!player.teamId) return null;
    return this.teams.find(team => team.id === player.teamId) || null;
  }

  // Helper method to filter players by role
  filterByRole(role: string): void {
    // Implement your filtering logic here, for example:
    // if (role === 'all') {
    //   this.filteredPlayers = [...this.availablePlayers];
    // } else {
    //   this.filteredPlayers = this.availablePlayers.filter(p => p.role === role);
    // }
  }

  // Helper method to select a player for auction
  selectPlayerForAuction(player: Player): void {
    // You could implement direct player selection here instead of random
    const availablePlayersList = this.availablePlayers.filter(p => p.id !== player.id);
    
    // Set current player and bid
    this.currentPlayer = player;
    this.currentBid = player.basePrice;
    this.currentTeam = null;
    this.auctionInProgress = true;
    this.availablePlayers = availablePlayersList;
  }

  // Computed properties for stats
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