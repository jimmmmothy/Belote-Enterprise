import './App.css'
import { io } from 'socket.io-client';
import { SERVER_URL } from './Config';
import { useEffect, useState } from 'react';
import { Card } from './Card';
import type { CardProps } from './types';

const socket = io(SERVER_URL);
let playerId = sessionStorage.getItem("playerId");

socket.emit("register", playerId);

socket.on("assignedId", (id) => {
  sessionStorage.setItem("playerId", id);
});

function App() {
  const [eventStack, setEventStack] = useState<{player: string, move: string}[]>([]);
  const [cards, setCards] = useState<string[]>([]);

  useEffect(() => {
    socket.on("movePlayed", (data : {player: string, move: string}) => {
      setEventStack((prev) => [...prev, data]);
    });

    socket.on("sendCards", (data: string[]) => {
      setCards(data);
    })

    return () => {
      socket.off("movePlayed");
      socket.off("sendCards");
    };
  }, []);

  const playMove = () => {
    socket.emit("playMove", "Ace of Spades");
  };

  return (
  <>
    <button onClick={playMove}>Play Move</button>
    <div>{eventStack.map((value, key) => 
    <p key={key}>
      {value.player} played {value.move}
    </p>)}
    </div>
    {cards.map((value, key) => (
      <Card
        key={key}
        suit={value.charAt(0) as CardProps["suit"]}
        rank={value.substring(1) as CardProps["rank"]}
      />
    ))}
  </>
  )
}

export default App;
