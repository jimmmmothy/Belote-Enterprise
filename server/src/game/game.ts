import Dealer from "./dealer";
import type { Move } from "../dtos/move";
import Player from "./player";
import type { GameState } from "./types";
import { startBiddingPhase, handleBid } from "./phases/bidding";
import { handleMove } from "./phases/playing";

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
        };
    }       

    on(handler: GameEventHandler) {
      this.eventHandler = handler;
    }

    emit(event: GameEvent) {
      this.eventHandler(event);
    }

    addPlayer(player: Player) { // returns TRUE if added successfully; FALSE if game is full
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

    getState = () => this.state;

    start() {
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