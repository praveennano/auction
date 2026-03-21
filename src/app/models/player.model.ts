export enum PlayerRole {
  BATSMAN = 'Batsman',
  BOWLER = 'Bowler',
  ALL_ROUNDER = 'All-Rounder',
  WICKET_KEEPER = 'Wicket Keeper'
}

export interface Player {
  id: number;
  supabaseId?: string;
  name: string;
  role: PlayerRole;
  basePrice: number;
  soldPrice?: number;
  teamId?: number;
  isSold?: boolean;
  isUnsold?: boolean;

  mvpRanking: number;
  cups: number;             // ← moved here, top-level, required

  battingStats: {
    pomAwards?: number;     // Cup removed from here
    runs: number;
    battingAvg?: number;
    strikeRate: number;
  };

  bowlingStats?: {
    wickets: number;
    economy: number;
    catches?: number;
  };
}

export interface ProcessedPlayer extends Player {
  fontSize: number;
  color: string;
  fontWeight: string;
  score: number;
  position: { left: string; top: string };
}