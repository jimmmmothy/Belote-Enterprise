import './Card.css'
import type { CardProps } from './types';
import { motion, useMotionValue, useTransform } from "framer-motion";

const cardImages = import.meta.glob("./assets/*.png", { eager: true });

export function Card({ suit, rank, onPlay }: CardProps & { onPlay: (card: { suit: string, rank: string }) => void }) {
  const key = `./assets/${suit}_${rank}.png`;
  const imgSrc = (cardImages[key] as { default: string }).default;

  // Track drag movement
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Make card tilt a little based on horizontal drag
  const rotate = useTransform(x, [-150, 0, 150], [12, 0, -12]);

  return (
    <motion.img
      className="card"
      src={imgSrc}
      alt={`${rank} of ${suit}`}
      drag
      dragElastic={0.2}
      style={{ x, y, rotate }}
      onDoubleClick={() => onPlay({ suit, rank })}
      onDragEnd={(_event, info) => {
        // Example: play card if dragged above some Y threshold (e.g. play area at top)
        if (info.point.y < 200) {
          onPlay({ suit, rank });
        }
      }}
    />
  );
}
