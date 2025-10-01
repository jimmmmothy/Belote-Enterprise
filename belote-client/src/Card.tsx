import './Card.css'
import type { CardProps } from './types';

const cardImages = import.meta.glob("./assets/*.png", { eager: true });

export function Card({ suit, rank }: CardProps) {
  const key = `./assets/${suit}_${rank}.png`;
  const imgSrc = (cardImages[key] as { default: string }).default;

  return <img className='card' src={imgSrc} alt={`${rank} of ${suit}`} />;
}