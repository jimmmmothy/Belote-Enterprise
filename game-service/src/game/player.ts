import type { Card } from './types';

export default class Player {
    socketId?: string; // id of the socket so the server knows which client to send what data
    playerId: string; // Unique, immutable uuid for each player which persists after refresh
    team: string;
    cards: Card[];

    constructor(playerId: string, team: string, socketId?: string,) {
        this.socketId = socketId;
        this.playerId = playerId;
        this.team = team;
        this.cards = [];
    }

    addCards(newCards: { suit: string, rank: string }[]) {
        this.cards = this.cards.concat(newCards);
    }

    removeCard(card: { suit: string, rank: string }) {
        this.cards = this.cards.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    }
}