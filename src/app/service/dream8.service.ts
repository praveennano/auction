import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Dream8Player {
  supabaseId: string;
  name: string;
  role: string;
  soldPrice: number;    // final_price from auction (or base_price if not sold yet)
  teamName?: string;    // team the player was sold to
  teamColor?: string;
  isCaptain: boolean;
}

export interface Dream8Team {
  id?: string;
  playerIds: string[];  // supabase UUIDs
  totalCost: number;
  captainId?: string;
  viceCaptainId?: string;
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

  /**
   * Load all players with their auction prices.
   * Uses final_price if available, otherwise base_price.
   */
  async loadAllPlayers(): Promise<void> {
    if (!this.isBrowser) return;
    this.loadingSubject.next(true);

    try {
      // Fetch all auction players
      const { data: auctionPlayers, error: playersErr } = await this.supabaseService.client
        .from('auction_players')
        .select('id, player_name, player_role, base_price, auction_status, final_price, final_team_id')
        .order('player_name');

      if (playersErr) throw playersErr;

      // Fetch teams for team name/color mapping
      const { data: teams, error: teamsErr } = await this.supabaseService.client
        .from('teams')
        .select('id, team_name, team_color');

      if (teamsErr) throw teamsErr;

      const teamMap = new Map<string, { name: string; color: string }>();
      teams?.forEach((t: any) => teamMap.set(t.id, { name: t.team_name, color: t.team_color }));

      // Map to Dream8Player format
      const players: Dream8Player[] = (auctionPlayers || []).map((p: any) => {
        const team = p.final_team_id ? teamMap.get(p.final_team_id) : null;
        return {
          supabaseId: p.id,
          name: p.player_name,
          role: p.player_role || 'All-Rounder',
          // Use final_price if sold, otherwise base_price
          soldPrice: p.final_price || p.base_price || 100,
          teamName: team?.name,
          teamColor: team?.color,
          isCaptain: false
        };
      });

      // Sort by price descending
      players.sort((a, b) => b.soldPrice - a.soldPrice);

      this.playersSubject.next(players);
      console.log(`✅ Dream8: Loaded ${players.length} players`);
    } catch (err) {
      console.error('❌ Dream8: Failed to load players:', err);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Load the current user's Dream 8 team from Supabase.
   */
  async loadMyTeam(): Promise<void> {
    if (!this.isBrowser) return;

    const userId = this.currentUserId;
    if (!userId) {
      console.log('Dream8: No user logged in');
      return;
    }

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
        console.log(`✅ Dream8: Loaded saved team (${data.player_ids.length} players, cost: ${data.total_cost})`);
      } else {
        this.myTeamSubject.next(null);
        console.log('Dream8: No saved team found');
      }
    } catch (err) {
      console.error('❌ Dream8: Failed to load team:', err);
    }
  }

  /**
   * Save or update the user's Dream 8 team.
   */
  async saveTeam(playerIds: string[], totalCost: number, captainId?: string, viceCaptainId?: string): Promise<boolean> {
    if (!this.isBrowser) return false;

    const userId = this.currentUserId;
    if (!userId) {
      console.error('Dream8: Not logged in');
      return false;
    }

    try {
      if (playerIds.length !== this.TEAM_SIZE) {
        throw new Error(`Team must have exactly ${this.TEAM_SIZE} players`);
      }
      if (totalCost > this.BUDGET) {
        throw new Error(`Total cost (${totalCost}) exceeds budget (${this.BUDGET})`);
      }

      const existing = this.myTeamSubject.value;

      if (existing?.id) {
        // Update existing team
        const { error } = await this.supabaseService.client
          .from('dream8_teams')
          .update({
            player_ids: playerIds,
            total_cost: totalCost,
            captain_id: captainId ?? null,
            vice_captain_id: viceCaptainId ?? null
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new team
        const { error } = await this.supabaseService.client
          .from('dream8_teams')
          .insert({
            user_id: userId,
            player_ids: playerIds,
            total_cost: totalCost,
            captain_id: captainId ?? null,
            vice_captain_id: viceCaptainId ?? null
          });

        if (error) throw error;
      }

      // Reload to get the latest data
      await this.loadMyTeam();
      console.log('✅ Dream8: Team saved successfully');
      return true;
    } catch (err) {
      console.error('❌ Dream8: Failed to save team:', err);
      return false;
    }
  }

  /**
   * Initialize: load players + user's team
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    await this.loadAllPlayers();
    await this.loadMyTeam();
  }
}
