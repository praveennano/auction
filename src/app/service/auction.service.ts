// Enhanced auction.service.ts with Team Captains as Initial Players

import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Player, PlayerRole } from '../models/player.model';
import { Team } from '../models/team.model';

export interface PlayerPool {
  id: number;
  name: string;
  playerIds: number[]; // Store player IDs instead of full player objects
  isActive: boolean;
  isCompleted: boolean;
}

export interface AuctionState {
  teams: Team[];
  availablePlayers: Player[];
  unsoldPlayers: Player[];
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  auctionInProgress: boolean;
  currentPool: PlayerPool | null;
  pools: PlayerPool[];
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuctionService {
  private readonly STORAGE_KEY = 'cwf_auction_data';
  private isBrowser: boolean;

  // Team captains as initial players (these will be automatically assigned to teams)
  private teamCaptains: Player[] = [
    {
      id: 101, // Using higher IDs to avoid conflicts
      name: 'Vishnu',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 120, // Captain gets higher base price
      mvpRanking: 1,
      battingStats: { runs: 750, strikeRate: 155.0 },
      bowlingStats: { wickets: 28, economy: 7.8 },
      teamId: 1, // Pre-assigned to team 1
      isSold: true,
      soldPrice: 120
    },
    {
      id: 102,
      name: 'Karthikeyan',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 350,
      mvpRanking: 2,
      battingStats: { runs: 680, strikeRate: 148.5 },
      bowlingStats: { wickets: 25, economy: 8.2 },
      teamId: 2, // Pre-assigned to team 2
      isSold: true,
      soldPrice: 350
    },
    {
      id: 103,
      name: 'Akshay',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 370,
      mvpRanking: 3,
      battingStats: { runs: 620, strikeRate: 142.0 },
      bowlingStats: { wickets: 22, economy: 8.5 },
      teamId: 3, // Pre-assigned to team 3
      isSold: true,
      soldPrice: 370
    },
    {
      id: 104,
      name: 'Arumugam',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 330,
      mvpRanking: 4,
      battingStats: { runs: 590, strikeRate: 138.0 },
      bowlingStats: { wickets: 20, economy: 8.8 },
      teamId: 4, // Pre-assigned to team 4
      isSold: true,
      soldPrice: 330
    },
    {
      id: 105,
      name: 'Guna',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 270,
      mvpRanking: 5,
      battingStats: { runs: 560, strikeRate: 135.0 },
      bowlingStats: { wickets: 18, economy: 9.0 },
      teamId: 5, // Pre-assigned to team 5
      isSold: true,
      soldPrice: 270
    }
  ];

  // Regular players for auction (original player list)
  private initialPlayers: Player[] = [
    {
      id: 1,
      name: 'Sharan M',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 6, // Adjusted ranking since captains take top 5
      battingStats: { runs: 601, strikeRate: 168.8 },
      bowlingStats: { wickets: 24, economy: 7.3 }
    },
    {
      id: 2,
      name: 'Sriram MP',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 7,
      battingStats: { runs: 546, strikeRate: 169.0 },
      bowlingStats: { wickets: 23, economy: 8.9 }
    },
    {
      id: 3,
      name: 'Praveen',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 8,
      battingStats: { runs: 546, strikeRate: 169.0 },
      bowlingStats: { wickets: 23, economy: 8.9 }
    },
    {
      id: 4,
      name: 'Gopal',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 9,
      battingStats: { runs: 438, strikeRate: 126.6 },
      bowlingStats: { wickets: 25, economy: 8.5 }
    },
    {
      id: 5,
      name: 'Siddhartha',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 10,
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
      mvpRanking: 11,
      battingStats: { runs: 301, strikeRate: 142.0 },
      bowlingStats: { wickets: 15, economy: 9.7 }
    },
    {
      id: 8,
      name: 'S N K',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 12,
      battingStats: { runs: 259, strikeRate: 122.7 },
      bowlingStats: { wickets: 16, economy: 7.6 }
    },
    {
      id: 9,
      name: 'Nageshwaran',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 13,
      battingStats: { runs: 249, strikeRate: 134.6 },
      bowlingStats: { wickets: 13, economy: 11.4 }
    },
    {
      id: 10,
      name: 'Pradeep',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 14,
      battingStats: { runs: 217, strikeRate: 138.2 },
      bowlingStats: { wickets: 12, economy: 9.6 }
    },
    {
      id: 11,
      name: 'Saravanan',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 15,
      battingStats: { runs: 193, strikeRate: 140.9 },
      bowlingStats: { wickets: 4, economy: 10.1 }
    },
    {
      id: 12,
      name: 'Aravind DG',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 16,
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
      mvpRanking: 17,
      battingStats: { runs: 136, strikeRate: 104.6 },
      bowlingStats: { wickets: 19, economy: 9.5 }
    },
    {
      id: 15,
      name: 'S S Deepak',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 18,
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
      mvpRanking: 19,
      battingStats: { runs: 125, strikeRate: 105.0 },
      bowlingStats: { wickets: 14, economy: 7.3 }
    },
    {
      id: 18,
      name: 'Arun S',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 20,
      battingStats: { runs: 111, strikeRate: 104.7 },
      bowlingStats: { wickets: 9, economy: 6.2 }
    },
    {
      id: 19,
      name: 'Ravi',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 21,
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
      mvpRanking: 22,
      battingStats: { runs: 74, strikeRate: 151.0 },
      bowlingStats: { wickets: 6, economy: 6.8 }
    },
    {
      id: 22,
      name: 'Ashok',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 32,
      battingStats: { runs: 0, strikeRate: 0 },
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
      mvpRanking: 26,
      battingStats: { runs: 39, strikeRate: 105.4 },
      bowlingStats: { wickets: 5, economy: 11.3 }
    },
    {
      id: 29,
      name: 'Satz',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 27,
      battingStats: { runs: 37, strikeRate: 105.7 },
      bowlingStats: { wickets: 3, economy: 10.1 }
    },
    {
      id: 30,
      name: 'Aravind Ganesh A R',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 28,
      battingStats: { runs: 34, strikeRate: 72.3 },
      bowlingStats: { wickets: 2, economy: 7.5 }
    },
    {
      id: 31,
      name: 'HRB',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 29,
      battingStats: { runs: 21, strikeRate: 105.0 },
      bowlingStats: { wickets: 2, economy: 18.5 }
    },
    {
      id: 32,
      name: 'Umesh',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 30,
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
      bowlingStats: { wickets: 0, economy: 0 }
    },
    {
      id: 34,
      name: 'Sriram N',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 31,
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
  ];

  // MANUAL POOL CONFIGURATION - Updated to exclude captain IDs
  private createManualPools(): PlayerPool[] {
    return [
      {
        id: 1,
        name: 'Premium Pool',
        playerIds: [1, 3, 11, 13, 23], // Pool 1: 5 players - Sharan M, Praveen, Saravanan, Sarath, LOKI
        isActive: true,
        isCompleted: false
      },
      {
        id: 2,
        name: 'Pool A',
        playerIds: [4, 8, 22, 35, 10, 32, 24, 6, 7, 18], // Pool 2: 10 players
        isActive: false,
        isCompleted: false
      },
      {
        id: 3,
        name: 'Pool B',
        playerIds: [2, 5, 9, 14, 15, 17, 29, 25, 28, 16], // Pool 3: 10 players
        isActive: false,
        isCompleted: false
      },
      {
        id: 4,
        name: 'Pool C',
        playerIds: [19, 21, 30, 31, 12, 26, 27, 33, 34, 20], // Pool 4: 10 players
        isActive: false,
        isCompleted: false
      }
    ];
  }

  // Teams with captains already assigned and budget adjusted
  private createInitialTeams(): Team[] {
    return [
      { 
        id: 1, 
        name: 'Vishnu', 
        shortName: 'Vishnu', 
        color: '#FF6B6B', 
        budget: 2380, // Reduced budget since captain costs 200
        players: [this.teamCaptains[0]] // Vishnu as captain
      },
      { 
        id: 2, 
        name: 'Karthikeyan', 
        shortName: 'Karthikeyan', 
        color: '#4ECDC4', 
        budget: 2150, 
        players: [this.teamCaptains[1]] // Karthikeyan as captain
      },
      { 
        id: 3, 
        name: 'Akshay', 
        shortName: 'Akshay', 
        color: '#45B7D1', 
        budget: 2130, 
        players: [this.teamCaptains[2]] // Akshay as captain
      },
      { 
        id: 4, 
        name: 'Arumugam', 
        shortName: 'Arumugam', 
        color: '#96CEB4', 
        budget: 2170, 
        players: [this.teamCaptains[3]] // Arumugam as captain
      },
      { 
        id: 5, 
        name: 'Guna', 
        shortName: 'Guna', 
        color: '#004BA0', 
        budget: 2230, 
        players: [this.teamCaptains[4]] // Guna as captain
      },
    ];
  }

  // BehaviorSubjects
  private availablePlayers = new BehaviorSubject<Player[]>([...this.initialPlayers]);
  private unsoldPlayers = new BehaviorSubject<Player[]>([]);
  private teams = new BehaviorSubject<Team[]>(this.createInitialTeams());
  private currentPlayer = new BehaviorSubject<Player | null>(null);
  private currentBid = new BehaviorSubject<number>(0);
  private currentTeam = new BehaviorSubject<Team | null>(null);
  private auctionInProgress = new BehaviorSubject<boolean>(false);
  
  // Pool-related subjects
  private pools = new BehaviorSubject<PlayerPool[]>(this.createManualPools());
  private currentPool = new BehaviorSubject<PlayerPool | null>(null);

  // Observable streams
  availablePlayers$ = this.availablePlayers.asObservable();
  unsoldPlayers$ = this.unsoldPlayers.asObservable();
  teams$ = this.teams.asObservable();
  currentPlayer$ = this.currentPlayer.asObservable();
  currentBid$ = this.currentBid.asObservable();
  currentTeam$ = this.currentTeam.asObservable();
  auctionInProgress$ = this.auctionInProgress.asObservable();
  pools$ = this.pools.asObservable();
  currentPool$ = this.currentPool.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize pools and set first pool as active
    const initialPools = this.createManualPools();
    this.pools.next(initialPools);
    this.currentPool.next(initialPools[0]);
    
    console.log('🎯 Service initialized with team captains and manual pool system');
    console.log('👑 Team captains assigned to their teams');
    console.log('📊 Pool structure:', this.getPoolSummary());
  }

  // ENHANCED AUCTION METHODS

  startPlayerAuction(): void {
    const currentPoolValue = this.currentPool.value;
    const availablePlayersValue = this.availablePlayers.value;
    
    if (!currentPoolValue) {
      console.log('❌ No active pool available');
      return;
    }
    
    // Get available players from current pool
    const currentPoolAvailablePlayers = availablePlayersValue.filter(player => 
      currentPoolValue.playerIds.includes(player.id)
    );
    
    if (currentPoolAvailablePlayers.length === 0) {
      console.log(`✅ Pool ${currentPoolValue.name} completed, moving to next pool`);
      this.moveToNextPool();
      return;
    }
    
    // Select random player from current pool
    const randomIndex = Math.floor(Math.random() * currentPoolAvailablePlayers.length);
    const selectedPlayer = currentPoolAvailablePlayers[randomIndex];
    
    // Set current player and bid
    this.currentPlayer.next(selectedPlayer);
    this.currentBid.next(selectedPlayer.basePrice);
    this.currentTeam.next(null);
    this.auctionInProgress.next(true);
    
    console.log(`🎲 Selected player: ${selectedPlayer.name} from ${currentPoolValue.name}`);
  }

  private moveToNextPool(): void {
    const currentPools = this.pools.value;
    const currentPoolValue = this.currentPool.value;
    
    if (!currentPoolValue) return;
    
    // Mark current pool as completed
    const updatedPools = currentPools.map(pool => {
      if (pool.id === currentPoolValue.id) {
        return { ...pool, isActive: false, isCompleted: true };
      }
      return pool;
    });
    
    // Find next pool
    const nextPool = updatedPools.find(pool => 
      pool.id === currentPoolValue.id + 1 && !pool.isCompleted
    );
    
    if (nextPool) {
      // Activate next pool
      const finalPools = updatedPools.map(pool => {
        if (pool.id === nextPool.id) {
          return { ...pool, isActive: true };
        }
        return pool;
      });
      
      this.pools.next(finalPools);
      this.currentPool.next({ ...nextPool, isActive: true });
      
      console.log(`➡️ Moved to ${nextPool.name}`);
    } else {
      // All pools completed
      this.currentPool.next(null);
      console.log('🏁 All pools completed!');
    }
  }

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
    
    // Remove from available players
    const updatedAvailablePlayers = this.availablePlayers.value.filter(
      player => player.id !== currentPlayerValue.id
    );
    
    // Reset current auction
    this.teams.next(updatedTeams);
    this.availablePlayers.next(updatedAvailablePlayers);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
    
    console.log(`💰 Player ${currentPlayerValue.name} sold to ${currentTeamValue.shortName} for ₹${currentBidValue}`);
  }

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
    
    // Remove from available players
    const updatedAvailablePlayers = this.availablePlayers.value.filter(
      player => player.id !== currentPlayerValue.id
    );
    
    // Reset current auction
    this.unsoldPlayers.next(updatedUnsoldPlayers);
    this.availablePlayers.next(updatedAvailablePlayers);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
    
    console.log(`❌ Player ${currentPlayerValue.name} marked as unsold`);
  }

  // UTILITY METHODS FOR POOL MANAGEMENT

  getPlayerPool(player: Player): PlayerPool | null {
    const pools = this.pools.value;
    return pools.find(pool => pool.playerIds.includes(player.id)) || null;
  }

  isPlayerInCurrentPool(player: Player): boolean {
    const currentPoolValue = this.currentPool.value;
    if (!currentPoolValue) return false;
    return currentPoolValue.playerIds.includes(player.id);
  }

  getCurrentPoolInfo(): { poolName: string; remainingPlayers: number; totalPlayers: number } | null {
    const currentPoolValue = this.currentPool.value;
    const availablePlayersValue = this.availablePlayers.value;
    
    if (!currentPoolValue) return null;
    
    const remainingPlayers = availablePlayersValue.filter(player => 
      currentPoolValue.playerIds.includes(player.id)
    ).length;
    
    return {
      poolName: currentPoolValue.name,
      remainingPlayers: remainingPlayers,
      totalPlayers: currentPoolValue.playerIds.length
    };
  }

  getPoolProgress(): { completed: number; total: number; current: string | null } {
    const currentPools = this.pools.value;
    const completedPools = currentPools.filter(pool => pool.isCompleted).length;
    const currentPoolValue = this.currentPool.value;
    
    return {
      completed: completedPools,
      total: currentPools.length,
      current: currentPoolValue?.name || null
    };
  }

  getPoolSummary(): any {
    const pools = this.pools.value;
    return pools.map(pool => {
      const players = this.initialPlayers.filter(p => pool.playerIds.includes(p.id));
      return {
        id: pool.id,
        name: pool.name,
        playerCount: pool.playerIds.length,
        players: players.map(p => p.name),
        isActive: pool.isActive,
        isCompleted: pool.isCompleted
      };
    });
  }

  // METHOD TO UPDATE POOL CONFIGURATION
  updatePoolConfiguration(pools: { poolId: number; playerIds: number[] }[]): void {
    const currentPools = this.pools.value;
    
    const updatedPools = currentPools.map(pool => {
      const poolUpdate = pools.find(p => p.poolId === pool.id);
      if (poolUpdate) {
        return { ...pool, playerIds: poolUpdate.playerIds };
      }
      return pool;
    });
    
    this.pools.next(updatedPools);
    console.log('🔄 Pool configuration updated');
  }

  // RESET AND RESTORE METHODS

  resetAuction(): void {
    console.log('🔄 Resetting auction with team captains and manual pool system...');
    
    // Reset all teams with captains
    const resetTeams = this.createInitialTeams();
    
    // Reset pools
    const resetPools = this.createManualPools();
    
    // Reset all state
    this.availablePlayers.next([...this.initialPlayers]);
    this.unsoldPlayers.next([]);
    this.teams.next(resetTeams);
    this.pools.next(resetPools);
    this.currentPool.next(resetPools[0]);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
    
    console.log('✅ Auction reset completed with team captains and manual pool system');
    console.log('👑 All team captains assigned to their respective teams');
    console.log('📊 Pool summary:', this.getPoolSummary());
  }

  restoreState(
    teams: Team[], 
    availablePlayers: Player[], 
    unsoldPlayers: Player[], 
    currentPlayer: Player | null, 
    currentBid: number, 
    currentTeam: Team | null, 
    auctionInProgress: boolean,
    pools?: PlayerPool[],
    currentPool?: PlayerPool | null
  ): void {
    console.log('🔄 Restoring auction state with captains and manual pools...');
    
    this.teams.next(teams);
    this.availablePlayers.next(availablePlayers);
    this.unsoldPlayers.next(unsoldPlayers);
    this.currentPlayer.next(currentPlayer);
    this.currentBid.next(currentBid);
    this.currentTeam.next(currentTeam);
    this.auctionInProgress.next(auctionInProgress);
    
    // Restore pools if available, otherwise create fresh pools
    if (pools && currentPool !== undefined) {
      this.pools.next(pools);
      this.currentPool.next(currentPool);
    } else {
      // Fallback: reconstruct pools from current state
      this.reconstructPoolsFromState(availablePlayers);
    }
    
    console.log('✅ Auction state with captains and manual pools restored successfully');
  }

  private reconstructPoolsFromState(availablePlayers: Player[]): void {
    const freshPools = this.createManualPools();
    
    // Find which pool should be active based on remaining players
    let activePool = freshPools[0];
    for (const pool of freshPools) {
      const hasPlayersInPool = pool.playerIds.some(playerId => 
        availablePlayers.some(availablePlayer => availablePlayer.id === playerId)
      );
      
      if (hasPlayersInPool) {
        activePool = pool;
        break;
      }
    }
    
    // Update pool states
    const updatedPools = freshPools.map(pool => {
      const remainingPlayersInPool = pool.playerIds.filter(playerId => 
        availablePlayers.some(availablePlayer => availablePlayer.id === playerId)
      );
      
      return {
        ...pool,
        isActive: pool.id === activePool.id,
        isCompleted: remainingPlayersInPool.length === 0 && pool.id < activePool.id
      };
    });
    
    this.pools.next(updatedPools);
    this.currentPool.next(activePool);
  }

  // OTHER EXISTING METHODS (keeping them the same)
  placeBid(teamId: number, bidAmount: number): void {
    const teamsList = this.teams.value;
    const team = teamsList.find(t => t.id === teamId);
    
    if (!team || team.budget < bidAmount) {
      return;
    }
    
    this.currentBid.next(bidAmount);
    this.currentTeam.next(team);
  }

  startNextRound(): void {
    const unsoldPlayersList = this.unsoldPlayers.value;
    
    // Move all unsold players back to available players
    const updatedAvailablePlayers = [
      ...this.availablePlayers.value,
      ...unsoldPlayersList
    ];
    
    this.availablePlayers.next(updatedAvailablePlayers);
    this.unsoldPlayers.next([]);
    
    // Reconstruct pools with unsold players
    this.reconstructPoolsFromState(updatedAvailablePlayers);
  }

  // STORAGE METHODS
  saveAuctionState(state: AuctionState): void {
    if (!this.isStorageAvailable()) {
      console.warn('⚠️ Cannot save: localStorage not available');
      return;
    }

    try {
      const enhancedState = {
        ...state,
        pools: this.pools.value,
        currentPool: this.currentPool.value,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(enhancedState));
      console.log('✅ Auction state with captains and manual pools saved successfully');
    } catch (error) {
      console.error('❌ Error saving auction state:', error);
    }
  }

  loadAuctionState(): AuctionState | null {
    if (!this.isStorageAvailable()) {
      console.log('ℹ️ Cannot load: localStorage not available');
      return null;
    }

    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('✅ Auction state with captains and manual pools loaded successfully');
        return parsedState;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading auction state:', error);
      return null;
    }
  }

  clearAuctionState(): void {
    if (!this.isStorageAvailable()) {
      console.warn('⚠️ Cannot clear: localStorage not available');
      return;
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Auction state cleared successfully');
      
      // Reset to initial state with captains and manual pools
      this.resetAuction();
    } catch (error) {
      console.error('❌ Error clearing auction state:', error);
    }
  }

  getCurrentState(): any {
    return {
      teams: this.teams.value,
      availablePlayers: this.availablePlayers.value,
      unsoldPlayers: this.unsoldPlayers.value,
      currentPlayer: this.currentPlayer.value,
      currentBid: this.currentBid.value,
      currentTeam: this.currentTeam.value,
      auctionInProgress: this.auctionInProgress.value,
      pools: this.pools.value,
      currentPool: this.currentPool.value
    };
  }

  // UTILITY METHODS
  getSoldPlayersCount(): number {
    return this.teams.value.reduce(
      (count, team) => count + team.players.length, 
      0
    );
  }

  getBrowserStatus(): { isBrowser: boolean; storageAvailable: boolean } {
    return {
      isBrowser: this.isBrowser,
      storageAvailable: this.isStorageAvailable()
    };
  }

  getAuctionStats(): any {
    const teams = this.teams.value;
    const soldPlayers = teams.reduce((acc, team) => acc + team.players.length, 0);
    const poolProgress = this.getPoolProgress();
    const currentPoolInfo = this.getCurrentPoolInfo();
    
    return {
      totalTeams: teams.length,
      totalPlayers: this.initialPlayers.length,
      soldPlayers: soldPlayers,
      availablePlayers: this.availablePlayers.value.length,
      unsoldPlayers: this.unsoldPlayers.value.length,
      auctionInProgress: this.auctionInProgress.value,
      poolProgress: poolProgress,
      currentPool: currentPoolInfo,
      poolSummary: this.getPoolSummary(),
      captainsAssigned: true
    };
  }

  private isStorageAvailable(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  // HELPER METHOD TO GET PLAYER BY ID
  getPlayerById(id: number): Player | undefined {
    // Check both regular players and captains
    const allPlayers = [...this.initialPlayers, ...this.teamCaptains];
    return allPlayers.find(player => player.id === id);
  }

  // METHOD TO GET PLAYERS BY POOL
  getPlayersByPool(poolId: number): Player[] {
    const pool = this.pools.value.find(p => p.id === poolId);
    if (!pool) return [];
    
    return pool.playerIds
      .map(id => this.getPlayerById(id))
      .filter(player => player !== undefined) as Player[];
  }

  // METHOD TO GET ALL CAPTAINS
  getTeamCaptains(): Player[] {
    return [...this.teamCaptains];
  }

  // METHOD TO CHECK IF PLAYER IS CAPTAIN
  isPlayerCaptain(playerId: number): boolean {
    return this.teamCaptains.some(captain => captain.id === playerId);
  }

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
      lastUpdated: state.lastUpdated,
      hasCaptains: true
    };
  }

  // DEBUGGING METHODS
  logCurrentState(): void {
    console.log('🔍 Current Auction State:');
    console.log('Available Players:', this.availablePlayers.value.length);
    console.log('Current Pool:', this.currentPool.value?.name || 'None');
    console.log('Pool Progress:', this.getPoolProgress());
    console.log('Pool Summary:', this.getPoolSummary());
    console.log('👑 Team Captains Status:');
    this.teams.value.forEach(team => {
      const captain = team.players.find(p => this.isPlayerCaptain(p.id));
      console.log(`  ${team.shortName}: ${captain?.name || 'No Captain'} (Budget: ₹${team.budget})`);
    });
  }
}