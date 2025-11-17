import type { Move } from "../dtos/move.js";
import Dealer from "./dealer.js";
import type Player from "./player.js";

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