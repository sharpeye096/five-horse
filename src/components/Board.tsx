import React, { useEffect, useState } from 'react';
import { BOARD_NODES } from '../game/board-config';
import { GameState, Move, NodeId } from '../game/types';
import { AnimationState } from './animation-types';

interface BoardProps {
    gameState: GameState;
    validMoves: Move[];
    selectedNode: NodeId | null;
    onNodeClick: (id: NodeId) => void;
    animation: AnimationState | null;
}

export default function Board({ gameState, validMoves, selectedNode, onNodeClick, animation }: BoardProps) {
    // SVG ViewBox Configuration
    // Bounding Box of Nodes:
    // X: 0 (Col 0) to 600 (Maoce Right)
    // Y: 0 (Row 0) to 400 (Row 4)
    // We add padding to fit pieces (radius ~20-25) and strokes.
    // Padding: 50 units on all sides.
    const minX = -60;
    const minY = -60;
    const width = 800; // 600 + 100 padding + extra
    const height = 550; // 400 + 100 padding + extra

    const viewBox = `${minX} ${minY} ${width} ${height}`;
    const [animPos, setAnimPos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (animation?.step === 'moving') {
            const fromNode = BOARD_NODES[animation.from];
            setAnimPos({ x: fromNode.x, y: fromNode.y });
            requestAnimationFrame(() => {
                const toNode = BOARD_NODES[animation.to];
                setAnimPos({ x: toNode.x, y: toNode.y });
            });
        } else if (animation?.step === 'landed') {
            const toNode = BOARD_NODES[animation.to];
            setAnimPos({ x: toNode.x, y: toNode.y });
        } else {
            setAnimPos(null);
        }
    }, [animation]);

    return (
        <div className="relative bg-amber-100 rounded shadow-2xl border-4 border-amber-900 select-none p-4">
            <svg
                viewBox={viewBox}
                width="1000" // Increased base width
                height="700"
                className="w-full h-auto max-w-[1000px]" // Allow larger max width
                style={{ maxHeight: '85vh' }}
            >
                {/* 1. Grid Lines */}
                <g className="stroke-stone-900" strokeWidth="2">
                    {Object.values(BOARD_NODES).map(node => (
                        <g key={`lines-${node.id}`}>
                            {node.neighbors.map(nId => {
                                const neighbor = BOARD_NODES[nId];
                                // Draw only if neighbor ID > node ID to avoid duplicates (undirected graph)
                                // Or use a set. Since key logic is messy in map, duplicate lines are harmless efficiently,
                                // but let's try to be clean.
                                if (node.id < neighbor.id) {
                                    return (
                                        <line
                                            key={`${node.id}-${neighbor.id}`}
                                            x1={node.x}
                                            y1={node.y}
                                            x2={neighbor.x}
                                            y2={neighbor.y}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </g>
                    ))}
                </g>

                {/* 2. Nodes / Intersections / Pieces */}
                {Object.values(BOARD_NODES).map(node => {
                    const piece = gameState.pieces[node.id];
                    // Hide piece if it's the one moving OR landed (it's legally at 'from' but visually elsewhere)
                    const isHiddenForAnim = (animation?.step === 'moving' || animation?.step === 'landed') && animation.from === node.id;

                    const isSelected = selectedNode === node.id;
                    const isValidMove = validMoves.some(m => m.to === node.id);
                    const isTarget = isValidMove;

                    // Highlight from AI
                    const isAiHighlight = animation?.step === 'highlight' && animation.from === node.id;

                    // Determine Piece Color
                    let pieceFill = piece?.player === 'black' ? '#1c1917' : '#f5f5f4';
                    let pieceStroke = piece?.player === 'black' ? '#44403c' : '#d6d3d1';

                    if (isAiHighlight) {
                        pieceFill = '#ef4444'; // Red-500
                        pieceStroke = '#b91c1c'; // Red-700
                    }

                    return (
                        <g
                            key={node.id}
                            onClick={() => onNodeClick(node.id)}
                            className="cursor-pointer transition-all duration-200"
                            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                        >
                            {/* Hit Area (Invisible Circle for easier clicking) */}
                            <circle cx={node.x} cy={node.y} r="25" fill="transparent" />

                            {/* Grid Point (Empty State) */}
                            {!piece && !isTarget && !isHiddenForAnim && (
                                <circle cx={node.x} cy={node.y} r="4" fill="#a8a29e" /> // stone-400
                            )}

                            {/* Valid Move Highlight */}
                            {isTarget && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="15"
                                    className="fill-green-500/50 animate-pulse"
                                />
                            )}

                            {/* Piece */}
                            {piece && !isHiddenForAnim && (
                                <g>
                                    {/* Piece Shadow/Border */}
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="20"
                                        fill={pieceFill}
                                        stroke={pieceStroke}
                                        strokeWidth="2"
                                    />
                                    {/* Inner Detail */}
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r="15"
                                        fill="none"
                                        stroke={isAiHighlight ? '#fecaca' : (piece.player === 'black' ? '#57534e' : '#e7e5e4')}
                                        strokeWidth="1"
                                    />
                                    {/* Selection Ring */}
                                    {isSelected && (
                                        <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r="24"
                                            fill="none"
                                            stroke="#3b82f6" // blue-500
                                            strokeWidth="3"
                                            className="animate-pulse"
                                        />
                                    )}
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* 3. Animation Layer */}
                {animation && (animation.step === 'moving' || animation.step === 'landed') && animPos && (
                    <g className="transition-all ease-in-out" style={{
                        transform: `translate(${animPos.x}px, ${animPos.y}px)`,
                        transitionDuration: animation.step === 'moving' ? '1200ms' : '0ms' // Slow move, instant land clamp
                    }}>
                        {/* Render Moving Piece (Centered at 0,0 relative to group) */}
                        <circle
                            cx={0} cy={0} r="20"
                            fill={animation.piece.player === 'black' ? '#1c1917' : '#f5f5f4'}
                            stroke={animation.piece.player === 'black' ? '#44403c' : '#d6d3d1'}
                            strokeWidth="2"
                        />
                        <circle
                            cx={0} cy={0} r="15"
                            fill="none"
                            stroke={animation.piece.player === 'black' ? '#57534e' : '#e7e5e4'}
                            strokeWidth="1"
                        />
                    </g>
                )}
            </svg>
        </div>
    );
}
