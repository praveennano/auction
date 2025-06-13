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
  
  // MVP ranking - required field
  mvpRanking: number;
  
  // Enhanced batting stats with new fields
  battingStats: {
    Cup?: number;           // Cups/Tournaments won
    pomAwards?: number;     // Player of Match awards
    runs: number;           // Total runs scored
    battingAvg?: number;    // Batting average
    strikeRate: number;     // Strike rate
  };
  
  // Enhanced bowling stats with new fields
  bowlingStats?: {
    wickets: number;        // Total wickets taken
    economy: number;        // Economy rate
    catches?: number;       // Catches taken (fielding)
  };
}

export interface ProcessedPlayer extends Player {
  fontSize: number;
  color: string;
  fontWeight: string;
  score: number;
  position: { left: string; top: string };
}