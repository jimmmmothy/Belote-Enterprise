import Dealer from "./dealer.ts";
import type { Move } from "./dtos/move.ts";
import Player from "./player.ts";

const Contracts = ["Pass", "Clubs", "Diamonds", "Hearts", "Spades", "No Trumps", "All Trumps"];

type GameEvents = {
    onDealtCards: (players: Player[]) => void;
    onBiddingPhase: (socketId: string, available: string[]) => void;
    notifyPlayerTurn: (socketId: string) => void;
    onPlayingPhase: (gameId: string, trick: Move[], nextPlayer: string) => void;
}

export default class Game {
    id: string;
    players: Player[] = [];
    dealer: Dealer;
    events: GameEvents;

    currentPlayerIndex: number = 0;
    
    bids: Map<string, string> = new Map(); // playerId -> contract
    highestContract: string = "Pass";

    currentTrick: Move[] = []; // playerId -> card

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

    reassignClientId(playerId: string, clientId: string) { // useful for reconnecting players
        let player = this.players.find(p => p.playerId === playerId);
        
        if (player)
            player.socketId = clientId;
    }

    start() {
        this.dealer.firstDeal(this.players);
        this.events.onDealtCards(this.players);

        this.startBiddingPhase();
    }

    startBiddingPhase() {
        this.currentPlayerIndex = 0;
        this.bids.clear();
        this.highestContract = "Pass";
        this.askNextPlayer();
    }

    askNextPlayer() {
        const player = this.players[this.currentPlayerIndex];
        this.events.onBiddingPhase(player.socketId, this.availableContracts());
    }

    availableContracts(): string[] {
        return ["Pass", ...Contracts.slice(Contracts.indexOf(this.highestContract) + 1)];;
    }

    handleBid(playerId: string, contract: string) {
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
            this.finishBiddingPhase();
        } else {
            this.askNextPlayer();
        }
    }
    
    finishBiddingPhase() {
        if (this.highestContract === "Pass") {
            this.players.forEach(p => p.cards = []);
            this.dealer.shuffle();
            this.start();

            return;
        }

        this.dealer.secondDeal(this.players);
        this.events.onDealtCards(this.players);
        this.startPlayingPhase();
    }

    startPlayingPhase() {
        this.currentPlayerIndex = 0;
        this.events.notifyPlayerTurn(this.players[this.currentPlayerIndex].socketId);
    }

    handlePlayingMove(move: Move) {
        const player = this.players[this.currentPlayerIndex];
            
        if (player.playerId !== move.playerId) throw Error("Not your turn");
        if (this.currentTrick.find(t => t.playerId === move.playerId)) throw Error("You already played");

        this.currentTrick.push(move);
        player.removeCard({ suit: move.suit, rank: move.rank });
        console.log("[INFO] Move played by", move.playerId, ":", move.suit, move.rank);
        
        // Move to next player
        if (this.currentPlayerIndex === 3) {
            this.currentPlayerIndex = 0;
        } else {
            this.currentPlayerIndex++;
        }

        this.events.onPlayingPhase(this.id, this.currentTrick, this.players[this.currentPlayerIndex].playerId);
               
        if (this.currentTrick.length === 4) { // All players have played
            // Finish
            console.log("Finished for now");
        } 
    }
}