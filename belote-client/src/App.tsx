import './App.css'
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';
import { useEffect, useState } from 'react';
import type { ReceiveCards, TableProps } from './types';
import { Table } from './Table';

const socket = io(SERVER_URL);
let playerId = sessionStorage.getItem("playerId");

socket.emit("register", playerId);

socket.on("assigned_id", (id) => {
  sessionStorage.setItem("playerId", id);
});

function App() {
  const [tableProps, setTableProps] = useState<TableProps>({myId: "", hand: [], players: [], myTurn: false, onSelectContract: () => {}});

  useEffect(() => {
    socket.on("send_cards", (data: ReceiveCards) => {
        setTableProps(prev => ({
          ...prev,
          ...data
        }));
    });

    socket.on("contract_phase", (available) => {
      setTableProps(prev => ({
        ...prev,
        myTurn: true,
        contracts: available
      }));
    });

    socket.on("contract_done", (data) => {
      console.log("Contract results:", data);
    });

    return () => {
      socket.off("send_cards");
      socket.off("contract_phase");
    };
  }, []);

  let onSelectContract = (playerId: string, contract: string) => {
    socket.emit("select_contract", { playerId, contract });
    setTableProps(prev => ({
      ...prev,
      myTurn: false
    }));
  }

  return (
    <div className='game-container'>
      <Table myTurn={tableProps.myTurn}
       contracts={tableProps.contracts}
       myId={tableProps.myId} 
       hand={tableProps.hand} 
       players={tableProps.players} 
       onSelectContract={onSelectContract}></Table>
    </div>
  )
}

export default App;
