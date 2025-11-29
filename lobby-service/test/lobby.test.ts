import { describe, it, expect, beforeEach } from 'vitest';
import { Lobby } from '../src/lobby/lobby';
import type { Player } from '../src/dtos/player';

describe('Lobby', () => {
  let lobby: Lobby;

  beforeEach(() => {
    lobby = new Lobby('L1');
  });

  it('should initialize with correct id and empty players list', () => {
    expect(lobby.id).toBe('L1');
    expect(lobby.players.length).toBe(0);
    expect(lobby.maxPlayers).toBe(4);
  });

  it('should add players until maxPlayers is reached', () => {
    const p1 : Player = { id: 'p1', name: 'p1', socketId: 's1' };
    const p2 : Player = { id: 'p2', name: 'p2', socketId: 's2' };
    const p3 : Player = { id: 'p3', name: 'p3', socketId: 's3' };
    const p4 : Player = { id: 'p4', name: 'p4', socketId: 's4' };

    expect(lobby.addPlayer(p1)).toBe(false);
    expect(lobby.addPlayer(p2)).toBe(false);
    expect(lobby.addPlayer(p3)).toBe(false);

    // return true when lobby just became full
    expect(lobby.addPlayer(p4)).toBe(true);

    expect(lobby.players.length).toBe(4);
  });

  it('should reject adding more than 4 players', () => {
    lobby.addPlayer({ id: 'p1', name: 'p1', socketId: 's1' });
    lobby.addPlayer({ id: 'p2', name: 'p2', socketId: 's2' });
    lobby.addPlayer({ id: 'p3', name: 'p3', socketId: 's3' });
    lobby.addPlayer({ id: 'p4', name: 'p4', socketId: 's4' });

    const overflow = lobby.addPlayer({ id: 'p5', name: 'p5', socketId: 's5' });

    expect(overflow).toBe(false);
    expect(lobby.players.length).toBe(4);
  });

  it('should remove a player by id', () => {
    const p1 : Player = { id: 'p1', name: 'p1', socketId: 's1' };
    const p2 : Player = { id: 'p2', name: 'p2', socketId: 's2' };

    lobby.addPlayer(p1);
    lobby.addPlayer(p2);

    lobby.removePlayer(p1);

    expect(lobby.players.length).toBe(1);
    expect(lobby.players[0].id).toBe('p2');
  });
});
