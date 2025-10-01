import Player from "./player.ts";

let players : Player[] = [];

function get() : Player[] {
    return players;
}

function add(player : Player) {
    players.push(player);
}

function remove(playerId: string) {
    players = players.filter(p => p.playerId !== playerId);
}

function findByPlayerId(playerId: string): Player | undefined {
    return players.find(p => p.playerId === playerId);
}

function reassignClientId(playerId: string, clientId: string) {
    let player = players.find(p => p.playerId === playerId);
    
    if (player)
        player.socketId = clientId;
        
}

export default {
    get,
    add,
    remove,
    findByPlayerId,
    reassignClientId
}