import { GameState, Move, Player, NodeId } from './types';
import { getValidMoves } from './rules';
import { checkWinCondition } from './utils';
import { BOARD_NODES } from './board-config';

// Evaluation Scores
const SCORES = {
    WIN: 10000,
    LOSS: -10000,
    PIECE_VALUE: 100,
    MAOCE_PENALTY: -500, // Penalty for being in Maoce (risk of trap)
    MOBILITY_VALUE: 5
};

// Heuristic Evaluation
function evaluate(state: GameState, aiPlayer: Player): number {
    const winner = checkWinCondition(state);
    if (winner === aiPlayer) return SCORES.WIN;
    if (winner && winner !== aiPlayer) return SCORES.LOSS;

    let score = 0;
    const oppPlayer = aiPlayer === 'black' ? 'white' : 'black';

    // Piece Count & Position
    Object.entries(state.pieces).forEach(([nodeId, piece]) => {
        if (piece.player === aiPlayer) {
            score += SCORES.PIECE_VALUE;
            if (BOARD_NODES[nodeId].isMaoce) {
                score += SCORES.MAOCE_PENALTY; // Avoid Maoce unless winning
            }
        } else {
            score -= SCORES.PIECE_VALUE;
            if (BOARD_NODES[nodeId].isMaoce) {
                score -= SCORES.MAOCE_PENALTY; // Good to force opponent here
            }
        }
    });

    // Mobility (simplified: just count moves for current state if it's AI turn?)
    // Fully calculating moves for both sides is expensive in leaf eval.
    // Maybe just skip or do rough count.

    return score;
}

// Minimax with Alpha-Beta
export function getBestMove(state: GameState, depth: number, aiPlayer: Player): Move | null {
    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;

    const moves = getAllMoves(state, aiPlayer);

    // Sort moves? Captures first?
    moves.sort((a, b) => (b.captures?.length || 0) - (a.captures?.length || 0));

    for (const move of moves) {
        const nextState = simulateMove(state, move);
        const score = minimax(nextState, depth - 1, false, alpha, beta, aiPlayer);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function minimax(state: GameState, depth: number, isMaximizing: boolean, alpha: number, beta: number, aiPlayer: Player): number {
    const winner = checkWinCondition(state);
    if (winner || depth === 0) {
        return evaluate(state, aiPlayer);
    }

    const currPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'black' ? 'white' : 'black');
    const moves = getAllMoves(state, currPlayer);

    if (moves.length === 0) {
        // No moves usually implies loss if not handled, or just pass?
        // Rules didn't specify stalemate. Assume losing if cannot move and not stuck?
        // Or just return eval.
        return evaluate(state, aiPlayer);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextState = simulateMove(state, move);
            const evalScore = minimax(nextState, depth - 1, false, alpha, beta, aiPlayer);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nextState = simulateMove(state, move);
            const evalScore = minimax(nextState, depth - 1, true, alpha, beta, aiPlayer);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getAllMoves(state: GameState, player: Player): Move[] {
    // Find all pieces for player
    const moveList: Move[] = [];
    Object.entries(state.pieces).forEach(([nodeId, piece]) => {
        if (piece.player === player) {
            const moves = getValidMoves(state, nodeId);
            moveList.push(...moves);
        }
    });
    return moveList;
}

function simulateMove(state: GameState, move: Move): GameState {
    // Simplified simulation (no full history tracking needed for AI)
    const newPieces = { ...state.pieces };
    const movingPiece = newPieces[move.from];
    delete newPieces[move.from];
    newPieces[move.to] = movingPiece;

    if (move.captures) {
        move.captures.forEach(capId => {
            if (newPieces[capId]) {
                newPieces[capId] = { ...newPieces[capId], player: state.currentPlayer };
            }
        });
    }

    return {
        ...state,
        pieces: newPieces,
        currentPlayer: state.currentPlayer === 'black' ? 'white' : 'black',
        history: [], // Not needed for simulation
        turnCount: state.turnCount + 1,
        winner: null // Check logic handles this separately
    };
}
