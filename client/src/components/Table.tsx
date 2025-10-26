import { useRef } from "react";
import { Card } from "./Card.tsx";
import "./Table.css";
import type { CardProps, Move, TableProps } from "../types.ts";

export function Table({ myId, hand, players, contracts, trick, myTurn, onSelectContract, onPlayMove }: TableProps & {
  onSelectContract: (playerId: string, contract: string) => void,
  onPlayMove: (move: Move) => void
}) {
  const playAreaRef = useRef<HTMLDivElement>(null);

  const handlePlay = (card: { suit: string; rank: string }) => {
    onPlayMove({playerId: myId, suit: card.suit, rank: card.rank });
  };

  const myIndex = players.findIndex((p) => p.id === myId);
  const ordered = [...players.slice(myIndex), ...players.slice(0, myIndex)];
  const [_bottom, right, top, left] = ordered;

  return (
    <div className="table">
      <div className="row top">
        {top && hand.length > 0 &&
          Array.from({ length: top.handLength }).map((_, i) => (
            <Card key={`top-${i}`} suit={"back"} rank={"light"} onPlay={() => {}} playAreaRef={playAreaRef} isPlayable={false} />
          ))}
      </div>

      <div className="middle">
        <div className="col left">
          {left && Array.from({ length: left.handLength }).map((_, i) => (
            <Card key={`left-${i}`} suit={"back"} rank={"light"} onPlay={() => {}} playAreaRef={playAreaRef} isPlayable={false} />
          ))}
        </div>

        <div className="center-space" ref={playAreaRef}>
          {trick?.map((c, i) => {
            const playerPos = ordered.findIndex(p => p.id === c.playerId);
            const posClass = ["trick-bottom", "trick-right", "trick-top", "trick-left"][playerPos];
            return (
              <div className={`trick-card ${posClass}`}>
                <Card
                  key={`middle-${i}`}
                  suit={c.suit as CardProps["suit"]}
                  rank={c.rank as CardProps["rank"]}
                  onPlay={() => {}}
                  playAreaRef={playAreaRef}
                  isPlayable={false}
                  />
              </div>
            );
          })}
        </div>

        <div className="col right">
          {right && Array.from({ length: right.handLength }).map((_, i) => (
            <Card key={`right-${i}`} suit={"back"} rank={"light"} onPlay={() => {}} playAreaRef={playAreaRef} isPlayable={false} />
          ))}
        </div>
      </div>

      <div className="row bottom">
        {contracts && myTurn && (
          <div className="contracts">
            {contracts.map((c) => (
              <button key={c} onClick={() => onSelectContract(myId, c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="hand">
          {hand.map((c) => (
            <div className="card" key={`${c.suit}-${c.rank}`}>
              <Card
                suit={c.suit as CardProps["suit"]}
                rank={c.rank as CardProps["rank"]}
                onPlay={handlePlay}
                playAreaRef={playAreaRef}
                isPlayable={myTurn && !contracts} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}