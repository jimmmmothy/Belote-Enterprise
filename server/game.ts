import Dealer from "./dealer.ts";
import Player from "./player.ts";

const Contracts = ["Pass", "Clubs", "Diamonds", "Hearts", "Spades", "No Trumps", "All Trumps"];

type GameEvents = {
    onDealtCards: (players: Player[]) => void;
    onContractPhase: (gameId: string, available: string[]) => void;
    onContractDone: (gameId: string, finalContract: string) => void;
}

export default class Game {
    id: string;
    players: Player[] = [];
    dealer: Dealer;
    events: GameEvents;
    currentPlayerIndex: number = 0;
    bids: Map<string, string> = new Map(); // playerId -> contract
    highestContract: string = "Pass";

    constructor(id: string, events: GameEvents) {
        this.id = id;
        this.dealer = new Dealer();
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

        this.startContractPhase();
    }

    startContractPhase() {
        this.currentPlayerIndex = 0;
        this.bids.clear();
        this.highestContract = "Pass";
        this.askNextPlayer();
    }

    askNextPlayer() {
        const player = this.players[this.currentPlayerIndex];
        this.events.onContractPhase(player.socketId, this.availableContracts());
    }

    availableContracts(): string[] {
        const base = ["Pass", ...Contracts.slice(Contracts.indexOf(this.highestContract) + 1)];
        return base;
    }

    handleContractSelection(playerId: string, contract: string) {
        const player = this.players[this.currentPlayerIndex];
            
        if (player.playerId !== playerId) throw Error("Not your turn");
            
        this.bids.set(playerId, contract);
        
        if (Contracts.indexOf(contract) > Contracts.indexOf(this.highestContract))
            this.highestContract = contract;
    
        // Move to next player
        if (this.currentPlayerIndex === 3) {
            this.currentPlayerIndex = 0;
        } else {
            this.currentPlayerIndex++;
        }

        const nextPlayer = this.players[this.currentPlayerIndex];
    
        if (this.bids.get(nextPlayer.playerId) === this.highestContract) {
            this.finishContractPhase();
        } else {
            this.askNextPlayer();
        }
    }
    
    finishContractPhase() {
        if (this.highestContract === "Pass") {
            this.players.forEach(p => p.cards = []);
            this.dealer.shuffle();
            this.start();

            return;
        }

        this.dealer.secondDeal(this.players);
        this.events.onDealtCards(this.players);
        this.events.onContractDone(this.id, this.highestContract);
    }
}