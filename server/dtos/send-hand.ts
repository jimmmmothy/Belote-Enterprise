export type SendHand = {
    myId: string,
    hand: {
        suit: string,
        rank: string
    }[],
    players: {
        id: string
    }[]
}