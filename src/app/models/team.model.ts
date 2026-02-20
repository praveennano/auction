import { Player } from './player.model';

export interface Team {
  id: number;
  supabaseId?: string;   // Supabase UUID from teams table
  name: string;
  shortName: string;
  color: string;
  budget: number;
  players: Player[];
}
