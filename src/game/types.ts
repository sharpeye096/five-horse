export type Player = 'black' | 'white';

export interface Piece {
  id: string; // e.g., 'p-black-1'
  player: Player;
}

export type NodeId = string; // Coordinate string "r,c" or "maoce-config"

export interface BoardNode {
  id: NodeId;
  x: number; // For rendering (relative or absolute)
  y: number;
  neighbors: NodeId[];
  isMaoce?: boolean; // If true, this node is part of the trap
}

export interface GameState {
  pieces: Record<NodeId, Piece>; // Map node ID to occupied piece
  currentPlayer: Player;
  winner: Player | null;
  history: GameStateSnapshot[];
  turnCount: number;
}

export interface GameStateSnapshot {
  pieces: Record<NodeId, Piece>;
  currentPlayer: Player;
}

export interface Move {
  from: NodeId;
  to: NodeId;
  captures?: NodeId[]; // Pieces captured during this move
  captureSteps?: NodeId[][]; // List of capture groups for sequential animation
}
