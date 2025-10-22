import type { Move } from "../dtos/move";
import Dealer from "./dealer";
import type Player from "./player";

export type PhaseType = "BIDDING" | "PLAYING" | "SCORING";

export type GameState = {
  id: string;
  players: Player[];
  dealer: Dealer;
  phase: PhaseType;
  currentPlayerIndex: number;
  highestContract: string;
  bids: Map<string, string>;
  currentTrick: Move[];
  score: {
    team0: number,
    team1: number
  }
}

export type Card = {
  suit: string,
  rank: string
}