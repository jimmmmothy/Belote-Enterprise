import { describe, it, expect, beforeEach } from "vitest";
import Game from "../src/game/game"
import Player from "../src/game/player"

describe("Game Initialization", () => {
  it("should initialize game with correct default state", () => {
    const game = new Game("test-game");

    const state = game.state;

    expect(state.id).toBe("test-game");
    expect(state.phase).toBe("BIDDING");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.players.length).toBe(0);
    expect(state.dealer).toBeInstanceOf(Object);
    expect(state.bids).toBeInstanceOf(Map);
    expect(state.bids.size).toBe(0);
    expect(Array.isArray(state.currentTrick)).toBe(true);
    expect(state.currentTrick.length).toBe(0);
    expect(state.score).toEqual({ team0: 0, team1: 0 });
  });
});

describe("Player Management", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game("g1");
  });

  it("should add up to 4 players", () => {
    const p1 = new Player("p1", "team0");
    const p2 = new Player("p2", "team0");
    const p3 = new Player("p3", "team1");
    const p4 = new Player("p4", "team1");

    expect(game.addPlayer(p1)).toBe(1);
    expect(game.addPlayer(p2)).toBe(2);
    expect(game.addPlayer(p3)).toBe(3);
    expect(game.addPlayer(p4)).toBe(4);

    expect(() => game.addPlayer(new Player("p5", "team0"))).toThrow("Game is full");
  });

  it("should reassign client ID when reconnecting", () => {
    const p = new Player("p1", "team0", "socketA");
    game.addPlayer(p);

    game.reassignClientId("p1", "socketB");

    expect(game.state.players[0].socketId).toBe("socketB");
  });
});

describe("Game Start", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game("g2");
    game.addPlayer(new Player("p1", "team0"));
    game.addPlayer(new Player("p2", "team0"));
    game.addPlayer(new Player("p3", "team1"));
    game.addPlayer(new Player("p4", "team1"));
  });

  it("should throw if starting with less than 4 players", () => {
    const game2 = new Game("gX");
    expect(() => game2.start()).toThrow();
  });

  it("should deal correct number of cards to each player on start()", () => {
    game.start();

    const players = game.state.players;

    for (const p of players) {
      expect(p.cards.length).toBe(5);
    }
  });
});

describe("Bidding Phase", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game("g3");
    game.addPlayer(new Player("p1", "team0"));
    game.addPlayer(new Player("p2", "team0"));
    game.addPlayer(new Player("p3", "team1"));
    game.addPlayer(new Player("p4", "team1"));
    game.start();
  });

  it("should only accept bids during the bidding phase", () => {
    expect(game.state.phase).toBe("BIDDING");

    expect(() =>
      game.handleBidInput({ playerId: "p1", contract: "Clubs" })
    ).not.toThrow();
  });

  it("should reject move input during bidding phase", () => {
    expect(() =>
      game.handleMoveInput({
        playerId: "p1",
        card: { suit: "clubs", rank: "7" }
      } as any)
    ).toThrow("Not in playing phase");
  });
});