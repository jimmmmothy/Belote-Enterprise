import Dealer from "./dealer.ts";
import Player from "./player.ts";

const Contracts = {
    UNDEFINED: 0,
    CLUBS: 1,
    DIAMONDS: 2,
    HEARTS: 3,
    SPADES: 4,
    NO_T: 5,
    ALL_T: 6,
}

type GameEvents = {
    onContractPhase: (gameId: string) => void;
    onDealtCards: (players: Player[]) => void;
}

export default class Game {
    id: string;
    players: Player[] = [];
    dealer: Dealer;
    contract: number;
    events: GameEvents;

    constructor(id: string, events: GameEvents) {
        this.id = id;
        this.dealer = new Dealer();
        this.contract = Contracts.UNDEFINED;
        this.events = events;
    }

    addPlayer(player: Player) { // returns TRUE if added successfully; FALSE if game is full
        if (this.players.length < 4) {
            this.players.push(player);
            return this.players.length;
        } else {
            throw Error("Game is full");
        }
    }

    reassignClientId(playerId: string, clientId: string) {
        let player = this.players.find(p => p.playerId === playerId);
        
        if (player)
            player.socketId = clientId;
    }

    start() {
        this.dealer.firstDeal(this.players);
        this.events.onDealtCards(this.players);

        this.events.onContractPhase(this.id);
    }
}