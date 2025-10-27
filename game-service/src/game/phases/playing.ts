import type { Card, GameState } from "../types";
import type { Move } from "../../dtos/move";
import Player from "../player";
import { setTimeout } from "node:timers/promises";

const TrumpOrder: Record<string, number> = {
  '7': 0,
  '8': 1,
  'Q': 2,
  'K': 3,
  '10': 4,
  'A': 5,
  '9': 6,
  'J': 7
}

const TrumpScore: Record<string, number> = {
  '7': 0,
  '8': 0,
  'Q': 3,
  'K': 4,
  '10': 10,
  'A': 11,
  '9': 14,
  'J': 20
}

const RegularOrder: Record<string, number> = {
  '7': 0,
  '8': 1,
  '9': 2,
  'J': 3,
  'Q': 4,
  'K': 5,
  '10': 6,
  'A': 7
}

const RegularScore: Record<string, number> = {
  '7': 0,
  '8': 0,
  '9': 0,
  'J': 2,
  'Q': 3,
  'K': 4,
  '10': 10,
  'A': 11
}

export function startPlayingPhase(state: GameState, emit: Function): GameState {
  emit({
    type: "PLAYING_STARTED",
    payload: {}
  });
  state.dealer.secondDeal(state.players);
  emit({
    type: "SEND_CARDS",
    payload: state.players,
  });
  const firstPlayer = state.players[state.currentPlayerIndex];
  emit({
    type: "PLAYING_TURN",
    recepient: firstPlayer.socketId,
  });
  return { ...state, phase: "PLAYING", currentTrick: [] };
}

export function handleMove(state: GameState, move: Move, emit: Function): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.playerId !== move.playerId) throw Error("Not your turn");

  if (state.currentTrick.find(t => t.playerId === move.playerId))
    throw Error("You already played");

  // Validate move
  if (!isValidMove(state, move)) {
    emit({
      type: "PLAYING_TURN",
      recepient: player.socketId,
      payload: {}
    });
    throw Error("Invalid move"); // maybe also emit event to let player know its not possible
  }

  const newTrick = [...state.currentTrick, move];
  // player.removeCard({ suit: move.suit, rank: move.rank }); this doesnt affect state.player
  state.players[state.currentPlayerIndex].removeCard({ suit: move.suit, rank: move.rank });
  emit({
    type: "MOVE_PLAYED",
    recepient: state.id,
    payload: { playerId: move.playerId, suit: move.suit, rank: move.rank }
  });

  if (newTrick.length === 4) {
    let winner = state.players.find(p => p.playerId === getTrickWinningCard(state.currentTrick, state.highestContract, state).playerId);
    if (!winner)
      throw Error("Couldn't identify winner of this trick");
    
    switch (winner.team) {
      case "team 0":
        state.score.team0 += calculateTrickScore(state.currentTrick, state.highestContract);
        break;
      case "team 1":
        state.score.team1 += calculateTrickScore(state.currentTrick, state.highestContract);
        break;
      default:
        throw Error("Couldn't identify team of this trick's winner");
    }

    let winnerIndex;
    for (let i = 0; i < state.players.length; i++) {
      if (winner.playerId === state.players[i].playerId)
        winnerIndex = i;
    }

    setTimeout(1000); // Sleep 1 sec to allow users to see whats happening
    emit({
      type: "PLAYING_TURN",
      recepient: winner.socketId,
      payload: {}
    });
    emit({
      type: "TRICK_FINISHED",
      recepient: state.id,
      payload: {}
    });

    console.log("[INFO] Current score:", state.score);

    return { ...state, currentPlayerIndex: winnerIndex!, currentTrick: [] };
  }

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % 4;
  const nextPlayer = state.players[nextPlayerIndex];
  emit({
    type: "PLAYING_TURN",
    recepient: nextPlayer.socketId,
    payload: {}
  });

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    currentTrick: newTrick,
  };
}

function calculateTrickScore(trick: Move[], contract: string): number {
  let score = 0;

  trick.forEach(m => {
    if (m.suit.toLowerCase() === contract.toLowerCase() || contract.toLowerCase() === "all trumps") {
      score += TrumpScore[m.rank];
    }
    else {
      score += RegularScore[m.rank];
    }
  });

  return score;
}

function isValidMove(state: GameState, move: Move): boolean {
  const { currentTrick, highestContract, players } = state;
  const player = players.find(p => p.playerId === move.playerId);
  if (!player) return false;

  const playerCards = player.cards;
  const trumpSuit = highestContract.toLowerCase() !== 'all trumps' && highestContract.toLowerCase() !== 'no trumps' ? highestContract.toLowerCase() : null;

  // 1️⃣ If first to play — any card allowed
  if (currentTrick.length === 0) return true;

  const leadCard = currentTrick[0];
  const leadSuit = leadCard.suit.toLowerCase();

  const currentWinningCard = getTrickWinningCard(currentTrick, highestContract, state);
  const partnerId = getPartnerId(player.playerId, players);
  const partnerWinning = currentWinningCard.playerId === partnerId;

  if (highestContract.toLowerCase() === 'all trumps' || highestContract.toLowerCase() === 'no trumps') {
    if (hasSuit(playerCards, leadSuit)) {
      // must raise if possible
      if (!partnerWinning && canRaise(playerCards, currentWinningCard, highestContract, leadSuit)) {
        return (
          move.suit === leadSuit &&
          isRaise(move, currentWinningCard, highestContract)
        );
      }
      // otherwise must follow suit
      return move.suit === leadSuit;
    }
    // no suit, can play anything
    return true;
  }

  // 3.1 If can follow suit
  if (hasSuit(playerCards, leadSuit)) {
    if (move.suit !== leadSuit) return false;

    // must raise if possible and lead suit is not trump
    if (!partnerWinning && canRaise(playerCards, currentWinningCard, highestContract, leadSuit)) {
      return move.suit === leadSuit && isRaise(move, currentWinningCard, highestContract);
    }

    // otherwise just follow suit
    return true;
  }

  // 3.2 Cannot follow suit → check for trumps
  if (trumpSuit && hasTrump(playerCards, trumpSuit)) {
    const trumpsOnTable = currentTrick.filter(c => c.suit === trumpSuit);
    const highestTrumpOnTable = trumpsOnTable.length > 0
      ? getTrickWinningCard(trumpsOnTable, highestContract, state)
      : undefined;

    // 3.2.1 If trumps already played
    if (highestTrumpOnTable) {
      const myHigherTrumps = playerCards.filter(
        c => c.suit === trumpSuit && isRaise(c, highestTrumpOnTable, highestContract)
      );

      // must overtrump if possible and partner not winning
      if (!partnerWinning && myHigherTrumps.length > 0) {
        return (
          move.suit === trumpSuit &&
          isRaise(move, highestTrumpOnTable, highestContract)
        );
      }

      // if partner is winning or can't overtrump → any trump allowed
      return move.suit === trumpSuit;
    }

    // 3.2.2 No trumps yet — must play a trump
    return move.suit === trumpSuit;
  }

  // 3.3 Can't follow suit or trump → free play
  return true;
}

function hasSuit(cards: Card[], suit: string): boolean {
  return cards.some(c => c.suit === suit);
}

function hasTrump(cards: Card[], trump: string): boolean {
  return cards.some(c => c.suit === trump);
}

function getPartnerId(playerId: string, players: Player[]): string {
  const index = players.findIndex(p => p.playerId === playerId);
  return players[(index + 2) % 4].playerId; // assumes 4-player Belote, team = 2 apart
}

function isRaise(card: Card, winningCard: Move, contract: string): boolean {
  const isAllTrumps = contract.toLowerCase() === 'all trumps';
  const isNoTrumps = contract.toLowerCase() === 'no trumps';
  const trumpSuit = !isAllTrumps && !isNoTrumps ? contract.toLowerCase() : null;

  // helper to get value according to contract
  const getValue = (c: Card) => {
    if (isAllTrumps) return TrumpOrder[c.rank];
    if (isNoTrumps) return RegularOrder[c.rank];
    return c.suit === trumpSuit ? TrumpOrder[c.rank] : RegularOrder[c.rank];
  };

  // if same suit → higher rank means raise
  if (card.suit === winningCard.suit) {
    return getValue(card) > getValue(winningCard);
  }

  // if card is trump and winning card is not → always a raise
  if (trumpSuit && card.suit === trumpSuit && winningCard.suit !== trumpSuit) {
    return true;
  }

  // otherwise → not a raise
  return false;
}

function canRaise(cards: Card[], winningCard: Move, contract: string, leadSuit: string): boolean {
  const isAllTrumps = contract.toLowerCase() === 'all trumps';
  const isNoTrumps = contract.toLowerCase() === 'no trumps';
  const trumpSuit = !isAllTrumps && !isNoTrumps ? contract.toLowerCase() : null;

  const getValue = (c: Card) => {
    if (isAllTrumps) return TrumpOrder[c.rank];
    if (isNoTrumps) return RegularOrder[c.rank];
    return c.suit === trumpSuit ? TrumpOrder[c.rank] : RegularOrder[c.rank];
  };

  // Case 1: following lead suit (not trump)
  if (leadSuit && winningCard.suit === leadSuit) {
    return cards
      .filter(c => c.suit === leadSuit)
      .some(c => getValue(c) > getValue(winningCard));
  }

  // Case 2: cannot follow lead suit → check for trumps beating current winning card
  if (trumpSuit) {
    return cards
      .filter(c => c.suit === trumpSuit)
      .some(c => {
        if (winningCard.suit === trumpSuit)
          return getValue(c) > getValue(winningCard);
        return true; // any trump beats non-trump
      });
  }

  return false;
}

function getTrickWinningCard(trick: Move[], highestContract: string, state: GameState): Move {
  let winner = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (compareCards(trick[i], winner, highestContract, state) > 0) {
      winner = trick[i];
    }
  }
  return winner;
}

function compareCards(a: Move, b: Move, contract: string, state: GameState): number {
  const isAllTrumps = contract.toLowerCase() === 'all trumps';
  const isNoTrumps = contract.toLowerCase() === 'no trumps';
  const trumpSuit = !isAllTrumps && !isNoTrumps ? contract.toLowerCase() : null;

  const getValue = (c: Move) => {
    if (isAllTrumps) return TrumpOrder[c.rank];
    if (isNoTrumps) return RegularOrder[c.rank];
    return c.suit === trumpSuit ? TrumpOrder[c.rank] : RegularOrder[c.rank];
  };

  // a beats b → return +1
  if (isAllTrumps || isNoTrumps) {
    if (a.suit !== b.suit) return 0; // can't win if not same suit
    return getValue(a) - getValue(b);
  }

  // Normal trump game
  if (a.suit === b.suit) return getValue(a) - getValue(b);
  if (a.suit === trumpSuit && b.suit !== trumpSuit) return 1;
  if (b.suit === trumpSuit && a.suit !== trumpSuit) return -1;

  // Not same suit and no trumps — only first-suit cards matter
  if (b.suit !== trumpSuit && b.suit === state.currentTrick[0].suit && a.suit !== trumpSuit) {
    return 0;
  }

  return 0;
}
