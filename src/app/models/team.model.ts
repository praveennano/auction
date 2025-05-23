import { Player } from './player.model';

export interface Team {
  id: number;
  name: string;
  shortName: string;
  color: string;
  budget: number;
  players: Player[];
}
