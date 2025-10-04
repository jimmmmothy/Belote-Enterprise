export type CardProps = {
  suit: "clubs" | "diamonds" | "hearts" | "spades" | "back";
  rank: "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A"|"light"|"dark";
};

export type Move = {
  playerId: string,
  suit: string,
  rank: string
}

export type ReceiveCards = {
    myId: string,
    hand: {
        suit: string,
        rank: string
    }[],
    players: {
        id: string
    }[]
}

export type AvailableContracts = string[];

export type TableProps = {
    myId: string,
    hand: {
        suit: string,
        rank: string
    }[],
    players: {
        id: string
    }[],
    contracts?: AvailableContracts,
    myTurn: boolean,
    onSelectContract: (playerId: string, contract: string) => void
}