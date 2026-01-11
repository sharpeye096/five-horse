import { Piece, NodeId } from '../game/types';

export interface AnimationState {
    step: 'highlight' | 'moving' | 'landed';
    from: NodeId;
    to: NodeId;
    piece: Piece;
}
