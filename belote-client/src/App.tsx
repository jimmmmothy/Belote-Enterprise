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
  const [tableProps, setTableProps] = useState<TableProps>({myId: "", hand: [], players: []});

  useEffect(() => {
    socket.on("send_cards", (data: ReceiveCards) => {
      setTableProps(data);
    });

    socket.on("contract_phase", () => {
      console.log("its contract time");
    });

    return () => {
      socket.off("send_cards");
      socket.off("contract_phase");
    };
  }, []);

  return (
    <div className='game-container'>
      <Table myId={tableProps.myId} hand={tableProps.hand} players={tableProps.players}></Table>
    </div>
  )
}

export default App;
