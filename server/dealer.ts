import Player from "./player.ts";

export default class Dealer {
    pool: string[] = [];

    constructor() {
        this.init();
        this.shuffle();
    }
    
    init() {
        this.pool = [
            'c7', 'c8', 'c9', 'c10', 'cJ', 'cQ', 'cK', 'cA',
            'd7', 'd8', 'd9', 'd10', 'dJ', 'dQ', 'dK', 'dA',
            'h7', 'h8', 'h9', 'h10', 'hJ', 'hQ', 'hK', 'hA',
            's7', 's8', 's9', 's10', 'sJ', 'sQ', 'sK', 'sA',
        ];
        
    }
    
    shuffle() {
        let currentIndex = this.pool.length;
        
        // While there remain elements to shuffle...
        while (currentIndex != 0) {
            
            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            
            // And swap it with the current element.
            [this.pool[currentIndex], this.pool[randomIndex]] = [this.pool[randomIndex], this.pool[currentIndex]];
        }
    }
    
    firstDeal(players: Player[]) {
        players[0].addCards(this.pool.slice(0, 5));
        players[1].addCards(this.pool.slice(5, 10));
        players[2].addCards(this.pool.slice(10, 15));
        players[3].addCards(this.pool.slice(15, 20));
    }
    
    secondDeal(players: Player[]) {
        players[0].addCards(this.pool.slice(20, 23));
        players[1].addCards(this.pool.slice(23, 26));
        players[2].addCards(this.pool.slice(26, 29));
        players[3].addCards(this.pool.slice(29, 32));
    }
}