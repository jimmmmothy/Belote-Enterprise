import type { Move } from "../../dtos/move.ts";
import Dealer from "../dealer.ts";
import type Player from "../player.ts";

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
}

export type Card = {
  suit: string,
  rank: string
}