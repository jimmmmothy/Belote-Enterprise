import type { GameState, PhaseType } from "../types";
import { startPlayingPhase } from "./playing";

export const Contracts = ["Pass", "Clubs", "Diamonds", "Hearts", "Spades", "No Trumps", "All Trumps"];

export function startBiddingPhase(state: GameState, emit: Function): GameState {
  const newState = {
    ...state,
    phase: "BIDDING" as PhaseType,
    currentPlayerIndex: 0,
    bids: new Map(),
    highestContract: "Pass",
  };
  askNextPlayer(newState, emit);
  return newState;
}

function askNextPlayer(state: GameState, emit: Function) {
  const player = state.players[state.currentPlayerIndex];
  emit({ 
    type: "BIDDING_TURN", 
    payload: {
        socketId: player.socketId,
        availableContracts: availableContracts(state),
    }
  });
}

export function availableContracts(state: GameState): string[] {
  return ["Pass", ...Contracts.slice(Contracts.indexOf(state.highestContract) + 1)];
}

export function handleBid(state: GameState, playerId: string, contract: string, emit: Function): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.playerId !== playerId) throw Error("Not your turn");

  const newBids = new Map(state.bids);
  newBids.set(playerId, contract);

  let highestContract = state.highestContract;
  if (Contracts.indexOf(contract) > Contracts.indexOf(state.highestContract))
    highestContract = contract;

  let nextPlayerIndex = (state.currentPlayerIndex + 1) % 4;
  const nextPlayer = state.players[nextPlayerIndex];

  emit({
    type: "BID_PLACED", 
    payload: { playerId, contract }
  });

  if (newBids.get(nextPlayer.playerId) === highestContract) {
    return finishBiddingPhase(
      { ...state, bids: newBids, highestContract, currentPlayerIndex: nextPlayerIndex },
      emit
    );
  }

  const updatedState = { ...state, bids: newBids, highestContract, currentPlayerIndex: nextPlayerIndex };
  askNextPlayer(updatedState, emit);
  return updatedState;
}

function finishBiddingPhase(state: GameState, emit: Function): GameState {
  if (state.highestContract === "Pass") {
    // this dont work
    // emit({
    //     type: "ROUND_RESTART", 
    //     payload: {}
    // });
    state.players.forEach(p => p.cards = []);
    state.dealer.shuffle();
    state.dealer.firstDeal(state.players);
    emit({
      type: "SEND_CARDS", 
      payload: state.players
    });
    return startBiddingPhase(state, emit);
  }

  emit({
    type: "BIDDING_FINISHED",
    payload: { highestContract: state.highestContract }
  });
  return startPlayingPhase(state, emit);
}