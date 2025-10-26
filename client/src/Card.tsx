import './Card.css'
import type { CardProps } from './types';
import { motion, useMotionValue, animate } from "framer-motion";
import { useState } from 'react';

const cardImages = import.meta.glob("./assets/*.png", { eager: true });

export function Card({
  suit,
  rank,
  onPlay,
  playAreaRef,
  isPlayable = true,
}: CardProps & {
  onPlay: (card: { suit: string; rank: string }) => void;
  playAreaRef?: React.RefObject<HTMLDivElement | null>;
  isPlayable?: boolean;
}) {
  const key = `./assets/${suit}_${rank}.png`;
  const imgSrc = (cardImages[key] as { default: string }).default;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePlay = () => {
    if (!isPlayable || isAnimating) return;

    if (!playAreaRef?.current) {
      onPlay({ suit, rank });
      return;
    }

    const cardRect = (document.querySelector(`[data-card="${suit}-${rank}"]`) as HTMLElement)?.getBoundingClientRect();
    const areaRect = playAreaRef.current.getBoundingClientRect();
    if (!cardRect || !areaRect) return;

    const targetX = areaRect.left + areaRect.width / 2 - (cardRect.left + cardRect.width / 2);
    const targetY = areaRect.top + areaRect.height / 2 - (cardRect.top + cardRect.height / 2);

    setIsAnimating(true);

    // Animate card to center
    const controlsX = animate(x, targetX, { type: "spring", stiffness: 150, damping: 20 });
    const controlsY = animate(y, targetY, {
      type: "spring",
      stiffness: 150,
      damping: 20,
      onComplete: () => {
        setIsAnimating(false);
        onPlay({ suit, rank });
      },
    });

    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  };

  const resetPosition = () => {
    if (!isPlayable) return;
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
  };

  return (
    <motion.img
      className="card"
      src={imgSrc}
      alt={`${rank} of ${suit}`}
      data-card={`${suit}-${rank}`}
      drag={isPlayable && !isAnimating}
      dragElastic={0.2}
      dragMomentum={false}
      style={{
        x,
        y,
        zIndex: isAnimating ? 1000 : undefined,
        cursor: isPlayable ? "grab" : "default",
        opacity: isPlayable ? 1 : 0.8,
        pointerEvents: isPlayable ? "auto" : "none",
      }}
      onDoubleClick={handlePlay}
      onDragEnd={(_event, info) => {
        if (!isPlayable) return;
        if (info.point.y < 200) handlePlay();
        else resetPosition();
      }}
    />
  );
}
