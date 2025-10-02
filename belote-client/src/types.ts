export type CardProps = {
  suit: "c" | "d" | "h" | "s" | "back";
  rank: "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A"|"light"|"dark";
};

export type Move = {
  playerId: string,
  suit: string,
  rank: string
}