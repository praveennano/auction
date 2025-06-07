import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Player, PlayerRole } from '../models/player.model';
import { Team } from '../models/team.model';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuctionState {
  teams: Team[];
  availablePlayers: Player[];
  unsoldPlayers: Player[];
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  auctionInProgress: boolean;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuctionService {
  private readonly STORAGE_KEY = 'cwf_auction_data';
  private isBrowser: boolean;

  private initialPlayers: Player[] = [
  {
    id: 1,
    name: 'Sharan M',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 1,
    battingStats: { runs: 601, strikeRate: 168.8 },
    bowlingStats: { wickets: 24, economy: 7.3 }
  },
    {
    id: 2,
    name: 'Sriram MP',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 3,
    battingStats: { runs: 546, strikeRate: 169.0 },
    bowlingStats: { wickets: 23, economy: 8.9 }
  },
  {
    id: 3,
    name: 'Praveen',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 3,
    battingStats: { runs: 546, strikeRate: 169.0 },
    bowlingStats: { wickets: 23, economy: 8.9 }
  },
  {
    id: 4,
    name: 'Gopal',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 4,
    battingStats: { runs: 438, strikeRate: 126.6 },
    bowlingStats: { wickets: 25, economy: 8.5 }
  },
  {
    id: 5,
    name: 'Siddhartha',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 5,
    battingStats: { runs: 420, strikeRate: 134.2 },
    bowlingStats: { wickets: 20, economy: 10.2 }
  },
    {
    id: 6,
    name: 'Sowrish',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 36,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 7,
    name: 'Vetri',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 7,
    battingStats: { runs: 301, strikeRate: 142.0 },
    bowlingStats: { wickets: 15, economy: 9.7 }
  },
  {
    id: 8,
    name: 'S N K',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 8,
    battingStats: { runs: 259, strikeRate: 122.7 },
    bowlingStats: { wickets: 16, economy: 7.6 }
  },
  {
    id: 9,
    name: 'Nageshwaran',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 9,
    battingStats: { runs: 249, strikeRate: 134.6 },
    bowlingStats: { wickets: 13, economy: 11.4 }
  },
  {
    id: 10,
    name: 'Pradeep',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 10,
    battingStats: { runs: 217, strikeRate: 138.2 },
    bowlingStats: { wickets: 12, economy: 9.6 }
  },
  {
    id: 11,
    name: 'Saravanan',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 11,
    battingStats: { runs: 193, strikeRate: 140.9 },
    bowlingStats: { wickets: 4, economy: 10.1 }
  },
  {
    id: 12,
    name: 'Aravind DG',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 12,
    battingStats: { runs: 159, strikeRate: 95.8 },
    bowlingStats: { wickets: 10, economy: 9.4 }
  },
    {
    id: 13,
    name: 'Sarath',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 35,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 14,
    name: 'Mahesh',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 14,
    battingStats: { runs: 136, strikeRate: 104.6 },
    bowlingStats: { wickets: 19, economy: 9.5 }
  },
  {
    id: 15,
    name: 'S S Deepak',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 15,
    battingStats: { runs: 134, strikeRate: 148.9 },
    bowlingStats: { wickets: 4, economy: 7.3 }
  },
   {
    id: 16,
    name: 'Naveen',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 33,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 17,
    name: 'Dg',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 17,
    battingStats: { runs: 125, strikeRate: 105.0 },
    bowlingStats: { wickets: 14, economy: 7.3 }
  },
  {
    id: 18,
    name: 'Arun S',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 18,
    battingStats: { runs: 111, strikeRate: 104.7 },
    bowlingStats: { wickets: 9, economy: 6.2 }
  },
  {
    id: 19,
    name: 'Ravi',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 19,
    battingStats: { runs: 97, strikeRate: 78.2 },
    bowlingStats: { wickets: 10, economy: 7.1 }
  },
    {
    id: 20,
    name: 'Gopi',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 32,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },

  {
    id: 21,
    name: 'Suresh K',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 21,
    battingStats: { runs: 74, strikeRate: 151.0 },
    bowlingStats: { wickets: 6, economy: 6.8 }
  },

   {
    id: 22,
    name: 'Ashok',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 32,
    battingStats: { runs:0 , strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 23,
    name: 'LOKI',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 23,
    battingStats: { runs: 72, strikeRate: 114.3 },
    bowlingStats: { wickets: 4, economy: 7.9 }
  },
  {
    id: 24,
    name: 'Saravanan Shanmugam',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 24,
    battingStats: { runs: 67, strikeRate: 145.7 },
    bowlingStats: { wickets: 8, economy: 8.2 }
  },
  {
    id: 25,
    name: 'Shiva',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 25,
    battingStats: { runs: 53, strikeRate: 54.6 },
    bowlingStats: { wickets: 12, economy: 8.8 }
  },
  {
    id: 26,
    name: 'Ajay',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 30,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 27,
    name: 'Arun Menon',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 30,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0, economy: 0 }
  },
  {
    id: 28,
    name: 'Logesh',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 28,
    battingStats: { runs: 39, strikeRate: 105.4 },
    bowlingStats: { wickets: 5, economy: 11.3 }
  },
  {
    id: 29,
    name: 'Satz',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 29,
    battingStats: { runs: 37, strikeRate: 105.7 },
    bowlingStats: { wickets: 3, economy: 10.1 }
  },
  {
    id: 30,
    name: 'Aravind Ganesh A R',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 30,
    battingStats: { runs: 34, strikeRate: 72.3 },
    bowlingStats: { wickets: 2, economy: 7.5 }
  },
  {
    id: 31,
    name: 'HRB',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 31,
    battingStats: { runs: 21, strikeRate: 105.0 },
    bowlingStats: { wickets: 2, economy: 18.5 }
  },
  {
    id: 32,
    name: 'Umesh',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 32,
    battingStats: { runs: 18, strikeRate: 72.0 },
    bowlingStats: { wickets: 2, economy: 5.7 }
  },
  {
    id: 33,
    name: 'Madras Tekkers Boy',
    role: PlayerRole.ALL_ROUNDER,
    basePrice: 100,
    mvpRanking: 38,
    battingStats: { runs: 0, strikeRate: 0 },
    bowlingStats: { wickets: 0 , economy: 0 }
  },
  {
    id: 34,
    name: 'Sriram N',
    role: PlayerRole.BOWLER,
    basePrice: 100,
    mvpRanking: 34,
    battingStats: { runs: 16, strikeRate: 42.1 },
    bowlingStats: { wickets: 6, economy: 7.3 }
  },
  {
    id: 35,
    name: 'Vignesh S',
    role: PlayerRole.BATSMAN,
    basePrice: 100,
    mvpRanking: 37,
    battingStats: { runs: 3, strikeRate: 20.0 }
  }
]

  private initialTeams: Team[] = [
    { 
      id: 1, 
      name: 'Vishnu', 
      shortName: 'Vishnu', 
      color: '#FF6B6B', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 2, 
      name: 'Karthikeyan', 
      shortName: 'Karthikeyan', 
      color: '#4ECDC4', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 3, 
      name: 'Akshay', 
      shortName: 'Akshay', 
      color: '#45B7D1', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 4, 
      name: 'Arumugam', 
      shortName: 'Arumugam', 
      color: '#96CEB4', 
      budget: 2500, 
      players: [] 
    },
    { 
      id: 5, 
      name: 'Guna', 
      shortName: 'Guna', 
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

 constructor(@Inject(PLATFORM_ID) private platformId: Object) {
  this.isBrowser = isPlatformBrowser(this.platformId);
  
  // Always initialize with custom players
  console.log('🎯 Service initializing with custom players:', this.initialPlayers.map(p => p.name));
  this.availablePlayers.next([...this.initialPlayers]);
}

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

  // Utility methods
  getSoldPlayersCount(): number {
    return this.teams.value.reduce(
      (count, team) => count + team.players.length, 
      0
    );
  }

  // Storage methods
  saveAuctionState(state: AuctionState): void {
    if (!this.isStorageAvailable()) {
      console.warn('⚠️ Cannot save: localStorage not available');
      return;
    }

    try {
      const stateWithTimestamp = {
        ...state,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateWithTimestamp));
      console.log('✅ Auction state saved successfully');
    } catch (error) {
      console.error('❌ Error saving auction state:', error);
    }
  }

  // Load auction state from localStorage
  loadAuctionState(): AuctionState | null {
    if (!this.isStorageAvailable()) {
      console.log('ℹ️ Cannot load: localStorage not available');
      return null;
    }

    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('✅ Auction state loaded successfully');
        console.log('📊 Loaded state:', {
          teams: parsedState.teams?.length || 0,
          availablePlayers: parsedState.availablePlayers?.length || 0,
          unsoldPlayers: parsedState.unsoldPlayers?.length || 0,
          lastUpdated: parsedState.lastUpdated
        });
        return parsedState;
      }
      console.log('ℹ️ No saved auction state found');
      return null;
    } catch (error) {
      console.error('❌ Error loading auction state:', error);
      return null;
    }
  }

  // Clear auction state from localStorage
 learAuctionState(): void {
  if (!this.isStorageAvailable()) {
    console.warn('⚠️ Cannot clear: localStorage not available');
    return;
  }

  try {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Auction state cleared successfully');
    
    // Immediately set custom players after clearing storage
    this.availablePlayers.next([...this.initialPlayers]);
    console.log('🎯 Custom players set after clearing storage');
  } catch (error) {
    console.error('❌ Error clearing auction state:', error);
  }
}

  // Check if saved state exists
  hasSavedState(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch (error) {
      console.error('❌ Error checking saved state:', error);
      return false;
    }
  }

  // Get last updated timestamp
  getLastUpdated(): string | null {
    const state = this.loadAuctionState();
    return state?.lastUpdated || null;
  }

  // Get summary of saved data
  getSavedStateSummary(): any {
    const state = this.loadAuctionState();
    if (!state) return null;

    const soldPlayers = state.teams.reduce((acc, team) => acc + team.players.length, 0);
    
    return {
      totalTeams: state.teams.length,
      availablePlayers: state.availablePlayers.length,
      soldPlayers: soldPlayers,
      unsoldPlayers: state.unsoldPlayers.length,
      auctionInProgress: state.auctionInProgress,
      lastUpdated: state.lastUpdated
    };
  }

  // Restore state
 restoreState(
  teams: Team[], 
  availablePlayers: Player[], 
  unsoldPlayers: Player[], 
  currentPlayer: Player | null, 
  currentBid: number, 
  currentTeam: Team | null, 
  auctionInProgress: boolean
): void {
  console.log('🔄 Restoring auction state...');
  
  this.teams.next(teams);
  this.availablePlayers.next(availablePlayers);
  this.unsoldPlayers.next(unsoldPlayers);
  this.currentPlayer.next(currentPlayer);
  this.currentBid.next(currentBid);
  this.currentTeam.next(currentTeam);
  this.auctionInProgress.next(auctionInProgress);
  
  // Check if restored players are custom players or old cached players
  if (availablePlayers && availablePlayers.length > 0) {
    const firstPlayerName = availablePlayers[0]?.name;
    if (firstPlayerName && ['MS Dhoni', 'Virat Kohli', 'Rohit Sharma'].includes(firstPlayerName)) {
      console.log('⚠️ Old players detected in saved state, switching to custom players');
      this.availablePlayers.next([...this.initialPlayers]);
    } else {
      console.log('📋 Restored players:', availablePlayers.map(p => p.name));
    }
  } else {
    console.log('⚠️ No players found in saved state, initializing with custom players');
    this.availablePlayers.next([...this.initialPlayers]);
  }
  
  console.log('✅ Auction state restored successfully');
}


  // Get current state for saving
 getCurrentState(): any {
  return {
    teams: this.teams.value,
    availablePlayers: this.availablePlayers.value,
    unsoldPlayers: this.unsoldPlayers.value,
    currentPlayer: this.currentPlayer.value,
    currentBid: this.currentBid.value,
    currentTeam: this.currentTeam.value,
    auctionInProgress: this.auctionInProgress.value
  };
}

//   private initializeWithCustomPlayers(): void {
//   console.log('🎯 Initializing with custom players:', this.initialPlayers.map(p => p.name));
  
//   // Set your custom players
//   this.allPlayersList.next([...this.initialPlayers]);
  
//   // Initialize group system (when you add it later)
//   this.initializePlayerGroups();
// }

  // Enhanced reset method
resetAuction(): void {
  console.log('🔄 Resetting auction with custom players...');
  
  // Reset all teams to initial state
  const resetTeams = this.initialTeams.map(team => ({
    ...team,
    budget: 2500,
    players: []
  }));
  
  // Reset basic state
  this.unsoldPlayers.next([]);
  this.teams.next(resetTeams);
  this.currentPlayer.next(null);
  this.currentBid.next(0);
  this.currentTeam.next(null);
  this.auctionInProgress.next(false);
  
  // IMPORTANT: Set available players to your custom players
  this.availablePlayers.next([...this.initialPlayers]);
  
  console.log('✅ Auction reset completed with custom players:', this.initialPlayers.map(p => p.name));
}


  // Get browser status
  getBrowserStatus(): { isBrowser: boolean; storageAvailable: boolean } {
    return {
      isBrowser: this.isBrowser,
      storageAvailable: this.isStorageAvailable()
    };
  }

  // Get auction statistics
  getAuctionStats(): any {
    const teams = this.teams.value;
    const soldPlayers = teams.reduce((acc, team) => acc + team.players.length, 0);
    
    return {
      totalTeams: teams.length,
      totalPlayers: this.initialPlayers.length,
      soldPlayers: soldPlayers,
      availablePlayers: this.availablePlayers.value.length,
      unsoldPlayers: this.unsoldPlayers.value.length,
      auctionInProgress: this.auctionInProgress.value
    };
  }

  // Check if localStorage is available
  private isStorageAvailable(): boolean {
    if (!this.isBrowser) {
      console.log('🚫 localStorage not available (SSR environment)');
      return false;
    }

    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.error('🚫 localStorage not available:', error);
      return false;
    }
  }
}