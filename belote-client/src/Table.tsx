import { Card } from "./Card.tsx";
import "./Table.css";
import type { CardProps, TableProps } from "./types.ts";

export function Table({ myId, hand, players }: TableProps) {
  // Ensure "me" is always at index 0
  const myIndex = players.findIndex((p) => p.id === myId);
  const ordered = [...players.slice(myIndex), ...players.slice(0, myIndex)];

  // Fill seat positions consistently: bottom = me, others clockwise
  const [_bottom, right, top, left] = ordered;

  return (
    <div className="table">
      {/* Top player */}
      <div className="row top">
        {top && hand.length > 0 &&
          Array.from({ length: hand.length }).map((_, i) => (
            <Card
              key={`top-${i}`}
              suit={"back"}
              rank={"light"}
              onPlay={() => {}}
            />
          ))}
      </div>

      <div className="middle">
        {/* Left player */}
        <div className="col left">
          {left &&
            Array.from({ length: hand.length }).map((_, i) => (
              <Card
                key={`left-${i}`}
                suit={"back"}
                rank={"light"}
                onPlay={() => {}}
              />
            ))}
        </div>

        <div className="center-space"></div>

        {/* Right player */}
        <div className="col right">
          {right &&
            Array.from({ length: hand.length }).map((_, i) => (
              <Card
                key={`right-${i}`}
                suit={"back"}
                rank={"light"}
                onPlay={() => {}}
              />
            ))}
        </div>
      </div>

      {/* Bottom player (me) */}
      <div className="row bottom">
        {hand.map((c, i) => (
          <Card
            key={`me-${i}`}
            suit={c.suit as CardProps["suit"]}
            rank={c.rank as CardProps["rank"]}
            onPlay={() => {
              console.log("PLAYED", c);
            }}
          />
        ))}
      </div>
    </div>
  );
}

