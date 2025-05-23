
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
}