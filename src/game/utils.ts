import { GameState, Piece } from './types';
import { BOARD_NODES } from './board-config';

export function getInitialState(): GameState {
    const pieces: Record<string, Piece> = {};

    // Initial positions
    // User says: "Pieces initially located at top and bottom, 5 each."
    // Diagram shows:
    // Black at top row (r=0, c=0..4)
    // White at bottom row (r=4, c=0..4)
    // Or vice versa. Let's assume Black Top, White Bottom.

    // Row 0
    for (let c = 0; c < 5; c++) {
        const id = `0,${c}`;
        pieces[id] = { id: `b-${c}`, player: 'black' };
    }

    // Row 4
    for (let c = 0; c < 5; c++) {
        const id = `4,${c}`;
        pieces[id] = { id: `w-${c}`, player: 'white' };
    }

    return {
        pieces,
        currentPlayer: 'black', // Usually black first
        winner: null,
        history: [],
        turnCount: 0
    };
}

export function checkWinCondition(state: GameState): 'black' | 'white' | null {
    // 1. Capture All
    const blackCount = Object.values(state.pieces).filter(p => p.player === 'black').length;
    const whiteCount = Object.values(state.pieces).filter(p => p.player === 'white').length;

    if (blackCount === 0) return 'white';
    if (whiteCount === 0) return 'black';

    // 2. Drive all to Maoce
    // "Drive opponent's pieces ALL to Maoce".
    // Check if ALL of a player's pieces are in Maoce nodes.
    const maoceIds = Object.values(BOARD_NODES).filter(n => n.isMaoce).map(n => n.id);

    const isAllInMaoce = (player: 'black' | 'white') => {
        const playerPieces = Object.entries(state.pieces)
            .filter(([_, p]) => p.player === player);
        if (playerPieces.length === 0) return false; // Handled by count check
        return playerPieces.every(([nodeId, _]) => maoceIds.includes(nodeId));
    };

    if (isAllInMaoce('black')) return 'white'; // Black trapped = White wins
    if (isAllInMaoce('white')) return 'black';

    return null;
}
