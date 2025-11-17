import Dealer from "./dealer.js";
import type { Move } from "../dtos/move.js";
import Player from "./player.js";
import type { GameState } from "./types.js";
import { startBiddingPhase, handleBid } from "./phases/bidding.js";
import { handleMove } from "./phases/playing.js";

type GameEventName =
  | "SEND_CARDS"
  | "BIDDING_TURN"
  | "BID_PLACED"
  | "ROUND_RESTART"
  | "BIDDING_FINISHED"
  | "PLAYING_TURN"
  | "MOVE_PLAYED"
  | "TRICK_FINISHED"
  | "ROUND_FINISHED";

interface GameEvent<T = any> {
  type: GameEventName;
  recepient?: string;
  payload: T;
}

type GameEventHandler = (event: GameEvent) => void;

export default class Game {
    state: GameState;
    eventHandler: GameEventHandler = () => {};

    constructor(id: string) {
        this.state = this.createGame(id);
    }

    createGame(id: string): GameState {
        return {
          id,
          players: [],
          dealer: new Dealer(),
          phase: "BIDDING",
          currentPlayerIndex: 0,
          highestContract: "Pass",
          bids: new Map(),
          currentTrick: [],
          score: {
            team0: 0,
            team1: 0,
          }
        };
    }       

    on(handler: GameEventHandler) {
      this.eventHandler = handler;
    }

    emit(event: GameEvent) {
      this.eventHandler(event);
    }

    addPlayer(player: Player) {
        if (this.state.players.length < 4) {
            this.state.players.push(player);
            return this.state.players.length;
        } else {
            throw Error("Game is full");
        }
    }

    reassignClientId(playerId: string, clientId: string) { // useful for reconnecting players
        let player = this.state.players.find(p => p.playerId === playerId);
        
        if (player)
            player.socketId = clientId;
    }

    start() {
      if (this.state.players.length !== 4) {
        throw Error(`[DEBUG ERROR] Game with id ${this.state.id} is trying to start with ${this.state.players.length} players`);
      }
      console.log("[DEBUG] game.start()");
      this.state.dealer.firstDeal(this.state.players);
      this.emit({ type: "SEND_CARDS", payload: this.state.players });
        
      startBiddingPhase(this.state, this.emit.bind(this));
    }

    handleBidInput(data: { playerId: string; contract: string }) {
      if (this.state.phase !== "BIDDING") throw Error("Not in bidding phase");
      this.state = handleBid(this.state, data.playerId, data.contract, this.emit.bind(this));
    }

    handleMoveInput(data: Move) {
      if (this.state.phase !== "PLAYING") throw Error("Not in playing phase");
      this.state = handleMove(this.state, data, this.emit.bind(this));
    }
}