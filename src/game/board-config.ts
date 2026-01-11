import { BoardNode, NodeId } from './types';

// Grid size
const ROWS = 5;
const COLS = 5;

// Generate 5x5 Grid Nodes
const nodes: Record<NodeId, BoardNode> = {};

// Helper to get ID
const getId = (r: number, c: number) => `${r},${c}`;

// 1. Generate Grid Nodes (0,0 to 4,4)
for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        const id = getId(r, c);
        nodes[id] = {
            id,
            x: c * 100, // 100 spacing
            y: r * 100,
            neighbors: [],
            isMaoce: false
        };
    }
}

// 2. Generate Maoce Nodes
// Attached to (2, 4) - Middle Right
// Shape: Diamond/Square sticking out.
// (2,4) is at x=400, y=200.
// Maoce config:
// Top(500,100), Right(600,200), Bottom(500,300), Center(500,200)
const attachPointId = getId(2, 4);

// Create generic Maoce nodes
const maoceNodes: BoardNode[] = [
    { id: 'm_top', x: 500, y: 100, neighbors: [], isMaoce: true },
    { id: 'm_right', x: 600, y: 200, neighbors: [], isMaoce: true },
    { id: 'm_bottom', x: 500, y: 300, neighbors: [], isMaoce: true },
    { id: 'm_center', x: 500, y: 200, neighbors: [], isMaoce: true },
];

maoceNodes.forEach(n => { nodes[n.id] = n; });

// 3. Connect Neighbors
// Helper to add bi-directional edge
const addEdge = (id1: NodeId, id2: NodeId) => {
    if (nodes[id1] && nodes[id2]) {
        if (!nodes[id1].neighbors.includes(id2)) nodes[id1].neighbors.push(id2);
        if (!nodes[id2].neighbors.includes(id1)) nodes[id2].neighbors.push(id1);
    }
};

// --- ORTHOGONAL CONNECTIONS (Grid) ---
for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        const id = getId(r, c);
        // Right
        if (c + 1 < COLS) addEdge(id, getId(r, c + 1));
        // Down
        if (r + 1 < ROWS) addEdge(id, getId(r + 1, c));
    }
}

// --- DIAGONAL CONNECTIONS (Specific 4 Quadrants) ---
// The board has 4 "Union Jack" squares.
// Centers are at (1,1), (1,3), (3,1), (3,3).
// Each center connects diagonally to its 4 corners.

const centers = [
    { r: 1, c: 1 }, // Top-Left Quad
    { r: 1, c: 3 }, // Top-Right Quad
    { r: 3, c: 1 }, // Bottom-Left Quad
    { r: 3, c: 3 }, // Bottom-Right Quad
];

centers.forEach(center => {
    const cId = getId(center.r, center.c);
    // Diagonals: (r-1, c-1), (r-1, c+1), (r+1, c-1), (r+1, c+1)
    addEdge(cId, getId(center.r - 1, center.c - 1));
    addEdge(cId, getId(center.r - 1, center.c + 1));
    addEdge(cId, getId(center.r + 1, center.c - 1));
    addEdge(cId, getId(center.r + 1, center.c + 1));
});

// --- MAOCE CONNECTIONS ---
// (2,4) connects to m_top, m_bottom, m_center.
addEdge(attachPointId, 'm_top');
addEdge(attachPointId, 'm_bottom');
addEdge(attachPointId, 'm_center');

// Connections within Maoce
addEdge('m_center', 'm_top');
addEdge('m_center', 'm_right');
addEdge('m_center', 'm_bottom');

// Perimeter
addEdge('m_top', 'm_right');
addEdge('m_right', 'm_bottom');
// Note: (2,4)-top and (2,4)-bottom are already edges?
// Visually usually a square with X.
// Square: (2,4)-Top-Right-Bottom-(2,4).
// Cross: (2,4)-Right, Top-Bottom.
// My current nodes:
// (2,4)-Top (Edge) - YES
// Top-Right (Edge) - YES
// Right-Bottom (Edge) - YES
// Bottom-(2,4) (Edge) - YES
// (2,4)-Center-Right (Line) - (2,4)-C, C-R added.
// Top-Center-Bottom (Line) - T-C, C-B added.

export const BOARD_NODES = nodes;

// Helper to determine if three nodes form a straight line
export function areCollinear(n1: NodeId, n2: NodeId, n3: NodeId): boolean {
    const p1 = nodes[n1];
    const p2 = nodes[n2];
    const p3 = nodes[n3];
    if (!p1 || !p2 || !p3) return false;

    // Cross product
    const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
    return Math.abs(val) < 1e-5;
}
