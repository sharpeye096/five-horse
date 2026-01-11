import { BOARD_NODES, areCollinear } from './board-config';
import { GameState, Move, NodeId, Player, Piece } from './types';

function getPieceAt(pieces: Record<string, Piece>, id: NodeId): Piece | undefined {
    return pieces[id];
}

function getOpponent(p: Player): Player {
    return p === 'black' ? 'white' : 'black';
}

export function getValidMoves(state: GameState, fromId: NodeId): Move[] {
    const piece = state.pieces[fromId];
    if (!piece || piece.player !== state.currentPlayer) return [];

    const moves: Move[] = [];
    const startNode = BOARD_NODES[fromId];

    // 1. Calculate Destinations
    const potentialDestinations: NodeId[] = [];

    startNode.neighbors.forEach(neighborId => {
        // Immediate Neighbor
        if (!state.pieces[neighborId]) {
            potentialDestinations.push(neighborId);

            // Sliding: Continue in same direction
            let currentId = neighborId;
            let prevId = fromId;

            for (let i = 0; i < 10; i++) {
                const currNode = BOARD_NODES[currentId];
                let nextInLine: NodeId | null = null;

                for (const nextId of currNode.neighbors) {
                    if (nextId === prevId) continue;
                    if (areCollinear(prevId, currentId, nextId)) {
                        nextInLine = nextId;
                        break;
                    }
                }

                if (nextInLine && !state.pieces[nextInLine]) {
                    potentialDestinations.push(nextInLine);
                    prevId = currentId;
                    currentId = nextInLine;
                } else {
                    break;
                }
            }
        }
    });

    // 2. For each destination, calculate Recursive Captures
    potentialDestinations.forEach(toId => {
        const { allCaptures, steps } = calculateRecursiveCaptures(state, fromId, toId);
        moves.push({
            from: fromId,
            to: toId,
            captures: allCaptures,
            captureSteps: steps
        });
    });

    return moves;
}

// Recursive Capture Logic
function calculateRecursiveCaptures(initialState: GameState, from: NodeId, to: NodeId): { allCaptures: NodeId[], steps: NodeId[][] } {
    const currentPlayer = initialState.currentPlayer;
    const opponent = getOpponent(currentPlayer);

    // Virtual Board State
    const pieces = { ...initialState.pieces };

    // Execute Move on Virtual Board
    const mover = pieces[from];
    delete pieces[from];
    pieces[to] = mover;

    // Queue of nodes that triggered a change (Active Checkers)
    // Initially, the piece that moved.
    let activeNodes: NodeId[] = [to];
    const totalCaptures: NodeId[] = [];
    const steps: NodeId[][] = []; // Capture groups
    const processedNodes = new Set<NodeId>();

    while (activeNodes.length > 0) {
        const nextBatch: NodeId[] = []; // Collect flips for next iteration
        const currentStepFlips: NodeId[] = []; // Flips in this step

        for (const centerId of activeNodes) {
            if (processedNodes.has(centerId)) continue;
            processedNodes.add(centerId);

            // Check Picks & Clamps for this center node
            const pickTargets = checkPick(pieces, centerId, currentPlayer);
            let flipped: NodeId[] = [];

            if (pickTargets.length > 0) {
                flipped = pickTargets;
            } else {
                const clampTargets = checkClamp(pieces, centerId, currentPlayer);
                flipped = clampTargets;
            }

            // Apply Flips
            if (flipped.length > 0) {
                flipped.forEach(fid => {
                    // Check if not already captured
                    if (!totalCaptures.includes(fid)) {
                        totalCaptures.push(fid);
                        currentStepFlips.push(fid);

                        // Flip Color in Virtual State
                        if (pieces[fid]) {
                            pieces[fid] = { ...pieces[fid], player: currentPlayer };
                            // The flipped piece becomes active for next pass
                            nextBatch.push(fid);
                        }
                    }
                });
            }
        }

        if (currentStepFlips.length > 0) {
            steps.push(currentStepFlips);
        }

        activeNodes = nextBatch;
    }

    return { allCaptures: totalCaptures, steps };
}

// Check "Pick": Opp - Center - Opp
function checkPick(pieces: Record<string, Piece>, center: NodeId, me: Player): NodeId[] {
    const centerNode = BOARD_NODES[center];
    if (!centerNode) return [];
    const opp = getOpponent(me);
    const result: NodeId[] = [];
    const visitedPairs = new Set<string>();

    for (const n1 of centerNode.neighbors) {
        for (const n2 of centerNode.neighbors) {
            if (n1 === n2) continue;
            const key = [n1, n2].sort().join('-');
            if (visitedPairs.has(key)) continue;
            visitedPairs.add(key);

            if (areCollinear(n1, center, n2)) {
                // Check if both neighbors are Opponent
                const p1 = pieces[n1];
                const p2 = pieces[n2];
                if (p1?.player === opp && p2?.player === opp) {
                    result.push(n1, n2);
                }
            }
        }
    }
    return result;
}

// Check "Clamp": Center - Opp - Me
function checkClamp(pieces: Record<string, Piece>, center: NodeId, me: Player): NodeId[] {
    const centerNode = BOARD_NODES[center];
    if (!centerNode) return [];
    const opp = getOpponent(me);
    const result: NodeId[] = [];

    for (const n1 of centerNode.neighbors) {
        // n1 must be Opponent
        if (pieces[n1]?.player === opp) {
            // Find n2 such that Center - n1 - n2 is line
            // n2 is neighbor of n1
            const n1Node = BOARD_NODES[n1];
            for (const n2 of n1Node.neighbors) {
                if (n2 === center) continue;
                if (areCollinear(center, n1, n2)) {
                    // n2 must be Me
                    if (pieces[n2]?.player === me) {
                        result.push(n1);
                    }
                }
            }
        }
    }
    return result;
}
