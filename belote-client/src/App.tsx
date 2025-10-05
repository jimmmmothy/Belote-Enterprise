import './App.css'
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';
import { useEffect, useState } from 'react';
import type { AvailableContracts, Move, ReceiveHand, TableProps } from './types';
import { Table } from './Table';

const socket = io(SERVER_URL);
let playerId = sessionStorage.getItem("playerId");

socket.emit("register", playerId);

socket.on("assigned_id", (id) => {
  sessionStorage.setItem("playerId", id);
});

function App() {
  const [tableProps, setTableProps] = useState<TableProps>({myId: "", hand: [], players: [], myTurn: false});

  useEffect(() => {
    socket.on("send_hand", (data: ReceiveHand) => {
        setTableProps(prev => ({
          ...prev,
          ...data
        }));
    });

    socket.on("bidding_phase", (available: AvailableContracts) => {
      setTableProps(prev => ({
        ...prev,
        myTurn: true,
        contracts: available
      }));
    });

    socket.on("your_turn", () => {
      setTableProps(prev => ({
        ...prev,
        contracts: undefined,
        myTurn: true
      }));
    });

    socket.on("played_move", (data: { trick: Move[], nextPlayer: string }) => {
      setTableProps(prev => ({
        ...prev,
        trick: data.trick,
        myTurn: sessionStorage.getItem("playerId") === data.nextPlayer ? true : false
      }));
    });

    return () => {
      socket.off("send_hand");
      socket.off("bidding_phase");
      socket.off("your_turn");
      socket.off("played_move");
    };
  }, []);

  const selectContract = (playerId: string, contract: string) => {
    socket.emit("select_contract", { playerId, contract });
    setTableProps(prev => ({
      ...prev,
      myTurn: false
    }));
  };

  const playMove = (move: Move) => {
    socket.emit("play_move", move);
    setTableProps(prev => ({
      ...prev,
      myTurn: false
    }));
  };

  return (
    <div className='game-container'>
      <Table myTurn={tableProps.myTurn}
       contracts={tableProps.contracts}
       myId={tableProps.myId} 
       hand={tableProps.hand} 
       players={tableProps.players} 
       trick={tableProps.trick}
       onSelectContract={selectContract}
       onPlayMove={playMove}></Table>
    </div>
  )
}

export default App;
