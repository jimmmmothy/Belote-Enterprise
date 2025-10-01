export default class Player {
    socketId: string; // id of the socket so the server knows which client to send what data
    playerId: string; // Unique, immutable uuid for each player which persists after refresh
    cards: string[];

    constructor(socketId: string, playerId: string) {
        this.socketId = socketId;
        this.playerId = playerId;
        this.cards = [];
    }

    addCards(newCards: string[]) {
        this.cards = this.cards.concat(newCards);
    }

    removeCard(card: string) {
        this.cards = this.cards.filter(c => c !== card);
    }
}