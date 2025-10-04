export type SendCards = {
    myId: string,
    hand: {
        suit: string,
        rank: string
    }[],
    players: {
        id: string
    }[]
}