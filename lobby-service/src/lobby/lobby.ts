import { Player } from '../dtos/player.js';

export class Lobby {
  id: string;
  players: Player[] = [];
  maxPlayers = 4;

  constructor(id: string) {
    this.id = id;
  }

  addPlayer(player: Player): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    this.players.push(player);
    return this.players.length === this.maxPlayers;
  }

  removePlayer(player: Player) {
    this.players = this.players.filter(p => p.id !== player.id);
  }
}