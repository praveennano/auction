// RTM (Right To Match) Models and Interfaces

export interface RtmOffer {
  id?: string;
  playerId: number;
  teamId: number;
  amount: number;
  createdAt: number; // timestamp in ms for tie-breaking (earliest wins)
}

export interface RtmWindow {
  id?: string;
  playerIds: number[]; // Players eligible for RTM in this milestone (e.g., 11-15)
  startSoldCount: number; // Milestone sold count when window opened (e.g., 10)
  endSoldCount: number; // When milestone completes (e.g., 15)
  active: boolean;
  createdAt?: number;
  closedAt?: number;
  offers: Map<number, RtmOffer[]>; // playerId -> array of RTM offers
}

export interface RtmResult {
  playerId: number;
  winnerId: number; // Team ID of RTM winner
  finalAmount: number;
  originalOwnerId: number; // Team ID who originally owned the player
  success: boolean;
  message: string;
}

export interface RtmValidation {
  valid: boolean;
  message: string;
  basePrice?: number;
}
