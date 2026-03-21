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
      basePrice: 620, // Captain gets higher base price
      mvpRanking: 1,
      cups: 0,
      battingStats: { runs: 750, strikeRate: 155.0 },
      bowlingStats: { wickets: 28, economy: 7.8 },
      teamId: 1, // Pre-assigned to team 1
      isSold: true,
      soldPrice: 620
    },
    {
      id: 102,
      name: 'Nageshwaran',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 150,
      mvpRanking: 2,
      cups: 0,
      battingStats: { runs: 680, strikeRate: 148.5 },
      bowlingStats: { wickets: 25, economy: 8.2 },
      teamId: 2, // Pre-assigned to team 2
      isSold: true,
      soldPrice: 150
    },
    {
      id: 103,
      name: 'Sriram',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 100,
      mvpRanking: 3,
      cups: 0,
      battingStats: { runs: 620, strikeRate: 142.0 },
      bowlingStats: { wickets: 22, economy: 8.5 },
      teamId: 3, // Pre-assigned to team 3
      isSold: true,
      soldPrice: 100
    },
    {
      id: 104,
      name: 'S N K',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 410,
      mvpRanking: 4,
      cups: 0,
      battingStats: { runs: 590, strikeRate: 138.0 },
      bowlingStats: { wickets: 20, economy: 8.8 },
      teamId: 4, // Pre-assigned to team 4
      isSold: true,
      soldPrice: 410
    },
    {
      id: 105,
      name: 'Aravind Ganesh A R',
      role: PlayerRole.ALL_ROUNDER,
      basePrice: 150,
      mvpRanking: 5,
      cups: 0,
      battingStats: { runs: 560, strikeRate: 135.0 },
      bowlingStats: { wickets: 18, economy: 9.0 },
      teamId: 5, // Pre-assigned to team 5
      isSold: true,
      soldPrice: 150
    }
  ];

  // Regular players for auction (original player list)
  private initialPlayers: Player[] = [
    {
      id: 1, name: 'Keshav', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 1, cups: 3,
      battingStats: { runs: 32, battingAvg: 8.0, strikeRate: 46.3 },
      bowlingStats: { wickets: 2, economy: 13.34, catches: 8 }
    },
    {
      id: 2, name: 'Loki', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 106, battingAvg: 11.79, strikeRate: 120.5 },
      bowlingStats: { wickets: 10, economy: 9.79, catches: 13 }
    },
    {
      id: 3, name: 'Gopal', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 3,
      battingStats: { runs: 862, battingAvg: 26.12, strikeRate: 139.5 },
      bowlingStats: { wickets: 38, economy: 8.5, catches: 8 }
    },
    {
      id: 4, name: 'Siddhartha', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 3,
      battingStats: { runs: 284, battingAvg: 9.44, strikeRate: 122.9 },
      bowlingStats: { wickets: 26, economy: 9.97, catches: 22 }
    },
    {
      id: 5, name: 'Vetri', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 9, cups: 3,
      battingStats: { runs: 919, battingAvg: 22.98, strikeRate: 155.2 },
      bowlingStats: { wickets: 27, economy: 11.09, catches: 26 }
    },
    {
      id: 6, name: 'Praveen', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 379, battingAvg: 31.61, strikeRate: 162.6 },
      bowlingStats: { wickets: 11, economy: 12.88, catches: 7 }
    },
    {
      id: 7, name: 'Kabeer', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 293, battingAvg: 16.28, strikeRate: 135.7 },
      bowlingStats: { wickets: 1, economy: 11.5, catches: 1 }
    },
    {
      id: 8, name: 'Pradeep', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 3, cups: 3,
      battingStats: { runs: 537, battingAvg: 12.79, strikeRate: 137.4 },
      bowlingStats: { wickets: 29, economy: 11.08, catches: 34 }
    },
    {
      id: 9, name: 'Saravanan', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 5,
      battingStats: { runs: 646, battingAvg: 20.19, strikeRate: 171.4 },
      bowlingStats: { wickets: 35, economy: 8.06, catches: 41 }
    },
    {
      id: 10, name: 'Aravind DG', role: PlayerRole.BOWLER, basePrice: 100, mvpRanking: 0, cups: 3,
      battingStats: { runs: 91, battingAvg: 11.38, strikeRate: 82.7 },
      bowlingStats: { wickets: 15, economy: 12.35, catches: 4 }
    },
    {
      id: 11, name: 'Sarath Kumar', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 6,
      battingStats: { runs: 1326, battingAvg: 27.62, strikeRate: 173.1 },
      bowlingStats: { wickets: 39, economy: 8.65, catches: 51 }
    },
    {
      id: 13, name: 'S S Deepak', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 2,
      battingStats: { runs: 276, battingAvg: 10.22, strikeRate: 123.8 },
      bowlingStats: { wickets: 28, economy: 8.74, catches: 25 }
    },
    {
      id: 15, name: 'Dg', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 245, battingAvg: 8.75, strikeRate: 119.5 },
      bowlingStats: { wickets: 16, economy: 11.4, catches: 9 }
    },
    {
      id: 16, name: 'Arun S', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 5,
      battingStats: { runs: 265, battingAvg: 9.81, strikeRate: 118.9 },
      bowlingStats: { wickets: 33, economy: 9.41, catches: 7 }
    },
    {
      id: 17, name: 'Ravi', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 4,
      battingStats: { runs: 259, battingAvg: 11.77, strikeRate: 117.7 },
      bowlingStats: { wickets: 5, economy: 15.51, catches: 40 }
    },
    {
      id: 18, name: 'Ashok', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 4,
      battingStats: { runs: 825, battingAvg: 25.01, strikeRate: 150.8 },
      bowlingStats: { wickets: 38, economy: 7.42, catches: 15 }
    },
    {
      id: 19, name: 'Saravanan Shanmugam', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 318, battingAvg: 15.14, strikeRate: 152.8 },
      bowlingStats: { wickets: 19, economy: 8.94, catches: 12 }
    },
    {
      id: 20, name: 'Shiva', role: PlayerRole.BOWLER, basePrice: 100, mvpRanking: 10, cups: 4,
      battingStats: { runs: 265, battingAvg: 9.47, strikeRate: 152.3 },
      bowlingStats: { wickets: 30, economy: 10.06, catches: 10 }
    },
    {
      id: 21, name: 'Ajay', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 2,
      battingStats: { runs: 794, battingAvg: 20.89, strikeRate: 161.1 },
      bowlingStats: { wickets: 11, economy: 12.09, catches: 31 }
    },
    {
      id: 22, name: 'Logesh', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 2,
      battingStats: { runs: 153, battingAvg: 10.2, strikeRate: 100.0 },
      bowlingStats: { wickets: 19, economy: 8.65, catches: 4 }
    },
    {
      id: 23, name: 'Sowrish', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 2,
      battingStats: { runs: 671, battingAvg: 19.74, strikeRate: 156.4 },
      bowlingStats: { wickets: 19, economy: 10.83, catches: 10 }
    },
    {
      id: 24, name: 'Umesh', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 1038, battingAvg: 23.06, strikeRate: 144.8 },
      bowlingStats: { wickets: 37, economy: 8.69, catches: 15 }
    },
    {
      id: 25, name: 'Vignesh S', role: PlayerRole.BATSMAN, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 221, battingAvg: 14.75, strikeRate: 153.5 },
      bowlingStats: { wickets: 8, economy: 8.9, catches: 10 }
    },
    {
      id: 26, name: 'Muthu', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 67, battingAvg: 7.44, strikeRate: 84.8 },
      bowlingStats: { wickets: 1, economy: 8.0, catches: 2 }
    },
    {
      id: 27, name: 'Vishnu', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 4,
      battingStats: { runs: 169, battingAvg: 6.77, strikeRate: 100.0 },
      bowlingStats: { wickets: 4, economy: 16.15, catches: 3 }
    },
    {
      id: 28, name: 'Karthikeyan', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 8, cups: 0,
      battingStats: { runs: 654, battingAvg: 15.21, strikeRate: 162.7 },
      bowlingStats: { wickets: 26, economy: 9.52, catches: 10 }
    },
    {
      id: 29, name: 'Akshay', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 303, battingAvg: 10.1, strikeRate: 113.1 },
      bowlingStats: { wickets: 24, economy: 8.98, catches: 10 }
    },
    {
      id: 30, name: 'Arumugam', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 7, cups: 2,
      battingStats: { runs: 288, battingAvg: 8.73, strikeRate: 123.6 },
      bowlingStats: { wickets: 30, economy: 11.21, catches: 23 }
    },
    {
      id: 31, name: 'Guna', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 5, cups: 2,
      battingStats: { runs: 532, battingAvg: 11.57, strikeRate: 149.8 },
      bowlingStats: { wickets: 13, economy: 14.29, catches: 30 }
    },
    {
      id: 32, name: 'Satz', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 2,
      battingStats: { runs: 843, battingAvg: 23.42, strikeRate: 155.3 },
      bowlingStats: { wickets: 14, economy: 11.23, catches: 39 }
    },
    {
      id: 35, name: 'Sharan(Sarath) ', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 878, battingAvg: 38.17, strikeRate: 184.5 },
      bowlingStats: { wickets: 23, economy: 8.29, catches: 29 }
    },
    {
      id: 36, name: 'Ashwin', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    },
    {
      id: 37, name: 'Musab', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 53, battingAvg: 10.6, strikeRate: 176.7 },
      bowlingStats: { wickets: 3, economy: 9.4, catches: 1 }
    },
    {
      id: 38, name: 'Shivam', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 0,
      battingStats: { runs: 0, battingAvg: 0, strikeRate: 0 },
      bowlingStats: { wickets: 0, economy: 0, catches: 0 }
    },
    {
      id: 39, name: 'Sriram MP', role: PlayerRole.ALL_ROUNDER, basePrice: 100, mvpRanking: 0, cups: 1,
      battingStats: { runs: 1123, battingAvg: 21.19, strikeRate: 158.8 },
      bowlingStats: { wickets: 41, economy: 9.47, catches: 37 }
    },
  ];
  // MANUAL POOL CONFIGURATION - Updated to exclude captain IDs
  private createManualPools(): PlayerPool[] {
    return [
      {
        id: 1,
        name: 'Premium Pool',
        playerIds: [25, 5, 30, 2, 3],   // Positions 1–5 (random within pool)
        isActive: true,
        isCompleted: false
      },
      {
        id: 2,
        name: 'Pool A',
        // 21 players → Positions 6–26 (random within pool)
        playerIds: [1, 4, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17, 18, 19, 20, 21, 37, 23, 24, 39, 27],
        isActive: false,
        isCompleted: false
      },
      {
        id: 3,
        name: 'Karthikeyan Slot',
        playerIds: [28],
        isActive: false,
        isCompleted: false
      },
      {
        id: 4,
        name: 'Pool B',
        playerIds: [29, 32, 31, 35, 36, 22, 38, 26],
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
        name: 'Team Sharan M',
        shortName: 'WI',
        color: '#7B0041', // Maroon (West Indies)
        budget: 1880,
        players: [this.teamCaptains[0]]
      },
      {
        id: 2,
        name: 'Team Nageshwaran',
        shortName: 'ENG',
        color: '#00247D', // Blue (England)
        budget: 2350,
        players: [this.teamCaptains[1]]
      },
      {
        id: 3,
        name: 'Team Sriram',
        shortName: 'SA',
        color: '#007A4D', // Green (South Africa)
        budget: 2400,
        players: [this.teamCaptains[2]]
      },
      {
        id: 4,
        name: 'Team S N K',
        shortName: 'AUS',
        color: '#FFCD00', // Yellow (Australia)
        budget: 2090,
        players: [this.teamCaptains[3]]
      },
      {
        id: 5,
        name: 'Team Aravind Ganesh',
        shortName: 'NZ',
        color: '#000000', // Black (New Zealand)
        budget: 2350,
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
              cups: 0,
              battingStats: { runs: 0, strikeRate: 0 },
              bowlingStats: { wickets: 0, economy: 0 }
            }),
            id: stats?.id ?? localId,  // ← preserve original initialPlayers ID so pool membership works
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

        // Since players now keep their original initialPlayers IDs (stats?.id),
        // createManualPools() playerIds match directly — no remapping needed!
        const newPools: PlayerPool[] = this.createManualPools().map(p => ({ ...p }));
        console.log('🏊 Pools built:', newPools.map(p => `${p.name}(${p.playerIds.length})`).join(', '));


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