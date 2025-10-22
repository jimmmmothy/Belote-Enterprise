import Player from "./player";

export default class Dealer {
    pool: {suit: string, rank: string}[] = [];

    constructor() {
        this.init();
        this.shuffle();
    }
    
    init() {
        this.pool = [
            {suit: 'clubs', rank: '7'}, 
            {suit: 'clubs', rank: '8'}, 
            {suit: 'clubs', rank: '9'}, 
            {suit: 'clubs', rank: '10'}, 
            {suit: 'clubs', rank: 'J'},
            {suit: 'clubs', rank: 'Q'}, 
            {suit: 'clubs', rank: 'K'}, 
            {suit: 'clubs', rank: 'A'}, 
            
            {suit: 'diamonds', rank: '7'}, 
            {suit: 'diamonds', rank: '8'}, 
            {suit: 'diamonds', rank: '9'}, 
            {suit: 'diamonds', rank: '10'}, 
            {suit: 'diamonds', rank: 'J'},
            {suit: 'diamonds', rank: 'Q'}, 
            {suit: 'diamonds', rank: 'K'}, 
            {suit: 'diamonds', rank: 'A'}, 

            {suit: 'hearts', rank: '7'}, 
            {suit: 'hearts', rank: '8'}, 
            {suit: 'hearts', rank: '9'}, 
            {suit: 'hearts', rank: '10'}, 
            {suit: 'hearts', rank: 'J'},
            {suit: 'hearts', rank: 'Q'}, 
            {suit: 'hearts', rank: 'K'}, 
            {suit: 'hearts', rank: 'A'}, 

            {suit: 'spades', rank: '7'}, 
            {suit: 'spades', rank: '8'}, 
            {suit: 'spades', rank: '9'}, 
            {suit: 'spades', rank: '10'}, 
            {suit: 'spades', rank: 'J'},
            {suit: 'spades', rank: 'Q'}, 
            {suit: 'spades', rank: 'K'}, 
            {suit: 'spades', rank: 'A'}, 
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