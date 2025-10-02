import './App.css'
import { io } from 'socket.io-client';
import { SERVER_URL } from './Config';
import { useEffect, useState } from 'react';
import { Card } from './Card';
import type { CardProps, Move } from './types';

const socket = io(SERVER_URL);
let playerId = sessionStorage.getItem("playerId");

socket.emit("register", playerId);

socket.on("assignedId", (id) => {
  sessionStorage.setItem("playerId", id);
});

function App() {
  const [eventStack, setEventStack] = useState<Move[]>([]);
  const [cards, setCards] = useState<string[]>([]);

  useEffect(() => {
    socket.on("movePlayed", (data : Move) => {
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

  const playMove = (card: {suit: string, rank: string}) => {
    let move: Move = {
      playerId: sessionStorage.getItem("playerId")!,
      suit: card.suit,
      rank: card.rank
    }

    setCards((prev) => [...prev].filter(c => !(c[0] === card.suit && c.substring(1) === card.rank)));

    socket.emit("playMove", move);
  };

  return (
  <>
    <div>{eventStack.map((value, key) => 
    <p key={key}>
      {value.playerId} played {value.rank} of {value.suit}
    </p>)}
    </div>
    {cards.map((value, key) => (
      <Card
        key={key}
        suit={value.charAt(0) as CardProps["suit"]}
        rank={value.substring(1) as CardProps["rank"]}
        onPlay={playMove}
      />
    ))}
  </>
  )
}

export default App;
