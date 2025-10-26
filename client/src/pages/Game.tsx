import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import { SERVER_URL } from "../config";
import type { AvailableContracts, Move, ReceiveHand, TableProps } from "../types";
import { Table } from "../components/Table";

const socket = io(SERVER_URL);

export default function GamePage() {
  const [tableProps, setTableProps] = useState<TableProps>({ myId: "", hand: [], players: [], myTurn: false });
  const playerId = sessionStorage.getItem("playerId");
  const lobbyId = sessionStorage.getItem("lobbyId");

  useEffect(() => {
    socket.emit("register", playerId);

    socket.on("assigned_id", (id) => {
      sessionStorage.setItem("playerId", id);
    });

    socket.on("send_cards", (data: ReceiveHand) => setTableProps((prev) => ({ ...prev, ...data })));
    socket.on("send_trick", (trick: Move[]) => setTableProps((prev) => ({ ...prev, trick })));
    socket.on("bidding_turn", (available: AvailableContracts) => setTableProps((prev) => ({ ...prev, myTurn: true, contracts: available })));
    socket.on("playing_turn", () => setTableProps((prev) => ({ ...prev, myTurn: true })));
    socket.on("move_played", (move: Move) =>
      setTableProps((prev) => ({
        ...prev,
        trick: [...(prev.trick ?? []), move],
        players: prev.players.map((p) =>
          p.id === move.playerId ? { ...p, handLength: Math.max(0, p.handLength - 1) } : p
        ),
        hand:
          move.playerId === sessionStorage.getItem("playerId")
            ? prev.hand.filter((card) => !(card.suit === move.suit && card.rank === move.rank))
            : prev.hand,
      }))
    );

    socket.on("trick_finished", () => setTableProps((prev) => ({ ...prev, trick: [] })));

    return () => {
      socket.off();
    };
  }, [playerId, lobbyId]);

  const selectContract = (playerId: string, contract: string) => {
    socket.emit("select_contract", { playerId, contract });
    setTableProps((prev) => ({ ...prev, myTurn: false, contracts: undefined }));
  };

  const playMove = (move: Move) => {
    socket.emit("play_move", move);
    setTableProps((prev) => ({ ...prev, myTurn: false }));
  };

  return (
    <div className="game-container">
      <Table
        myTurn={tableProps.myTurn}
        contracts={tableProps.contracts}
        myId={tableProps.myId}
        hand={tableProps.hand}
        players={tableProps.players}
        trick={tableProps.trick}
        onSelectContract={selectContract}
        onPlayMove={playMove}
      />
    </div>
  );
}
