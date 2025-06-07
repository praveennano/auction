
export enum PlayerRole {
  BATSMAN = 'Batsman',
  BOWLER = 'Bowler',
  ALL_ROUNDER = 'All-Rounder',
  WICKET_KEEPER = 'Wicket Keeper'
}

export interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  basePrice: number;
  soldPrice?: number;
  teamId?: number;
  isSold?: boolean;
  isUnsold?: boolean;
     
  // Essential auction stats
  mvpRanking: number; // Required field as per your structure
  battingStats: {
    runs: number;
    strikeRate: number;
  };
  bowlingStats?: {
    wickets: number;
    economy: number;
  };
}