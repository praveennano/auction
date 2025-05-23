import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Player, PlayerRole } from '../models/player.model';
import { Team } from '../models/team.model';

@Injectable({
  providedIn: 'root'
})
export class AuctionService {

  private initialPlayers: Player[] = [
    { id: 1, name: 'MS Dhoni', role: PlayerRole.WICKET_KEEPER, basePrice: 100 },
    { id: 2, name: 'Virat Kohli', role: PlayerRole.BATSMAN, basePrice: 100 },
    { id: 3, name: 'Rohit Sharma', role: PlayerRole.BATSMAN, basePrice: 100 },
    { id: 4, name: 'Jasprit Bumrah', role: PlayerRole.BOWLER, basePrice: 100 },
    { id: 5, name: 'Ravindra Jadeja', role: PlayerRole.ALL_ROUNDER, basePrice: 100 },
    { id: 6, name: 'KL Rahul', role: PlayerRole.WICKET_KEEPER, basePrice: 100 },
    { id: 7, name: 'Hardik Pandya', role: PlayerRole.ALL_ROUNDER, basePrice: 100 },
    { id: 8, name: 'Rishabh Pant', role: PlayerRole.WICKET_KEEPER, basePrice: 100 }
  ];

  private initialTeams: Team[] = [
    { 
      id: 1, 
      name: 'Chennai Super Kings', 
      shortName: 'CSK', 
      color: '#FFFF00', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 2, 
      name: 'Mumbai Indians', 
      shortName: 'MI', 
      color: '#004BA0', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 3, 
      name: 'Royal Challengers', 
      shortName: 'RCB', 
      color: '#EC1C24', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 4, 
      name: 'Delhi Capitals', 
      shortName: 'DC', 
      color: '#0078BC', 
      budget: 2500, 
      players: [] 
    },
       { 
      id: 5, 
      name: 'Gujarat Titans', 
      shortName: 'GT', 
      color: '#004BA0', 
      budget: 2500, 
      players: [] 
    },
  ];

  // BehaviorSubjects
  private availablePlayers = new BehaviorSubject<Player[]>([...this.initialPlayers]);
  private unsoldPlayers = new BehaviorSubject<Player[]>([]);
  private teams = new BehaviorSubject<Team[]>([...this.initialTeams]);
  private currentPlayer = new BehaviorSubject<Player | null>(null);
  private currentBid = new BehaviorSubject<number>(0);
  private currentTeam = new BehaviorSubject<Team | null>(null);
  private auctionInProgress = new BehaviorSubject<boolean>(false);

  // Observable streams
  availablePlayers$ = this.availablePlayers.asObservable();
  unsoldPlayers$ = this.unsoldPlayers.asObservable();
  teams$ = this.teams.asObservable();
  currentPlayer$ = this.currentPlayer.asObservable();
  currentBid$ = this.currentBid.asObservable();
  currentTeam$ = this.currentTeam.asObservable();
  auctionInProgress$ = this.auctionInProgress.asObservable();

  constructor() { }

  // Start auction for a random player
  startPlayerAuction(): void {
    const availablePlayersList = this.availablePlayers.value;
    
    if (availablePlayersList.length === 0) {
      return;
    }
    
    // Select random player
    const randomIndex = Math.floor(Math.random() * availablePlayersList.length);
    const selectedPlayer = availablePlayersList[randomIndex];
    
    // Remove from available players
    const updatedAvailablePlayers = availablePlayersList.filter(
      player => player.id !== selectedPlayer.id
    );
    
    // Set current player and bid
    this.currentPlayer.next(selectedPlayer);
    this.currentBid.next(selectedPlayer.basePrice);
    this.currentTeam.next(null);
    this.auctionInProgress.next(true);
    this.availablePlayers.next(updatedAvailablePlayers);
  }

  // Place bid on current player
  placeBid(teamId: number, bidAmount: number): void {
    const teamsList = this.teams.value;
    const team = teamsList.find(t => t.id === teamId);
    
    if (!team || team.budget < bidAmount) {
      return;
    }
    
    this.currentBid.next(bidAmount);
    this.currentTeam.next(team);
  }

  // Sell player to current highest bidding team
  sellPlayer(): void {
    const currentPlayerValue = this.currentPlayer.value;
    const currentTeamValue = this.currentTeam.value;
    const currentBidValue = this.currentBid.value;
    
    if (!currentPlayerValue || !currentTeamValue) {
      return;
    }
    
    // Update the player
    const soldPlayer: Player = {
      ...currentPlayerValue,
      soldPrice: currentBidValue,
      teamId: currentTeamValue.id,
      isSold: true,
      isUnsold: false
    };
    
    // Update teams
    const updatedTeams = this.teams.value.map(team => {
      if (team.id === currentTeamValue.id) {
        return {
          ...team,
          budget: team.budget - currentBidValue,
          players: [...team.players, soldPlayer]
        };
      }
      return team;
    });
    
    // Reset current auction
    this.teams.next(updatedTeams);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
  }

  // Mark current player as unsold
  markUnsold(): void {
    const currentPlayerValue = this.currentPlayer.value;
    
    if (!currentPlayerValue) {
      return;
    }
    
    // Update player as unsold
    const unsoldPlayer: Player = {
      ...currentPlayerValue,
      isUnsold: true,
      isSold: false
    };
    
    // Update unsold players list
    const updatedUnsoldPlayers = [...this.unsoldPlayers.value, unsoldPlayer];
    
    // Reset current auction
    this.unsoldPlayers.next(updatedUnsoldPlayers);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
  }

  // Start next round with unsold players
  startNextRound(): void {
    const unsoldPlayersList = this.unsoldPlayers.value;
    
    // Move all unsold players back to available players
    const updatedAvailablePlayers = [
      ...this.availablePlayers.value,
      ...unsoldPlayersList
    ];
    
    this.availablePlayers.next(updatedAvailablePlayers);
    this.unsoldPlayers.next([]);
  }

  // Reset the entire auction
  resetAuction(): void {
    this.availablePlayers.next([...this.initialPlayers]);
    this.unsoldPlayers.next([]);
    this.teams.next([...this.initialTeams]);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
  }

  // Utility methods
  getSoldPlayersCount(): number {
    return this.teams.value.reduce(
      (count, team) => count + team.players.length, 
      0
    );
  }
}