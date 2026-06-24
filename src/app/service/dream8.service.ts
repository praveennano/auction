import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Dream8Player {
  supabaseId: string;
  name: string;
  role: string;
  soldPrice: number;
  teamName?: string;
  teamColor?: string;
  isCaptain: boolean;
}

export interface Dream8Team {
  id?: string;
  playerIds: string[];
  totalCost: number;
  captainId?: string;
  viceCaptainId?: string;
}

export interface Dream8TeamAdmin {
  userId: string;
  displayName: string;
  username: string;
  totalCost: number;
  captain: Dream8Player | null;
  viceCaptain: Dream8Player | null;
  otherPlayers: Dream8Player[];
}

export interface TournamentPlayerPoints {
  playerName: string;
  cricketTeam: string;
  playerId?: string;
  matches: number;
  runsScored: number;
  fours: number;
  sixes: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  batSR: number;
  ballsFaced: number;
  wickets: number;
  economy: number;
  ballsBowled: number;
  maidenOvers: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;
  dotsBowled: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  srPoints: number;
  economyPoints: number;
  totalPoints: number;
}

export interface PlayerPopularity {
  playerId: string;
  playerName: string;
  captainCount: number;
  vcCount: number;
  playerCount: number;
  totalSelections: number;
}

export interface TournamentTeamResult {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  totalPoints: number;
  playerBreakdown: {
    name: string;
    rawPoints: number;
    multiplier: number;
    finalPoints: number;
    role: 'C' | 'VC' | 'P';
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class Dream8Service {
  private isBrowser: boolean;
  private currentUserId: string | null = null;

  private playersSubject = new BehaviorSubject<Dream8Player[]>([]);
  private myTeamSubject = new BehaviorSubject<Dream8Team | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  players$ = this.playersSubject.asObservable();
  myTeam$ = this.myTeamSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  readonly BUDGET = 2500;
  readonly TEAM_SIZE = 8;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private supabaseService: SupabaseService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async loadAllPlayers(): Promise<void> {
    if (!this.isBrowser) return;
    this.loadingSubject.next(true);

    try {
      let auctionPlayers: any[] | null = null;

      const { data: d1, error: e1 } = await this.supabaseService.client
        .from('auction_players')
        .select('id, player_name, player_role, base_price, auction_status, final_price, dream8_price, final_team_id')
        .order('player_name');

      if (e1?.code === '42703') {
        console.warn('⚠️ dream8_price column missing, falling back to final_price');
        const { data: d2, error: e2 } = await this.supabaseService.client
          .from('auction_players')
          .select('id, player_name, player_role, base_price, auction_status, final_price, final_team_id')
          .order('player_name');
        if (e2) throw e2;
        auctionPlayers = d2;
      } else {
        if (e1) throw e1;
        auctionPlayers = d1;
      }

      const { data: teams, error: teamsErr } = await this.supabaseService.client
        .from('teams')
        .select('id, team_name, team_color');

      if (teamsErr) throw teamsErr;

      const teamMap = new Map<string, { name: string; color: string }>();
      teams?.forEach((t: any) => teamMap.set(t.id, { name: t.team_name, color: t.team_color }));

      const players: Dream8Player[] = (auctionPlayers ?? []).map((p: any) => {
        const team = p.final_team_id ? teamMap.get(p.final_team_id) : null;
        return {
          supabaseId: p.id,
          name: p.player_name,
          role: p.player_role || 'All-Rounder',
          soldPrice: p.dream8_price || p.final_price || p.base_price || 100,
          teamName: team?.name,
          teamColor: team?.color,
          isCaptain: false
        };
      });

      players.sort((a, b) => b.soldPrice - a.soldPrice);
      this.playersSubject.next(players);
      console.log(`✅ Dream8: Loaded ${players.length} players`);
    } catch (err) {
      console.error('❌ Dream8: Failed to load players:', err);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async loadMyTeam(): Promise<void> {
    if (!this.isBrowser) return;

    const userId = this.currentUserId;
    if (!userId) return;

    try {
      const { data, error } = await this.supabaseService.client
        .from('dream8_teams')
        .select('id, player_ids, total_cost, captain_id, vice_captain_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.myTeamSubject.next({
          id: data.id,
          playerIds: data.player_ids,
          totalCost: data.total_cost,
          captainId: data.captain_id ?? undefined,
          viceCaptainId: data.vice_captain_id ?? undefined
        });
      } else {
        this.myTeamSubject.next(null);
      }
    } catch (err) {
      console.error('❌ Dream8: Failed to load team:', err);
    }
  }

  async saveTeam(playerIds: string[], totalCost: number, captainId?: string, viceCaptainId?: string): Promise<boolean> {
    if (!this.isBrowser) return false;

    const userId = this.currentUserId;
    if (!userId) return false;

    try {
      if (playerIds.length !== this.TEAM_SIZE) throw new Error(`Team must have exactly ${this.TEAM_SIZE} players`);
      if (totalCost > this.BUDGET) throw new Error(`Total cost exceeds budget`);

      const existing = this.myTeamSubject.value;

      if (existing?.id) {
        const { error } = await this.supabaseService.client
          .from('dream8_teams')
          .update({ player_ids: playerIds, total_cost: totalCost, captain_id: captainId ?? null, vice_captain_id: viceCaptainId ?? null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await this.supabaseService.client
          .from('dream8_teams')
          .insert({ user_id: userId, player_ids: playerIds, total_cost: totalCost, captain_id: captainId ?? null, vice_captain_id: viceCaptainId ?? null });
        if (error) throw error;
      }

      await this.loadMyTeam();
      return true;
    } catch (err) {
      console.error('❌ Dream8: Failed to save team:', err);
      return false;
    }
  }

  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    await this.loadAllPlayers();
    await this.loadMyTeam();
  }

  async loadAllTeams(): Promise<Dream8TeamAdmin[]> {
    if (!this.isBrowser) return [];
    try {
      const { data: teams, error: teamsErr } = await this.supabaseService.client
        .from('dream8_teams')
        .select('id, user_id, player_ids, total_cost, captain_id, vice_captain_id');
      if (teamsErr) throw teamsErr;

      const { data: users, error: usersErr } = await this.supabaseService.client
        .from('users')
        .select('id, display_name, username');
      if (usersErr) throw usersErr;

      const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));
      const playerMap = new Map<string, Dream8Player>(this.playersSubject.value.map(p => [p.supabaseId, p]));

      return (teams || []).map((team: any) => {
        const user = userMap.get(team.user_id);
        const captain     = team.captain_id      ? (playerMap.get(team.captain_id)      ?? null) : null;
        const viceCaptain = team.vice_captain_id  ? (playerMap.get(team.vice_captain_id) ?? null) : null;
        const otherPlayers = (team.player_ids || [])
          .filter((id: string) => id !== team.captain_id && id !== team.vice_captain_id)
          .map((id: string) => playerMap.get(id))
          .filter(Boolean) as Dream8Player[];

        return {
          userId: team.user_id,
          displayName: user?.display_name || 'Unknown',
          username: user?.username || '',
          totalCost: team.total_cost,
          captain,
          viceCaptain,
          otherPlayers
        };
      }).sort((a, b) => b.totalCost - a.totalCost);
    } catch (err) {
      console.error('❌ Dream8: Failed to load all teams:', err);
      return [];
    }
  }

  // ── Tournament Stats ─────────────────────────────────────────────────────────

  // CSV name → auction player name (lowercase). Add entries here for any name mismatch.
  private readonly csvNameAliases: Record<string, string> = {
    'v keshav': 'keshav',
    'sriram n': 'sriram',
  };

  parseCsvAndCalculate(csvText: string): TournamentPlayerPoints[] {
    const lines = csvText.split('\n').map(l => l.replace(/\r/g, '').trim());

    // Find header row that starts with "No."
    const headerIdx = lines.findIndex(l => l.startsWith('No.'));
    if (headerIdx === -1) throw new Error('Invalid CSV: header row starting with "No." not found');

    const dataLines = lines.slice(headerIdx + 1).filter(l => l.length > 0);

    // Build name → UUID map from loaded auction players (case-insensitive)
    const nameToId = new Map<string, string>();
    this.playersSubject.value.forEach(p => {
      nameToId.set(p.name.toLowerCase().trim(), p.supabaseId);
    });

    const results: TournamentPlayerPoints[] = [];

    for (const line of dataLines) {
      const cols = line.split(',');
      if (cols.length < 35) continue;
      const rowNum = cols[0].trim();
      if (!rowNum || isNaN(Number(rowNum))) continue; // skip non-data rows

      const playerName        = cols[1].trim();
      const cricketTeam       = cols[2].trim();
      const matches           = parseInt(cols[3])  || 0;
      const runsScored        = parseInt(cols[6])  || 0;
      const batSR             = parseFloat(cols[8]) || 0;
      const thirties          = parseInt(cols[9])  || 0;
      const fifties           = parseInt(cols[10]) || 0;
      const hundreds          = parseInt(cols[11]) || 0;
      const sixes             = parseInt(cols[13]) || 0;
      const fours             = parseInt(cols[14]) || 0;
      const ballsFaced        = parseInt(cols[15]) || 0;
      const wickets           = parseInt(cols[22]) || 0;
      const maidenOvers       = parseInt(cols[24]) || 0;
      const economy           = parseFloat(cols[27]) || 0;
      const threeWicketHauls  = parseInt(cols[28]) || 0;
      const fiveWicketHauls   = parseInt(cols[29]) || 0;
      const ballsBowled       = parseInt(cols[31]) || 0;
      const dotsBowled        = parseInt(cols[32]) || 0;
      const catches           = parseInt(cols[33]) || 0;
      const stumpings         = parseInt(cols[34]) || 0;
      const runOuts           = parseInt(cols[35]) || 0;

      if (!playerName) continue;

      // ── Batting Points ──
      const battingPoints =
        runsScored +
        (fours * 4) +
        (sixes * 6) +
        (thirties * 4) +   // 25-run milestone (30s column as proxy)
        (fifties * 8) +    // 50-run milestone
        (hundreds * 16);   // century milestone

      // ── Bowling Points ──
      const bowlingPoints =
        (wickets * 30) +
        (threeWicketHauls * 10) +
        (fiveWicketHauls * 25) +
        (maidenOvers * 8) +
        (dotsBowled * 2);

      // ── Fielding Points ──
      const fieldingPoints = (catches * 8) + (runOuts * 8) + (stumpings * 8);

      // ── Strike Rate Bonus (min 12 balls faced) ──
      let srPoints = 0;
      if (ballsFaced >= 12) {
        if (batSR > 200)      srPoints = 30;
        else if (batSR > 175) srPoints = 25;
        else if (batSR > 150) srPoints = 20;
        else if (batSR > 125) srPoints = 15;
      }

      // ── Economy Bonus (min 12 balls bowled) ──
      let economyPoints = 0;
      if (ballsBowled >= 12 && economy > 0) {
        if (economy < 8)       economyPoints = 30;
        else if (economy < 10) economyPoints = 25;
        else if (economy < 12) economyPoints = 20;
      }

      const totalPoints = battingPoints + bowlingPoints + fieldingPoints + srPoints + economyPoints;
      const lookupKey = this.csvNameAliases[playerName.toLowerCase()] ?? playerName.toLowerCase();
      const playerId = nameToId.get(lookupKey) || undefined;

      results.push({
        playerName, cricketTeam, playerId, matches,
        runsScored, fours, sixes, thirties, fifties, hundreds, batSR, ballsFaced,
        wickets, economy, ballsBowled, maidenOvers, threeWicketHauls, fiveWicketHauls, dotsBowled,
        catches, runOuts, stumpings,
        battingPoints, bowlingPoints, fieldingPoints, srPoints, economyPoints, totalPoints
      });
    }

    return results.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async saveTournamentStats(players: TournamentPlayerPoints[], tournamentName: string): Promise<boolean> {
    if (!this.isBrowser || !this.currentUserId) return false;
    try {
      // Delete previous upload for this tournament
      await this.supabaseService.client
        .from('tournament_player_points')
        .delete()
        .eq('tournament_name', tournamentName);

      const rows = players.map(p => ({
        tournament_name:    tournamentName,
        player_name:        p.playerName,
        cricket_team:       p.cricketTeam,
        player_id:          p.playerId || null,
        matches:            p.matches,
        runs_scored:        p.runsScored,
        fours:              p.fours,
        sixes:              p.sixes,
        thirties:           p.thirties,
        fifties:            p.fifties,
        hundreds:           p.hundreds,
        bat_sr:             p.batSR,
        balls_faced:        p.ballsFaced,
        wickets:            p.wickets,
        economy:            p.economy,
        balls_bowled:       p.ballsBowled,
        maiden_overs:       p.maidenOvers,
        three_wicket_hauls: p.threeWicketHauls,
        five_wicket_hauls:  p.fiveWicketHauls,
        dots_bowled:        p.dotsBowled,
        catches:            p.catches,
        run_outs:           p.runOuts,
        stumpings:          p.stumpings,
        batting_points:     p.battingPoints,
        bowling_points:     p.bowlingPoints,
        fielding_points:    p.fieldingPoints,
        sr_points:          p.srPoints,
        economy_points:     p.economyPoints,
        total_points:       p.totalPoints,
        uploaded_by:        this.currentUserId
      }));

      const { error } = await this.supabaseService.client
        .from('tournament_player_points')
        .insert(rows);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('❌ Dream8: Failed to save tournament stats:', err);
      return false;
    }
  }

  async loadTournamentResults(tournamentName?: string): Promise<TournamentPlayerPoints[]> {
    if (!this.isBrowser) return [];
    try {
      let query = this.supabaseService.client
        .from('tournament_player_points')
        .select('*')
        .order('total_points', { ascending: false });

      if (tournamentName) {
        query = query.eq('tournament_name', tournamentName);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any): TournamentPlayerPoints => ({
        playerName:        row.player_name,
        cricketTeam:       row.cricket_team,
        playerId:          row.player_id,
        matches:           row.matches,
        runsScored:        row.runs_scored,
        fours:             row.fours,
        sixes:             row.sixes,
        thirties:          row.thirties,
        fifties:           row.fifties,
        hundreds:          row.hundreds,
        batSR:             row.bat_sr,
        ballsFaced:        row.balls_faced,
        wickets:           row.wickets,
        economy:           row.economy,
        ballsBowled:       row.balls_bowled,
        maidenOvers:       row.maiden_overs,
        threeWicketHauls:  row.three_wicket_hauls,
        fiveWicketHauls:   row.five_wicket_hauls,
        dotsBowled:        row.dots_bowled,
        catches:           row.catches,
        runOuts:           row.run_outs,
        stumpings:         row.stumpings,
        battingPoints:     row.batting_points,
        bowlingPoints:     row.bowling_points,
        fieldingPoints:    row.fielding_points,
        srPoints:          row.sr_points,
        economyPoints:     row.economy_points,
        totalPoints:       row.total_points
      }));
    } catch (err) {
      console.error('❌ Dream8: Failed to load tournament results:', err);
      return [];
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  async resetAllDream8Teams(): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      // Delete all fantasy teams (created_at always >= 2000 for any real record)
      const { error: e1 } = await this.supabaseService.client
        .from('dream8_teams')
        .delete()
        .gte('created_at', '2000-01-01');
      if (e1) throw e1;

      // Delete all tournament stats
      const { error: e2 } = await this.supabaseService.client
        .from('tournament_player_points')
        .delete()
        .gte('uploaded_at', '2000-01-01');
      if (e2) throw e2;

      // Unlock dream8
      await this.setDream8Lock(false);

      return true;
    } catch (err) {
      console.error('❌ Dream8: Reset failed:', err);
      return false;
    }
  }

  async resetAuctionDB(): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      // Reset all auction players back to upcoming state
      const { error: e1 } = await this.supabaseService.client
        .from('auction_players')
        .update({
          auction_status: 'upcoming',
          final_team_id: null,
          final_price: null,
          dream8_price: null
        })
        .gte('base_price', 0);
      if (e1) throw e1;

      // Clear RTM tables
      await this.supabaseService.client.from('rtm_results').delete().gte('created_at', '2000-01-01');
      await this.supabaseService.client.from('rtm_offers').delete().gte('created_at', '2000-01-01');
      await this.supabaseService.client.from('rtm_windows').delete().gte('created_at', '2000-01-01');

      return true;
    } catch (err) {
      console.error('❌ Auction: DB Reset failed:', err);
      return false;
    }
  }

  // ── App Lock ─────────────────────────────────────────────────────────────────

  async loadDream8Lock(): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const { data, error } = await this.supabaseService.client
        .from('app_settings')
        .select('value')
        .eq('key', 'dream8_locked')
        .maybeSingle();
      if (error) throw error;
      return data?.value === 'true';
    } catch (err) {
      console.error('❌ Dream8: Failed to load lock state:', err);
      return false;
    }
  }

  async setDream8Lock(locked: boolean): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const { error } = await this.supabaseService.client
        .from('app_settings')
        .upsert({ key: 'dream8_locked', value: locked ? 'true' : 'false', updated_at: new Date().toISOString() });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('❌ Dream8: Failed to set lock state:', err);
      return false;
    }
  }

  async clearTournamentStats(tournamentName: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const { error } = await this.supabaseService.client
        .from('tournament_player_points')
        .delete()
        .eq('tournament_name', tournamentName);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('❌ Dream8: Failed to clear tournament stats:', err);
      return false;
    }
  }

  async loadPlayerPopularity(): Promise<PlayerPopularity[]> {
    if (!this.isBrowser) return [];
    try {
      const { data: teams, error } = await this.supabaseService.client
        .from('dream8_teams')
        .select('player_ids, captain_id, vice_captain_id');
      if (error) throw error;

      const captainCount  = new Map<string, number>();
      const vcCount       = new Map<string, number>();
      const playerCount   = new Map<string, number>();

      (teams || []).forEach((team: any) => {
        if (team.captain_id)       captainCount.set(team.captain_id, (captainCount.get(team.captain_id) || 0) + 1);
        if (team.vice_captain_id)  vcCount.set(team.vice_captain_id, (vcCount.get(team.vice_captain_id) || 0) + 1);

        (team.player_ids || []).forEach((pid: string) => {
          if (pid !== team.captain_id && pid !== team.vice_captain_id) {
            playerCount.set(pid, (playerCount.get(pid) || 0) + 1);
          }
        });
      });

      const nameMap = new Map<string, string>(this.playersSubject.value.map(p => [p.supabaseId, p.name]));
      const allIds = new Set([...captainCount.keys(), ...vcCount.keys(), ...playerCount.keys()]);

      const result: PlayerPopularity[] = Array.from(allIds).map(pid => {
        const c = captainCount.get(pid)  || 0;
        const v = vcCount.get(pid)       || 0;
        const p = playerCount.get(pid)   || 0;
        return {
          playerId:        pid,
          playerName:      nameMap.get(pid) || 'Unknown',
          captainCount:    c,
          vcCount:         v,
          playerCount:     p,
          totalSelections: c + v + p
        };
      });

      return result.sort((a, b) => b.totalSelections - a.totalSelections);
    } catch (err) {
      console.error('❌ Dream8: Failed to load player popularity:', err);
      return [];
    }
  }

  async calculateTeamLeaderboard(playerPoints: TournamentPlayerPoints[]): Promise<TournamentTeamResult[]> {
    if (!this.isBrowser) return [];
    try {
      // Map: player UUID → { name, points }
      const pointsMap = new Map<string, { name: string; points: number }>();
      playerPoints.forEach(p => {
        if (p.playerId) pointsMap.set(p.playerId, { name: p.playerName, points: p.totalPoints });
      });

      const { data: teams, error: teamsErr } = await this.supabaseService.client
        .from('dream8_teams')
        .select('id, user_id, player_ids, captain_id, vice_captain_id');
      if (teamsErr) throw teamsErr;

      const { data: users, error: usersErr } = await this.supabaseService.client
        .from('users')
        .select('id, display_name, username');
      if (usersErr) throw usersErr;

      const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

      const results: TournamentTeamResult[] = (teams || []).map((team: any) => {
        const user = userMap.get(team.user_id);

        const breakdown = (team.player_ids || []).map((pid: string) => {
          const pd = pointsMap.get(pid);
          const name = pd?.name || 'Unknown Player';
          const rawPoints = pd?.points ?? 0;

          let multiplier: number;
          let role: 'C' | 'VC' | 'P';

          if (pid === team.captain_id)        { multiplier = 2;   role = 'C';  }
          else if (pid === team.vice_captain_id) { multiplier = 1.5; role = 'VC'; }
          else                                 { multiplier = 1;   role = 'P';  }

          return { name, rawPoints, multiplier, finalPoints: Math.round(rawPoints * multiplier), role };
        });

        // Sort: C first, VC second, rest by points desc
        breakdown.sort((a: any, b: any) => {
          const order: Record<string, number> = { C: 0, VC: 1, P: 2 };
          if (order[a.role] !== order[b.role]) return order[a.role] - order[b.role];
          return b.finalPoints - a.finalPoints;
        });

        const totalPoints = breakdown.reduce((sum: number, p: any) => sum + p.finalPoints, 0);

        return {
          rank: 0,
          userId: team.user_id,
          displayName: user?.display_name || 'Unknown',
          username: user?.username || '',
          totalPoints,
          playerBreakdown: breakdown
        };
      });

      results.sort((a, b) => b.totalPoints - a.totalPoints);
      results.forEach((r, i) => (r.rank = i + 1));

      return results;
    } catch (err) {
      console.error('❌ Dream8: Failed to calculate team leaderboard:', err);
      return [];
    }
  }
}
