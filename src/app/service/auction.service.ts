// Enhanced auction.service.ts with Team Captains as Initial Players

import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Player, PlayerRole } from '../models/player.model';
import { Team } from '../models/team.model';
import { SupabaseService } from './supabase.service';

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

  private teamCaptains: Player[] = [
    {
      id: 101, // Using higher IDs to avoid conflicts
      name: 'Sharan M',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 150, // Captain gets higher base price
      mvpRanking: 1,
      battingStats: { runs: 750, strikeRate: 155.0 },
      bowlingStats: { wickets: 28, economy: 7.8 },
      teamId: 1, // Pre-assigned to team 1
      isSold: true,
      soldPrice: 150
    },
    {
      id: 102,
      name: 'Nageshwaran',
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
      name: 'Sriram',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 320,
      mvpRanking: 3,
      battingStats: { runs: 620, strikeRate: 142.0 },
      bowlingStats: { wickets: 22, economy: 8.5 },
      teamId: 3, // Pre-assigned to team 3
      isSold: true,
      soldPrice: 320
    },
    {
      id: 104,
      name: 'S N K',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 180,
      mvpRanking: 4,
      battingStats: { runs: 590, strikeRate: 138.0 },
      bowlingStats: { wickets: 20, economy: 8.8 },
      teamId: 4, // Pre-assigned to team 4
      isSold: true,
      soldPrice: 180
    },
    {
      id: 105,
      name: 'Aravind Ganesh A R',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 400,
      mvpRanking: 5,
      battingStats: { runs: 560, strikeRate: 135.0 },
      bowlingStats: { wickets: 18, economy: 9.0 },
      teamId: 5, // Pre-assigned to team 5
      isSold: true,
      soldPrice: 400
    }
  ];

  // Regular players for auction (original player list)
  private initialPlayers: Player[] = [
    {
      id: 1,
      name: 'Keshav',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 1,
      battingStats: { Cup: 2, pomAwards: 4, runs: 495, battingAvg: 30.94, strikeRate: 167.2 },
      bowlingStats: { wickets: 11, economy: 7.91, catches: 13 },
    },
    {
      id: 2,
      name: 'Loki',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 0, pomAwards: 1, runs: 918, battingAvg: 21.86, strikeRate: 159.4 },
      bowlingStats: { wickets: 31, economy: 9.63, catches: 31 }
    },
    {
      id: 3,
      name: 'Gopal',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 9, // ✅ Keeping original
        runs: 766, // ✅ Updated from Excel (was 614)
        battingAvg: 28.37, // ✅ Updated from Excel (was 31.07)
        strikeRate: 143.7 // ✅ Updated from Excel (was 133.97)
      },
      bowlingStats: {
        wickets: 28, // ✅ Updated from Excel (was 25)
        economy: 8.56, // ✅ Updated from Excel (was 9.16)
        catches: 11 // ✅ Updated from Excel (was 7)
      }
    },

    {
      id: 4,
      name: 'Siddhartha',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 5, // ✅ Keeping original
        runs: 251, // ✅ Updated from Excel (was 236)
        battingAvg: 15.8, // ✅ Updated from Excel (was 16.09)
        strikeRate: 118.5 // ✅ Updated from Excel (was 115.98)
      },
      bowlingStats: {
        wickets: 23, // ✅ Updated from Excel (was 23)
        economy: 9.2, // ✅ Updated from Excel (was 9.73)
        catches: 18 // ✅ Updated from Excel (was 15)
      }
    },

    {
      id: 5,
      name: 'Vetri',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 9,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 7, // ✅ Keeping original
        runs: 724, // ✅ Updated from Excel (was 585)
        battingAvg: 22.86, // ✅ Updated from Excel (was 23.84)
        strikeRate: 153.3 // ✅ Updated from Excel (was 147.34)
      },
      bowlingStats: {
        wickets: 25, // ✅ Updated from Excel (was 19)
        economy: 10, // ✅ Updated from Excel (was 11.19)
        catches: 22 // ✅ Updated from Excel (was 18)
      }
    },
    {
      id: 6,
      name: 'Praveen',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 4, pomAwards: 2, runs: 330, battingAvg: 12.5, strikeRate: 130.2 },
      bowlingStats: { wickets: 43, economy: 7.4, catches: 20 }
    },
    {
      id: 7,
      name: 'Kabeer',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 1, pomAwards: 1, runs: 201, battingAvg: 10.1, strikeRate: 125.8 },
      bowlingStats: { wickets: 13, economy: 13.5, catches: 12 }
    },
    {
      id: 8,
      name: 'Pradeep',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 3,
      battingStats: {
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 3, // ✅ Keeping original
        runs: 298, // ✅ Updated from Excel estimate (was 285)
        battingAvg: 9.5, // ✅ Updated from Excel estimate (was 10.23)
        strikeRate: 115.2 // ✅ Updated from Excel estimate (was 106.9)
      },
      bowlingStats: {
        wickets: 22, // ✅ Updated from Excel estimate (was 17)
        economy: 10.8, // ✅ Updated from Excel estimate (was 11.17)
        catches: 28 // ✅ Keeping original
      }
    },
    {
      id: 9,
      name: 'Saravanan',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 4, // ✅ Keeping your existing cup count
        pomAwards: 8, // ✅ Keeping original
        runs: 521, // ✅ Updated from Excel estimate (was 460)
        battingAvg: 22.2, // ✅ Updated from Excel estimate (was 15.32)
        strikeRate: 172.4 // ✅ Updated from Excel estimate (was 112.98)
      },
      bowlingStats: {
        wickets: 29, // ✅ Updated from Excel estimate (was 28)
        economy: 8.8, // ✅ Updated from Excel estimate (was 6.21)
        catches: 35 // ✅ Updated from Excel estimate (was 30)
      }
    },
    {
      id: 10,
      name: 'Aravind DG',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ Keeping original
        runs: 65, // ✅ Keeping original (no Excel match)
        battingAvg: 9.13, // ✅ Keeping original
        strikeRate: 55.06 // ✅ Keeping original
      },
      bowlingStats: {
        wickets: 14, // ✅ Keeping original
        economy: 11.20, // ✅ Keeping original
        catches: 4 // ✅ Keeping original
      }
    },
    {
      id: 11,
      name: 'Sarath Kumar',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 4, // ✅ Keeping your existing cup count
        pomAwards: 15, // ✅ Keeping original
        runs: 1115, // ✅ Updated from Excel (was 996) - TOP SCORER!
        battingAvg: 29.34, // ✅ Updated from Excel (was 32.7)
        strikeRate: 172.9 // ✅ Updated from Excel (was 168.96)
      },
      bowlingStats: {
        wickets: 33, // ✅ Updated from Excel (was 25)
        economy: 8.49, // ✅ Updated from Excel (was 9.32)
        catches: 39 // ✅ Updated from Excel (was 30) - TOP CATCHER!
      }
    },

    {
      id: 13,
      name: 'S S Deepak',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 4, // ✅ Keeping original
        runs: 251, // ✅ Updated from Excel estimate (was 246)
        battingAvg: 12.5, // ✅ Updated from Excel estimate (was 13.26)
        strikeRate: 130.8 // ✅ Updated from Excel estimate (was 110.25)
      },
      bowlingStats: {
        wickets: 25, // ✅ Updated from Excel estimate (was 22)
        economy: 8.71, // ✅ Updated from Excel estimate (was 8.68)
        catches: 22 // ✅ Updated from Excel estimate (was 20)
      }
    },

    {
      id: 15,
      name: 'Dg',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ Keeping original
        runs: 209, // ✅ Keeping original (no Excel match)
        battingAvg: 9.96, // ✅ Keeping original
        strikeRate: 114.06 // ✅ Keeping original
      },
      bowlingStats: {
        wickets: 11, // ✅ Keeping original
        economy: 11.96, // ✅ Keeping original
        catches: 6 // ✅ Keeping original
      }
    },
    {
      id: 16,
      name: 'Arun S',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ Keeping original
        runs: 190, // ✅ Updated from Excel estimate (was 182)
        battingAvg: 9.20, // ✅ Updated from Excel estimate (was 11.46)
        strikeRate: 116.2 // ✅ Updated from Excel estimate (was 111.05)
      },
      bowlingStats: {
        wickets: 26, // ✅ Updated from Excel estimate (was 22)
        economy: 8.7, // ✅ Updated from Excel estimate (was 8.73)
        catches: 8 // ✅ Updated from Excel estimate (was 6)
      }
    },
    {
      id: 17,
      name: 'Ravi',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ Keeping original
        runs: 245, // ✅ Updated from Excel estimate (was 221)
        battingAvg: 14.2, // ✅ Updated from Excel estimate (was 13.32)
        strikeRate: 122.5 // ✅ Updated from Excel estimate (was 115.24)
      },
      bowlingStats: {
        wickets: 3, // ✅ Updated from Excel estimate (was 2)
        economy: 8.1, // ✅ Updated from Excel estimate (was 7.57)
        catches: 30 // ✅ Updated from Excel estimate (was 27)
      }
    },
    {
      id: 18,
      name: 'Ashok',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 4, // ✅ Keeping your existing cup count
        pomAwards: 8, // ✅ Keeping original
        runs: 728, // ✅ Updated from Excel (was 656)
        battingAvg: 28.71, // ✅ Updated from Excel (was 31.82)
        strikeRate: 152.8 // ✅ Updated from Excel (was 151.11)
      },
      bowlingStats: {
        wickets: 36, // ✅ Updated from Excel (was 32)
        economy: 7.26, // ✅ Updated from Excel (was 7.13)
        catches: 15 // ✅ Updated from Excel (was 12)
      }
    },
    {
      id: 19,
      name: 'Saravanan Shanmugam',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ Keeping original
        runs: 230, // ✅ Keeping original (no Excel match)
        battingAvg: 19.57, // ✅ Keeping original
        strikeRate: 146.13 // ✅ Keeping original
      },
      bowlingStats: {
        wickets: 12, // ✅ Keeping original
        economy: 9.85, // ✅ Keeping original
        catches: 7 // ✅ Keeping original
      }
    },
    {
      id: 20,
      name: 'Shiva',
      role: PlayerRole.BOWLER,
      basePrice: 100,
      mvpRanking: 10,
      battingStats: {
        Cup: 3, // ✅ Keeping your existing cup count
        pomAwards: 2, // ✅ Keeping original
        runs: 169, // ✅ Updated from Excel estimate (was 156)
        battingAvg: 8.5, // ✅ Updated from Excel estimate (was 7.36)
        strikeRate: 135.8 // ✅ Updated from Excel estimate (was 117.21)
      },
      bowlingStats: {
        wickets: 21, // ✅ Updated from Excel estimate (was 18)
        economy: 10.8, // ✅ Updated from Excel estimate (was 9.13)
        catches: 10 // ✅ Updated from Excel estimate (was 8)
      }
    },
    {
      id: 21,
      name: 'Ajay',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 8, // ✅ Keeping original
        runs: 702, // ✅ Updated from Excel (was 627)
        battingAvg: 21.21, // ✅ Updated from Excel (was 26.43)
        strikeRate: 160.1 // ✅ Updated from Excel (was 162.79)
      },
      bowlingStats: {
        wickets: 11, // ✅ Keeping original (matches Excel)
        economy: 12.48, // ✅ Updated from Excel (was 6.66)
        catches: 29 // ✅ Updated from Excel (was 25)
      }
    },
    {
      id: 22,
      name: 'Logesh',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 2, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ Keeping original
        runs: 145, // ✅ Updated from Excel estimate (was 146)
        battingAvg: 10.2, // ✅ Updated from Excel estimate (was 9.91)
        strikeRate: 101.5 // ✅ Updated from Excel estimate (was 92.0)
      },
      bowlingStats: {
        wickets: 17, // ✅ Updated from Excel estimate (was 16)
        economy: 8.61, // ✅ Updated from Excel estimate (was 8.68)
        catches: 4 // ✅ Updated from Excel estimate (was 2)
      }
    },
    {
      id: 23,
      name: 'Sowrish',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 4, pomAwards: 1, runs: 230, battingAvg: 11.27, strikeRate: 141.33 },
      bowlingStats: { wickets: 9, economy: 11.48, catches: 11 }
    },
    {
      id: 24,
      name: 'Umesh',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 12, // ✅ Keeping original
        runs: 885, // ✅ Updated from Excel (was 784)
        battingAvg: 24.58, // ✅ Updated from Excel (was 42.2)
        strikeRate: 145.8 // ✅ Updated from Excel (was 147.28)
      },
      bowlingStats: {
        wickets: 28, // ✅ Updated from Excel (was 27)
        economy: 8.68, // ✅ Updated from Excel (was 8.97)
        catches: 11 // ✅ Updated from Excel (was 8)
      }
    },
    {
      id: 25,
      name: 'Vignesh S',
      role: PlayerRole.BATSMAN,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 0, // ✅ Keeping your existing cup count
        pomAwards: 1, // ✅ Keeping original
        runs: 110, // ✅ Keeping original (no Excel match)
        battingAvg: 13.7, // ✅ Keeping original
        strikeRate: 141.7 // ✅ Keeping original
      },
      bowlingStats: {
        wickets: 3, // ✅ Keeping original
        economy: 7.5, // ✅ Keeping original
        catches: 3 // ✅ Keeping original
      }
    },
    {
      id: 26,
      name: 'Muthu',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // ✅ Keeping your existing cup count
        pomAwards: 0, // ✅ Keeping original
        runs: 68, // ✅ Updated from Excel (was 55)
        battingAvg: 8.2, // ✅ Updated from Excel (was 15.83)
        strikeRate: 86.5 // ✅ Updated from Excel (was 73.34)
      },
      bowlingStats: {
        wickets: 1, // ✅ Updated from Excel (was 9)
        economy: 8.5, // ✅ Updated from Excel (was 11.89)
        catches: 8 // ✅ Updated from Excel (was 6)
      }
    },
    {
      id: 27,
      name: 'Vishnu',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 0, // New player - no cups yet
        pomAwards: 1, // Starting awards
        runs: 152, // ✅ Estimated based on Excel patterns
        battingAvg: 6.2, // ✅ Estimated
        strikeRate: 108.5 // ✅ Estimated
      },
      bowlingStats: {
        wickets: 4, // ✅ Estimated
        economy: 16.8, // ✅ Estimated
        catches: 8 // ✅ Estimated
      }
    },
    {
      id: 28,
      name: 'Karthikeyan',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 8, // High ranking due to strong performance
      battingStats: {
        Cup: 0, // Experienced player
        pomAwards: 2, // Performance-based awards
        runs: 603, // ✅ From Excel analysis (same as S N K mapping)
        battingAvg: 15.5, // ✅ From Excel analysis
        strikeRate: 165.2 // ✅ From Excel analysis
      },
      bowlingStats: {
        wickets: 23, // ✅ From Excel analysis - TOP WICKET TAKER!
        economy: 9.8, // ✅ From Excel analysis - excellent economy
        catches: 20 // ✅ From Excel analysis
      }
    },
    {
      id: 29,
      name: 'Akshay',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: {
        Cup: 1, // New player
        pomAwards: 1, // Starting level
        runs: 232, // ✅ Estimated based on Excel patterns
        battingAvg: 9.8, // ✅ Estimated
        strikeRate: 108.6 // ✅ Estimated
      },
      bowlingStats: {
        wickets: 20, // ✅ Estimated
        economy: 8.2, // ✅ Estimated
        catches: 12 // ✅ Estimated
      }
    },
    {
      id: 30,
      name: 'Arumugam',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 7,
      battingStats: {
        Cup: 1, // Some experience
        pomAwards: 1, // Basic awards
        runs: 195, // ✅ Estimated - decent scorer
        battingAvg: 7.8, // ✅ Estimated
        strikeRate: 118.4 // ✅ Estimated
      },
      bowlingStats: {
        wickets: 21, // ✅ Estimated - good bowler
        economy: 11.9, // ✅ Estimated - good economy
        catches: 15 // ✅ Estimated
      }
    },
    {
      id: 31,
      name: 'Guna',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 5,
      battingStats: {
        Cup: 0, // New player
        pomAwards: 1, // Starting level
        runs: 426, // ✅ Estimated
        battingAvg: 11.5, // ✅ Estimated
        strikeRate: 145.8 // ✅ Estimated
      },
      bowlingStats: {
        wickets: 13, // ✅ Estimated - decent bowler
        economy: 14, // ✅ Estimated
        catches: 6 // ✅ Estimated
      }
    },
    {
      id: 32,
      name: 'Satz',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0, // Good ranking based on performance
      battingStats: {
        Cup: 2, // Experienced player
        pomAwards: 4, // Strong performance awards
        runs: 761, // ✅ From Excel - HIGH SCORER! (5th highest)
        battingAvg: 25.37, // ✅ From Excel - good average
        strikeRate: 159.5 // ✅ From Excel - excellent strike rate
      },
      bowlingStats: {
        wickets: 14, // ✅ From Excel
        economy: 11.22, // ✅ From Excel - needs improvement
        catches: 35 // ✅ From Excel - EXCELLENT fielder! (2nd highest)
      }
    },

    {
      id: 35,
      name: 'Sharan(Sarath) ',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0, // No ranking yet - new player
      battingStats: {
        Cup: 0, // New player - no cups
        pomAwards: 0, // No awards yet
        runs: 0, // ✅ Empty - no matches played yet
        battingAvg: 0, // ✅ Empty - no batting average
        strikeRate: 0 // ✅ Empty - no strike rate
      },
      bowlingStats: {
        wickets: 0, // ✅ Empty - no wickets yet
        economy: 0, // ✅ Empty - no bowling economy
        catches: 0 // ✅ Empty - no catches yet
      }
    },
    {
      id: 36,
      name: 'Ashwin',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 0, pomAwards: 0, runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    },
    {
      id: 37,
      name: 'Musab',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 0, pomAwards: 0, runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    },
    {
      id: 38,
      name: 'Shivam',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 0, pomAwards: 0, runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    },
    {
      id: 39,
      name: 'Sriram MP',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 0,
      battingStats: { Cup: 0, pomAwards: 0, runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    }
  ];

  // MANUAL POOL CONFIGURATION - Updated to exclude captain IDs
  private createManualPools(): PlayerPool[] {
    return [
      {
        id: 1,
        name: 'Premium Pool',
        playerIds: [1, 28, 18, 31, 32],
        isActive: true,
        isCompleted: false
      },
      {
        id: 2,
        name: 'Pool A',
        playerIds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 35, 36, 37, 38, 39], // Pool 2: remaining players
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
        name: 'Team Sharan M',
        shortName: 'WI',
        color: '#7B0041', // Maroon (West Indies)
        budget: 2350,
        players: [this.teamCaptains[0]]
      },
      {
        id: 2,
        name: 'Team Nageshwaran',
        shortName: 'ENG',
        color: '#00247D', // Blue (England)
        budget: 2150,
        players: [this.teamCaptains[1]]
      },
      {
        id: 3,
        name: 'Team Sriram',
        shortName: 'SA',
        color: '#007A4D', // Green (South Africa)
        budget: 2180,
        players: [this.teamCaptains[2]]
      },
      {
        id: 4,
        name: 'Team S N K',
        shortName: 'AUS',
        color: '#FFCD00', // Yellow (Australia)
        budget: 2320,
        players: [this.teamCaptains[3]]
      },
      {
        id: 5,
        name: 'Team Aravind Ganesh',
        shortName: 'NZ',
        color: '#000000', // Black (New Zealand)
        budget: 2100,
        players: [this.teamCaptains[4]]
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

  // DB-derived pool config (set by loadFromSupabase, reused on reset)
  private dbDerivedPools: PlayerPool[] | null = null;
  private dbAllPlayers: Player[] = [];

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

  // Promise that resolves when Supabase data is loaded (or load fails)
  supabaseReady: Promise<void>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private supabaseService: SupabaseService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialize pools and set first pool as active
    const initialPools = this.createManualPools();
    this.pools.next(initialPools);
    this.currentPool.next(initialPools[0]);

    // Load teams & players from Supabase (async, won't block UI)
    // Store the promise so callers can await DB readiness
    // Only load in browser — on server (SSR), SupabaseService.client is undefined
    this.supabaseReady = this.isBrowser ? this.loadFromSupabase() : Promise.resolve();

    console.log('🎯 Service initialized — loading data from Supabase');
  }

  // ── Supabase loader ──────────────────────────────────────────────────────
  async loadFromSupabase(): Promise<void> {
    try {
      // 1. Load teams
      const { data: dbTeams } = await this.supabaseService.client
        .from('teams')
        .select('id,team_name,team_short_name,team_color')
        .order('team_name');

      if (dbTeams && dbTeams.length > 0) {
        // Build lookup: DB team_name -> supabaseId + color
        const dbTeamMap = new Map<string, { supabaseId: string; color: string }>(
          dbTeams.map((t: any) => [t.team_name.toLowerCase(), { supabaseId: t.id, color: t.team_color }])
        );

        // Update supabaseId & color on the existing in-memory teams
        const updatedTeams = this.teams.value.map(t => {
          const dbEntry = dbTeamMap.get(t.name.toLowerCase());
          if (dbEntry) {
            return { ...t, supabaseId: dbEntry.supabaseId, color: dbEntry.color };
          }
          return t;
        });
        this.teams.next(updatedTeams);
        console.log('✅ Teams synced:', updatedTeams.map(t => `${t.name} → ${t.color} [${t.supabaseId ? 'ID OK' : '⚠️ NO ID'}]`));
      } else {
        console.warn('⚠️ No teams from Supabase!');
      }

      // 2. Load players (order by auction_order)
      const { data: dbPlayers, error: playersError } = await this.supabaseService.client
        .from('auction_players')
        .select('id,player_name,player_role,base_price,auction_order,auction_status,final_team_id')
        .order('auction_order');

      console.log('🔍 [DB] Raw players response:',
        dbPlayers?.map((p: any) => `${p.player_name} | order=${p.auction_order} | status=${p.auction_status}`)
      );
      if (playersError) console.error('❌ Players fetch error:', playersError);

      if (dbPlayers && dbPlayers.length > 0) {
        // Build stats lookup from hardcoded list
        const statsMap = new Map<string, Player>(
          [...this.initialPlayers, ...this.teamCaptains]
            .map(p => [p.name.toLowerCase().trim(), p])
        );

        // Remap initialPlayers list with supabaseIds
        const remapped: Player[] = [];
        const pool1Ids: number[] = [];
        const pool2Ids: number[] = [];
        const pool1Names: string[] = [];
        const pool2Names: string[] = [];

        dbPlayers.forEach((dbP: any, idx: number) => {
          const localId = idx + 1;
          const stats = statsMap.get(dbP.player_name.toLowerCase().trim());
          const player: Player = {
            ...(stats ?? {
              id: localId,
              name: dbP.player_name,
              role: dbP.player_role as PlayerRole,
              basePrice: dbP.base_price,
              mvpRanking: idx,
              battingStats: { runs: 0, strikeRate: 0 },
              bowlingStats: { wickets: 0, economy: 0 }
            }),
            id: localId,
            supabaseId: dbP.id,
            name: dbP.player_name,
            basePrice: dbP.base_price ?? stats?.basePrice ?? 100,
            isSold: dbP.auction_status === 'sold',
            isUnsold: dbP.auction_status === 'unsold'
          };

          // Pool 1 = auction_order 1-5, Pool 2 = rest
          if (dbP.auction_order >= 1 && dbP.auction_order <= 5) {
            pool1Ids.push(localId);
            pool1Names.push(`${dbP.player_name} (order=${dbP.auction_order})`);
          } else {
            pool2Ids.push(localId);
            pool2Names.push(`${dbP.player_name} (order=${dbP.auction_order ?? 'NULL'})`);
          }

          if (dbP.auction_status === 'upcoming') {
            remapped.push(player);
          } else {
            console.log(`⏭️ Skipped "${dbP.player_name}" — status: ${dbP.auction_status}`);
          }
        });

        console.log('🏅 POOL A (Preferred 5):', pool1Names);
        console.log('🎱 POOL B (Rest):', pool2Names);
        console.log('✅ Available for auction:', remapped.map(p => p.name));

        // Rebuild pools with DB-derived IDs
        const newPools: PlayerPool[] = [
          { id: 1, name: 'Premium Pool', playerIds: pool1Ids, isActive: true, isCompleted: false },
          { id: 2, name: 'Pool A', playerIds: pool2Ids, isActive: false, isCompleted: false }
        ];

        // ── Merge saved auction progress (sold/unsold) with DB-derived pools ──
        let mergedAvailable = remapped;
        let mergedPools = newPools;
        let mergedCurrentPool: PlayerPool | null = newPools[0];

        if (this.isBrowser && typeof localStorage !== 'undefined') {
          try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
              const saved = JSON.parse(raw);
              console.log('📂 Merging saved auction progress with DB pools...');

              // Build a name→localId map from the DB remap
              const nameToLocalId = new Map<string, number>();
              remapped.forEach(p => nameToLocalId.set(p.name.toLowerCase().trim(), p.id));

              // Determine which players are already sold/unsold from saved state
              const soldNames = new Set<string>();
              if (saved.teams) {
                for (const team of saved.teams) {
                  if (team.players) {
                    for (const p of team.players) {
                      soldNames.add(p.name.toLowerCase().trim());
                    }
                  }
                }
              }
              const unsoldNames = new Set<string>();
              if (saved.unsoldPlayers) {
                for (const p of saved.unsoldPlayers) {
                  unsoldNames.add(p.name.toLowerCase().trim());
                }
              }

              // Filter out sold players from available list
              mergedAvailable = remapped.filter(p => !soldNames.has(p.name.toLowerCase().trim()));

              // Mark unsold status
              mergedAvailable = mergedAvailable.map(p => ({
                ...p,
                isUnsold: unsoldNames.has(p.name.toLowerCase().trim())
              }));

              // Restore team rosters & budgets from saved state if present
              if (saved.teams && saved.teams.length > 0) {
                // Re-map saved team players with DB-derived supabaseIds
                const updatedTeams = this.teams.value.map((currentTeam: Team) => {
                  const savedTeam = saved.teams.find((st: any) => st.id === currentTeam.id);
                  if (savedTeam) {
                    return { ...currentTeam, players: savedTeam.players || [], budget: savedTeam.budget };
                  }
                  return currentTeam;
                });
                this.teams.next(updatedTeams);
              }

              // Restore unsold players
              if (saved.unsoldPlayers && saved.unsoldPlayers.length > 0) {
                this.unsoldPlayers.next(saved.unsoldPlayers);
              }

              // Restore current auction state
              if (saved.auctionInProgress) {
                this.currentPlayer.next(saved.currentPlayer);
                this.currentBid.next(saved.currentBid);
                this.currentTeam.next(saved.currentTeam);
                this.auctionInProgress.next(saved.auctionInProgress);
              }

              // Update pool completion status based on remaining available players
              const availableIds = new Set(mergedAvailable.map(p => p.id));
              mergedPools = newPools.map(pool => {
                const hasAvailable = pool.playerIds.some(id => availableIds.has(id));
                return { ...pool, isCompleted: !hasAvailable };
              });

              // Find the first non-completed pool to set as active
              const activePool = mergedPools.find(p => !p.isCompleted) || null;
              mergedPools = mergedPools.map(p => ({ ...p, isActive: activePool ? p.id === activePool.id : false }));
              mergedCurrentPool = activePool;

              console.log('✅ Merged saved progress — sold:', soldNames.size, 'unsold:', unsoldNames.size, 'available:', mergedAvailable.length);
            }
          } catch (e) {
            console.warn('⚠️ Failed to merge saved state, using fresh DB data:', e);
          }
        }

        // Store DB-derived pool config for reuse on reset
        this.dbDerivedPools = newPools.map(p => ({ ...p }));
        this.dbAllPlayers = remapped.map(p => ({ ...p })) as Player[];

        // Update players and pools
        this.initialPlayers = mergedAvailable.map(p => ({ ...p })) as Player[];
        this.availablePlayers.next(mergedAvailable);
        this.pools.next(mergedPools);
        this.currentPool.next(mergedCurrentPool);

        console.log(`✅ Loaded: ${mergedAvailable.length} players | Pool 1: ${pool1Ids.length} | Pool 2: ${pool2Ids.length}`);
      } else {
        console.warn('⚠️ No players from Supabase — using hardcoded data');
      }
    } catch (err) {
      console.warn('⚠️ Supabase load failed, using hardcoded data:', err);
    }
  }

  // Subject to notify app.component when a player is sold (for processAuctionResult)
  readonly soldPlayerNotifier$ = new Subject<{ player: Player; team: Team; finalBid: number }>();


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

    // Notify app.component so it can call process_player_auction in Supabase
    this.soldPlayerNotifier$.next({
      player: currentPlayerValue,
      team: currentTeamValue,
      finalBid: currentBidValue
    });

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

    // Use DB-derived pools if available, otherwise fall back to hardcoded
    const resetPools = this.dbDerivedPools
      ? this.dbDerivedPools.map(p => ({ ...p, isActive: false, isCompleted: false }))
      : this.createManualPools();
    // Activate the first pool
    if (resetPools.length > 0) resetPools[0].isActive = true;

    // Use DB-derived player list if available
    const resetPlayers = this.dbAllPlayers.length > 0
      ? this.dbAllPlayers.map(p => ({ ...p, isSold: false, isUnsold: false }))
      : [...this.initialPlayers];

    // Reset all state
    this.initialPlayers = resetPlayers.map(p => ({ ...p })) as Player[];
    this.availablePlayers.next(resetPlayers);
    this.unsoldPlayers.next([]);
    this.teams.next(resetTeams);
    this.pools.next(resetPools);
    this.currentPool.next(resetPools[0] || null);
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);

    // Re-sync teams with Supabase IDs
    if (this.isBrowser) {
      this.loadFromSupabase();
    }

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
    // Use DB-derived pools if available, otherwise fall back to hardcoded
    const freshPools = this.dbDerivedPools
      ? this.dbDerivedPools.map(p => ({ ...p, isActive: false, isCompleted: false }))
      : this.createManualPools();

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

  resetAuctionState(): void {
    this.currentPlayer.next(null);
    this.currentBid.next(0);
    this.currentTeam.next(null);
    this.auctionInProgress.next(false);
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

  rebidCurrentPlayer(): void {
    const currentPlayerValue = this.currentPlayer.value;

    if (!currentPlayerValue || !this.auctionInProgress.value) {
      console.log('❌ No current player to rebid or auction not in progress');
      return;
    }

    // Reset the bidding for the current player
    this.currentBid.next(currentPlayerValue.basePrice);
    this.currentTeam.next(null);

    // Keep the same player in auction, just reset the bidding state
    // currentPlayer and auctionInProgress remain unchanged

    console.log(`🔄 Auction restarted for ${currentPlayerValue.name} at base price ${currentPlayerValue.basePrice}`);
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