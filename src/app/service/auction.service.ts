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
      basePrice: 160, // Captain gets higher base price
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
      basePrice: 230,
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
      basePrice: 270,
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
      basePrice: 300,
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
      basePrice: 290,
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
      mvpRanking: 6,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 4, // ✅ From Excel
        runs: 360, // ✅ From Excel
        battingAvg: 30.97, // ✅ From Excel
        strikeRate: 154.23 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 10, // ✅ From Excel
        economy: 7.5, // ✅ From Excel
        catches: 9 // ✅ From Excel
      },
    },
     {
      id: 2,
      name: 'Sriram MP',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 56, // ✅ From Excel
        battingAvg: 18.7, // ✅ From Excel
        strikeRate: 121.7 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 2, // ✅ From Excel
        economy: 8.5, // ✅ From Excel
        catches: 3 // ✅ From Excel
      }
    },
      {
      id: 3,
      name: 'Praveen',
      role: PlayerRole.BATSMAN,
      basePrice: 100,
      mvpRanking: 8,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 121, // ✅ From Excel
        battingAvg: 60.5, // ✅ From Excel
        strikeRate: 159.2 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 0, // ✅ From Excel
        economy: 0.0, // ✅ From Excel
        catches: 0 // ✅ From Excel
      }
    },
    {
      id: 4,
      name: 'Gopal',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 9,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 5, // ✅ From Excel
        runs: 614, // ✅ From Excel
        battingAvg: 31.07, // ✅ From Excel
        strikeRate: 133.97 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 25, // ✅ From Excel
        economy: 9.16, // ✅ From Excel
        catches: 7 // ✅ From Excel
      }
    },
  
      {
      id: 5,
      name: 'Siddhartha',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 10,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 5, // ✅ From Excel
        runs: 236, // ✅ From Excel
        battingAvg: 16.09, // ✅ From Excel
        strikeRate: 115.98 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 23, // ✅ From Excel
        economy: 9.73, // ✅ From Excel
        catches: 15 // ✅ From Excel
      }
    },
    {
      id: 6,
      name: 'Sowrish',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 36,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 5, // ✅ From Excel
        runs: 469, // ✅ From Excel
        battingAvg: 25.0, // ✅ From Excel
        strikeRate: 156.52 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 13, // ✅ From Excel
        economy: 11.26, // ✅ From Excel
        catches: 7 // ✅ From Excel
      }
    },
    {
      id: 7,
      name: 'Vetri',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 11,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 3, // ✅ From Excel
        runs: 585, // ✅ From Excel
        battingAvg: 23.84, // ✅ From Excel
        strikeRate: 147.34 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 19, // ✅ From Excel
        economy: 11.19, // ✅ From Excel
        catches: 18 // ✅ From Excel
      }
    },
    {
      id: 8,
      name: 'S N K',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 12,
      battingStats: { 
        Cup: 4, // ✅ Keeping your existing cup count
        pomAwards: 2, // ✅ From Excel
        runs: 302, // ✅ From Excel
        battingAvg: 14.26, // ✅ From Excel
        strikeRate: 130.27 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 40, // ✅ From Excel
        economy: 7.42, // ✅ From Excel
        catches: 18 // ✅ From Excel
      }
    },
    {
      id: 9,
      name: 'Nageshwaran',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 13,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 199, // ✅ From Excel
        battingAvg: 13.32, // ✅ From Excel
        strikeRate: 127.79 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 12, // ✅ From Excel
        economy: 11.43, // ✅ From Excel
        catches: 8 // ✅ From Excel
      }
    },
    {
      id: 10,
      name: 'Pradeep',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 14,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 2, // ✅ From Excel
        runs: 285, // ✅ From Excel
        battingAvg: 10.23, // ✅ From Excel
        strikeRate: 106.9 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 17, // ✅ From Excel
        economy: 11.17, // ✅ From Excel
        catches: 26 // ✅ From Excel
      }
    },
    {
      id: 11,
      name: 'Saravanan',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 15,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 7, // ✅ From Excel
        runs: 460, // ✅ From Excel
        battingAvg: 15.32, // ✅ From Excel
        strikeRate: 112.98 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 28, // ✅ From Excel
        economy: 6.21, // ✅ From Excel
        catches: 30 // ✅ From Excel
      }
    },
    {
      id: 12,
      name: 'Aravind DG',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 16,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 65, // ✅ From Excel
        battingAvg: 8.13, // ✅ From Excel
        strikeRate: 55.06 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 12, // ✅ From Excel
        economy: 12.81, // ✅ From Excel
        catches: 4 // ✅ From Excel
      }
    },
    {
      id: 13,
      name: 'Sarath Kumar',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 35,
      battingStats: { 
        Cup: 4, // ✅ Keeping your existing cup count (was mapped from 'Sarath')
        pomAwards: 15, // ✅ From Excel
        runs: 996, // ✅ From Excel
        battingAvg: 32.7, // ✅ From Excel
        strikeRate: 168.96 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 25, // ✅ From Excel
        economy: 9.32, // ✅ From Excel
        catches: 30 // ✅ From Excel
      }
    },
    {
      id: 14,
      name: 'Mahesh',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 17,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 193, // ✅ From Excel
        battingAvg: 10.67, // ✅ From Excel
        strikeRate: 87.32 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 21, // ✅ From Excel
        economy: 10.58, // ✅ From Excel
        catches: 7 // ✅ From Excel
      }
    },
    {
      id: 15,
      name: 'S S Deepak',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 18,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 4, // ✅ From Excel
        runs: 246, // ✅ From Excel
        battingAvg: 13.26, // ✅ From Excel
        strikeRate: 110.25 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 22, // ✅ From Excel
        economy: 8.68, // ✅ From Excel
        catches: 20 // ✅ From Excel
      }
    },
    {
      id: 16,
      name: 'Naveen',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 33,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 3, // ✅ From Excel
        runs: 134, // ✅ From Excel
        battingAvg: 9.19, // ✅ From Excel
        strikeRate: 83.95 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 23, // ✅ From Excel
        economy: 8.55, // ✅ From Excel
        catches: 13 // ✅ From Excel
      }
    },
    {
      id: 17,
      name: 'Dg',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 19,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 199, // ✅ From Excel
        battingAvg: 9.96, // ✅ From Excel
        strikeRate: 114.06 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 8, // ✅ From Excel
        economy: 10.96, // ✅ From Excel
        catches: 6 // ✅ From Excel
      }
    },
    {
      id: 18,
      name: 'Arun S',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 20,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 182, // ✅ From Excel
        battingAvg: 11.46, // ✅ From Excel
        strikeRate: 111.05 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 22, // ✅ From Excel
        economy: 8.73, // ✅ From Excel
        catches: 6 // ✅ From Excel
      }
    },
    {
      id: 19,
      name: 'Ravi',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 21,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 221, // ✅ From Excel
        battingAvg: 13.32, // ✅ From Excel
        strikeRate: 115.24 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 2, // ✅ From Excel
        economy: 7.57, // ✅ From Excel
        catches: 27 // ✅ From Excel
      }
    },
    // {
    //   id: 20,
    //   name: 'Gopi',
    //   role: PlayerRole.BOWLER,
    //   basePrice: 100,
    //   mvpRanking: 32,
    //   battingStats: { 
    //     Cup: 0, // ✅ Keeping your existing cup count
    //     pomAwards: 0, // ✅ From Excel
    //     runs: 31, // ✅ From Excel
    //     battingAvg: 5.6, // ✅ From Excel
    //     strikeRate: 52.38 // ✅ From Excel
    //   },
    //   bowlingStats: { 
    //     wickets: 3, // ✅ From Excel
    //     economy: 11.34, // ✅ From Excel
    //     catches: 0 // ✅ From Excel
    //   }
    // },
    {
      id: 21,
      name: 'Suresh K',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 22,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 9, // ✅ From Excel
        battingAvg: 4.5, // ✅ From Excel
        strikeRate: 56.25 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 0, // ✅ From Excel
        economy: 7.4, // ✅ From Excel
        catches: 0 // ✅ From Excel
      }
    },
    {
      id: 22,
      name: 'Ashok',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 32,
      battingStats: { 
        Cup: 4, // ✅ Keeping your existing cup count
        pomAwards: 8, // ✅ From Excel
        runs: 656, // ✅ From Excel
        battingAvg: 31.82, // ✅ From Excel
        strikeRate: 151.11 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 32, // ✅ From Excel
        economy: 7.13, // ✅ From Excel
        catches: 12 // ✅ From Excel
      }
    },
    {
      id: 23,
      name: 'LOKI',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 23,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 29, // ✅ From Excel
        battingAvg: 11.25, // ✅ From Excel
        strikeRate: 90.65 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 7, // ✅ From Excel
        economy: 8.45, // ✅ From Excel
        catches: 4 // ✅ From Excel
      }
    },
    {
      id: 24,
      name: 'Saravanan Shanmugam',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 24,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 164, // ✅ From Excel
        battingAvg: 23.57, // ✅ From Excel
        strikeRate: 136.13 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 10, // ✅ From Excel
        economy: 10.85, // ✅ From Excel
        catches: 7 // ✅ From Excel
      }
    },
    {
      id: 25,
      name: 'Shiva',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 25,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 2, // ✅ From Excel
        runs: 156, // ✅ From Excel
        battingAvg: 7.36, // ✅ From Excel
        strikeRate: 117.21 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 18, // ✅ From Excel
        economy: 9.13, // ✅ From Excel
        catches: 8 // ✅ From Excel
      }
    },
    {
      id: 26,
      name: 'Ajay',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 30,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 6, // ✅ From Excel
        runs: 627, // ✅ From Excel
        battingAvg: 26.43, // ✅ From Excel
        strikeRate: 162.79 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 7, // ✅ From Excel
        economy: 6.66, // ✅ From Excel
        catches: 25 // ✅ From Excel
      }
    },
    {
      id: 27,
      name: 'Arun Menon',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 30,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 205, // ✅ From Excel
        battingAvg: 12.82, // ✅ From Excel
        strikeRate: 94.62 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 23, // ✅ From Excel
        economy: 9.87, // ✅ From Excel
        catches: 17 // ✅ From Excel
      }
    },
    {
      id: 28,
      name: 'Logesh',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 26,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 146, // ✅ From Excel
        battingAvg: 9.91, // ✅ From Excel
        strikeRate: 92.0 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 16, // ✅ From Excel
        economy: 8.68, // ✅ From Excel
        catches: 2 // ✅ From Excel
      }
    },
    {
      id: 29,
      name: 'Satz',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 27,
      battingStats: { 
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 4, // ✅ From Excel
        runs: 709, // ✅ From Excel
        battingAvg: 31.46, // ✅ From Excel
        strikeRate: 161.14 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 13, // ✅ From Excel
        economy: 9.42, // ✅ From Excel
        catches: 32 // ✅ From Excel
      }
    },
    {
      id: 30,
      name: 'Aravind Ganesh A R',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 28,
      battingStats: { 
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ From Excel
        runs: 230, // ✅ From Excel
        battingAvg: 10.27, // ✅ From Excel
        strikeRate: 115.33 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 9, // ✅ From Excel
        economy: 7.48, // ✅ From Excel
        catches: 11 // ✅ From Excel
      }
    },
    {
      id: 31,
      name: 'HRB',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 29,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 32, // ✅ From Excel
        battingAvg: 32.0, // ✅ From Excel
        strikeRate: 118.5 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 0, // ✅ From Excel
        economy: 0.0, // ✅ From Excel
        catches: 0 // ✅ From Excel
      }
    },
    {
      id: 32,
      name: 'Umesh',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 30,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 11, // ✅ From Excel
        runs: 784, // ✅ From Excel
        battingAvg: 42.2, // ✅ From Excel
        strikeRate: 147.28 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 27, // ✅ From Excel
        economy: 8.97, // ✅ From Excel
        catches: 8 // ✅ From Excel
      }
    },
    {
      id: 33,
      name: 'Nish',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 38,
      battingStats: { 
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 0, // ✅ From Excel
        battingAvg: 0, // ✅ From Excel
        strikeRate: 0 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 0, // ✅ From Excel
        economy: 0, // ✅ From Excel
        catches: 0 // ✅ From Excel
      }
    },
    {
      id: 34,
      name: 'Sriram N',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 31,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 8, // ✅ From Excel
        battingAvg: 2.67, // ✅ From Excel
        strikeRate: 26.67 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 1, // ✅ From Excel
        economy: 9.67, // ✅ From Excel
        catches: 0 // ✅ From Excel
      }
    },
    {
      id: 35,
      name: 'Vignesh S',
      role: PlayerRole.BATSMAN,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { 
        Cup: 0, // Not in provided list, keeping as 0
        pomAwards: 1,
        runs: 56,
        battingAvg: 18.7,
        strikeRate: 121.7
      },
      bowlingStats: { 
        wickets: 2,
        economy: 8.5,
        catches: 3
      }
    },
     {
      id: 37,
      name: 'Muthu',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 22,
      battingStats: { 
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ From Excel
        runs: 55, // ✅ From Excel
        battingAvg: 15.83, // ✅ From Excel
        strikeRate: 73.34 // ✅ From Excel
      },
      bowlingStats: { 
        wickets: 9, // ✅ From Excel
        economy: 11.89, // ✅ From Excel
        catches: 6 // ✅ From Excel
      }
    }
  ];

  // MANUAL POOL CONFIGURATION - Updated to exclude captain IDs
  private createManualPools(): PlayerPool[] {
    return [
      {
        id: 1,
        name: 'Premium Pool',
        playerIds: [1, 3, 29, 13, 23], // Pool 1: 5 players - Sharan M, Praveen, Saravanan, Sarath, LOKI
        isActive: true,
        isCompleted: false
      },
      {
        id: 2,
        name: 'Pool A',
        playerIds: [4, 8, 22, 35, 10, 32, 24, 6, 7, 18, 2, 11, 5, 9, 14, 15, 17, 29, 25, 28, 16,19, 21, 30, 31, 12, 26, 27, 33, 34,37], // Pool 2: 10 players
        isActive: false,
        isCompleted: false
      }
      // {
      //   id: 3,
      //   name: 'Pool B',
      //   playerIds: [2, 5, 9, 14, 15, 17, 29, 25, 28, 16], // Pool 3: 10 players
      //   isActive: false,
      //   isCompleted: false
      // },
      // {
      //   id: 4,
      //   name: 'Pool C',
      //   playerIds: [19, 21, 30, 31, 12, 26, 27, 33, 34, 20], // Pool 4: 10 players
      //   isActive: false,
      //   isCompleted: false
      // }
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
    this.currentBid.next(selectedPlayer.basePrice );
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
    // console.log('🔍 Current Auction State:');
    // console.log('Available Players:', this.availablePlayers.value.length);
    // console.log('Current Pool:', this.currentPool.value?.name || 'None');
    // console.log('Pool Progress:', this.getPoolProgress());
    // console.log('Pool Summary:', this.getPoolSummary());
    // console.log('👑 Team Captains Status:');
    this.teams.value.forEach(team => {
      const captain = team.players.find(p => this.isPlayerCaptain(p.id));
    });
  }
}