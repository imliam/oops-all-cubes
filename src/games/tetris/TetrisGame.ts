import { GameState, GameAction, GamePieceData } from '@/types';
import { BaseGame } from '@/games/base/Game';

/**
 * Tetris - Hollow Cube Edition
 *
 * The play area is a hollow cube (e.g., 6x6x12 - width x depth x height)
 * Pieces fall from above and can be moved/rotated in all 3D directions.
 * Complete a full horizontal layer (all cells in an X-Z plane) to clear it.
 */

// 3D position within the cube
export interface Vec3 {
    x: number;
    y: number;  // Y is height (pieces fall down in -Y direction)
    z: number;
}

// 3D Tetromino types - we'll use 3D polycubes (tetracubes)
export type Tetracube =
    | 'I'   // 4 in a line
    | 'O'   // 2x2 square
    | 'L'   // L-shape
    | 'J'   // J-shape (mirror of L)
    | 'T'   // T-shape
    | 'S'   // S-shape
    | 'Z'   // Z-shape
    | 'Tower'  // 2x2x1 but stacked 2 high (unique to 3D)
    | 'Corner'; // 3D corner piece (unique to 3D)

// Each piece defined as array of [x, y, z] offsets from pivot
// Y=0 is the pivot level, positive Y goes up
const TETRACUBES: Record<Tetracube, { cells: Vec3[]; color: string }> = {
    I: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }],
        color: '#00f5ff'
    },
    O: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }],
        color: '#ffd700'
    },
    L: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 0, z: 1 }],
        color: '#f97316'
    },
    J: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }],
        color: '#3b82f6'
    },
    T: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }],
        color: '#a855f7'
    },
    S: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, { x: 2, y: 0, z: 1 }],
        color: '#22c55e'
    },
    Z: {
        cells: [{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }],
        color: '#ef4444'
    },
    // Unique 3D pieces
    Tower: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }],
        color: '#ec4899'
    },
    Corner: {
        cells: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }],
        color: '#14b8a6'
    },
};

const TETRACUBE_TYPES: Tetracube[] = ['I', 'O', 'L', 'J', 'T', 'S', 'Z', 'Tower', 'Corner'];

// The current falling piece
export interface FallingPiece3D {
    type: Tetracube;
    position: Vec3;  // Position of the pivot point
    // Rotation state: we track rotations around each axis
    rotationX: number; // 0, 90, 180, 270
    rotationY: number; // 0, 90, 180, 270
    rotationZ: number; // 0, 90, 180, 270
}

// 3D grid cell
export interface GridCell3D {
    filled: boolean;
    color: string;
}

// Game state
export interface Tetris3DGameState extends GameState {
    // 3D grid: [y][z][x] where y=0 is bottom, y increases upward
    grid: GridCell3D[][][];
    currentPiece: FallingPiece3D | null;
    nextPiece: Tetracube;
    heldPiece: Tetracube | null;
    canHold: boolean;
    score: number;
    level: number;
    layersCleared: number;
    fallSpeed: number;
    isGameOver: boolean;
    isPaused: boolean;
    // Cube dimensions
    width: number;   // X dimension
    depth: number;   // Z dimension
    height: number;  // Y dimension (how tall the play area is)
}

// Actions
export interface Tetris3DMoveAction extends GameAction {
    type: 'move';
    payload: 'left' | 'right' | 'forward' | 'backward';
}

export interface Tetris3DRotateAction extends GameAction {
    type: 'rotate';
    payload: 'x' | 'x-' | 'y' | 'y-' | 'z' | 'z-'; // Rotation axis and direction
}

export interface Tetris3DDropAction extends GameAction {
    type: 'drop';
    payload: 'soft' | 'hard';
}

export interface Tetris3DTickAction extends GameAction {
    type: 'tick';
}

export interface Tetris3DHoldAction extends GameAction {
    type: 'hold';
}

export interface Tetris3DPauseAction extends GameAction {
    type: 'pause';
}

export interface Tetris3DResumeAction extends GameAction {
    type: 'resume';
}

export type Tetris3DAction =
    | Tetris3DMoveAction
    | Tetris3DRotateAction
    | Tetris3DDropAction
    | Tetris3DTickAction
    | Tetris3DHoldAction
    | Tetris3DPauseAction
    | Tetris3DResumeAction;

/**
 * Rotate a point 90 degrees around an axis
 */
function rotatePoint(point: Vec3, axis: 'x' | 'y' | 'z', times: number): Vec3 {
    let { x, y, z } = point;
    const rotations = ((times % 4) + 4) % 4;

    for (let i = 0; i < rotations; i++) {
        if (axis === 'x') {
            [y, z] = [-z, y];
        } else if (axis === 'y') {
            [x, z] = [z, -x];
        } else {
            [x, y] = [-y, x];
        }
    }

    return { x, y, z };
}

/**
 * Get the world cells of a piece given its position and rotation
 */
function getPieceCells(piece: FallingPiece3D): Vec3[] {
    const baseCells = TETRACUBES[piece.type].cells;

    return baseCells.map(cell => {
        // Apply rotations (order: X, then Y, then Z)
        let rotated = { ...cell };
        rotated = rotatePoint(rotated, 'x', piece.rotationX / 90);
        rotated = rotatePoint(rotated, 'y', piece.rotationY / 90);
        rotated = rotatePoint(rotated, 'z', piece.rotationZ / 90);

        // Translate to world position
        return {
            x: Math.round(piece.position.x + rotated.x),
            y: Math.round(piece.position.y + rotated.y),
            z: Math.round(piece.position.z + rotated.z),
        };
    });
}

/**
 * Tetris Game Implementation
 */
export class Tetris3DGame extends BaseGame<Tetris3DGameState, Tetris3DAction> {
    readonly id = 'tetris';
    readonly name = 'Tetris';
    readonly description = 'Tetris in a 3D hollow cube - fill complete layers!';
    readonly gridSize = 6; // For the base Game interface
    readonly playerCount = 1;
    readonly activeFaces = 6;

    // Cube dimensions
    readonly cubeWidth = 6;
    readonly cubeDepth = 6;
    readonly cubeHeight = 12;

    init(): Tetris3DGameState {
        // Create empty 3D grid
        const grid: GridCell3D[][][] = [];
        for (let y = 0; y < this.cubeHeight; y++) {
            const layer: GridCell3D[][] = [];
            for (let z = 0; z < this.cubeDepth; z++) {
                const row: GridCell3D[] = [];
                for (let x = 0; x < this.cubeWidth; x++) {
                    row.push({ filled: false, color: '' });
                }
                layer.push(row);
            }
            grid.push(layer);
        }

        const firstPiece = this.randomTetracube();
        const nextPiece = this.randomTetracube();

        return {
            pieces: [],
            grid,
            currentPiece: this.spawnPiece(firstPiece),
            nextPiece,
            heldPiece: null,
            canHold: true,
            score: 0,
            level: 1,
            layersCleared: 0,
            fallSpeed: 1000,
            isGameOver: false,
            isPaused: false,
            width: this.cubeWidth,
            depth: this.cubeDepth,
            height: this.cubeHeight,
        };
    }

    private randomTetracube(): Tetracube {
        return TETRACUBE_TYPES[Math.floor(Math.random() * TETRACUBE_TYPES.length)];
    }

    private spawnPiece(type: Tetracube): FallingPiece3D {
        return {
            type,
            position: {
                x: Math.floor(this.cubeWidth / 2) - 1,
                y: this.cubeHeight - 2, // Spawn near top
                z: Math.floor(this.cubeDepth / 2) - 1,
            },
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
        };
    }

    isValidAction(state: Tetris3DGameState, action: Tetris3DAction): boolean {
        if (state.isGameOver) return false;

        switch (action.type) {
            case 'tick':
            case 'move':
            case 'rotate':
            case 'drop':
            case 'hold':
                return !state.isPaused && state.currentPiece !== null;
            case 'pause':
                return !state.isPaused;
            case 'resume':
                return state.isPaused;
            default:
                return false;
        }
    }

    applyAction(state: Tetris3DGameState, action: Tetris3DAction): Tetris3DGameState {
        switch (action.type) {
            case 'move':
                return this.movePiece(state, action.payload);
            case 'rotate':
                return this.rotatePiece(state, action.payload);
            case 'drop':
                return action.payload === 'hard' ? this.hardDrop(state) : this.softDrop(state);
            case 'tick':
                return this.tick(state);
            case 'hold':
                return this.holdPiece(state);
            case 'pause':
                return { ...state, isPaused: true };
            case 'resume':
                return { ...state, isPaused: false };
            default:
                return state;
        }
    }

    private movePiece(state: Tetris3DGameState, direction: 'left' | 'right' | 'forward' | 'backward'): Tetris3DGameState {
        if (!state.currentPiece) return state;

        const delta: Vec3 = { x: 0, y: 0, z: 0 };
        switch (direction) {
            case 'left': delta.x = -1; break;
            case 'right': delta.x = 1; break;
            case 'forward': delta.z = -1; break;
            case 'backward': delta.z = 1; break;
        }

        const newPiece: FallingPiece3D = {
            ...state.currentPiece,
            position: {
                x: state.currentPiece.position.x + delta.x,
                y: state.currentPiece.position.y + delta.y,
                z: state.currentPiece.position.z + delta.z,
            },
        };

        if (this.isValidPosition(state, newPiece)) {
            return { ...state, currentPiece: newPiece };
        }
        return state;
    }

    private rotatePiece(state: Tetris3DGameState, axis: 'x' | 'x-' | 'y' | 'y-' | 'z' | 'z-'): Tetris3DGameState {
        if (!state.currentPiece) return state;

        const isNegative = axis.endsWith('-');
        const cleanAxis = axis.replace('-', '') as 'x' | 'y' | 'z';
        const delta = isNegative ? -90 : 90;

        const newPiece: FallingPiece3D = { ...state.currentPiece };

        if (cleanAxis === 'x') {
            newPiece.rotationX = (newPiece.rotationX + delta + 360) % 360;
        } else if (cleanAxis === 'y') {
            newPiece.rotationY = (newPiece.rotationY + delta + 360) % 360;
        } else {
            newPiece.rotationZ = (newPiece.rotationZ + delta + 360) % 360;
        }

        // Try rotation, then wall kicks
        if (this.isValidPosition(state, newPiece)) {
            return { ...state, currentPiece: newPiece };
        }

        // Wall kick attempts in all directions
        const kicks = [
            { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 },
            { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
            { x: -2, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
            { x: 0, y: 0, z: -2 }, { x: 0, y: 0, z: 2 },
        ];

        for (const kick of kicks) {
            const kickedPiece: FallingPiece3D = {
                ...newPiece,
                position: {
                    x: newPiece.position.x + kick.x,
                    y: newPiece.position.y + kick.y,
                    z: newPiece.position.z + kick.z,
                },
            };
            if (this.isValidPosition(state, kickedPiece)) {
                return { ...state, currentPiece: kickedPiece };
            }
        }

        return state;
    }

    private softDrop(state: Tetris3DGameState): Tetris3DGameState {
        if (!state.currentPiece) return state;

        const newPiece: FallingPiece3D = {
            ...state.currentPiece,
            position: {
                ...state.currentPiece.position,
                y: state.currentPiece.position.y - 1,
            },
        };

        if (this.isValidPosition(state, newPiece)) {
            return { ...state, currentPiece: newPiece, score: state.score + 1 };
        }
        return state;
    }

    private hardDrop(state: Tetris3DGameState): Tetris3DGameState {
        if (!state.currentPiece) return state;

        let dropDistance = 0;
        let newPiece: FallingPiece3D = { ...state.currentPiece, position: { ...state.currentPiece.position } };

        while (this.isValidPosition(state, {
            ...newPiece,
            position: { ...newPiece.position, y: newPiece.position.y - 1 }
        })) {
            newPiece.position.y--;
            dropDistance++;
        }

        return this.lockPiece({
            ...state,
            currentPiece: newPiece,
            score: state.score + dropDistance * 2
        });
    }

    private tick(state: Tetris3DGameState): Tetris3DGameState {
        if (!state.currentPiece || state.isPaused) return state;

        const newPiece: FallingPiece3D = {
            ...state.currentPiece,
            position: {
                ...state.currentPiece.position,
                y: state.currentPiece.position.y - 1,
            },
        };

        if (this.isValidPosition(state, newPiece)) {
            return { ...state, currentPiece: newPiece };
        }

        // Can't move down - lock the piece
        return this.lockPiece(state);
    }

    private lockPiece(state: Tetris3DGameState): Tetris3DGameState {
        if (!state.currentPiece) return state;

        const piece = state.currentPiece;
        const cells = getPieceCells(piece);
        const color = TETRACUBES[piece.type].color;

        // Deep copy the grid
        const grid = state.grid.map(layer =>
            layer.map(row =>
                row.map(cell => ({ ...cell }))
            )
        );

        // Place the piece
        for (const cell of cells) {
            if (cell.y >= 0 && cell.y < state.height &&
                cell.z >= 0 && cell.z < state.depth &&
                cell.x >= 0 && cell.x < state.width) {
                grid[cell.y][cell.z][cell.x] = { filled: true, color };
            }
        }

        // Check for completed layers (from bottom to top)
        const completedLayers: number[] = [];
        for (let y = 0; y < state.height; y++) {
            let layerComplete = true;
            for (let z = 0; z < state.depth && layerComplete; z++) {
                for (let x = 0; x < state.width && layerComplete; x++) {
                    if (!grid[y][z][x].filled) {
                        layerComplete = false;
                    }
                }
            }
            if (layerComplete) {
                completedLayers.push(y);
            }
        }

        // Remove completed layers and add empty ones at top
        for (const layerY of completedLayers.sort((a, b) => b - a)) {
            grid.splice(layerY, 1);
            // Add empty layer at top
            const emptyLayer: GridCell3D[][] = [];
            for (let z = 0; z < state.depth; z++) {
                const row: GridCell3D[] = [];
                for (let x = 0; x < state.width; x++) {
                    row.push({ filled: false, color: '' });
                }
                emptyLayer.push(row);
            }
            grid.push(emptyLayer);
        }

        // Calculate score (more points for multiple layers at once)
        const layerScores = [0, 100, 300, 500, 800, 1200, 1600, 2000];
        const layerScore = layerScores[Math.min(completedLayers.length, layerScores.length - 1)] || completedLayers.length * 300;
        const newLayersCleared = state.layersCleared + completedLayers.length;
        const newLevel = Math.floor(newLayersCleared / 5) + 1;
        const newSpeed = Math.max(200, 1000 - (newLevel - 1) * 100);

        // Spawn next piece
        const nextPiece = this.spawnPiece(state.nextPiece);
        const isGameOver = !this.isValidPosition({ ...state, grid }, nextPiece);

        return {
            ...state,
            grid,
            currentPiece: isGameOver ? null : nextPiece,
            nextPiece: this.randomTetracube(),
            canHold: true,
            score: state.score + layerScore * newLevel,
            level: newLevel,
            layersCleared: newLayersCleared,
            fallSpeed: newSpeed,
            isGameOver,
        };
    }

    private holdPiece(state: Tetris3DGameState): Tetris3DGameState {
        if (!state.currentPiece || !state.canHold) return state;

        const currentType = state.currentPiece.type;
        let newPiece: FallingPiece3D;

        if (state.heldPiece) {
            newPiece = this.spawnPiece(state.heldPiece);
        } else {
            newPiece = this.spawnPiece(state.nextPiece);
            return {
                ...state,
                currentPiece: newPiece,
                heldPiece: currentType,
                nextPiece: this.randomTetracube(),
                canHold: false,
            };
        }

        return {
            ...state,
            currentPiece: newPiece,
            heldPiece: currentType,
            canHold: false,
        };
    }

    private isValidPosition(state: Tetris3DGameState, piece: FallingPiece3D): boolean {
        const cells = getPieceCells(piece);

        for (const cell of cells) {
            // Check bounds
            if (cell.x < 0 || cell.x >= state.width) return false;
            if (cell.z < 0 || cell.z >= state.depth) return false;
            if (cell.y < 0 || cell.y >= state.height) return false;

            // Check collision with placed pieces
            if (state.grid[cell.y][cell.z][cell.x].filled) return false;
        }

        return true;
    }

    /**
     * Get the ghost piece position (where piece would land)
     */
    getGhostPosition(state: Tetris3DGameState): FallingPiece3D | null {
        if (!state.currentPiece) return null;

        let ghost: FallingPiece3D = {
            ...state.currentPiece,
            position: { ...state.currentPiece.position }
        };

        while (this.isValidPosition(state, {
            ...ghost,
            position: { ...ghost.position, y: ghost.position.y - 1 }
        })) {
            ghost.position.y--;
        }

        return ghost;
    }

    checkGameOver(state: Tetris3DGameState): { isOver: boolean; winner?: number } {
        return { isOver: state.isGameOver };
    }

    getValidActions(state: Tetris3DGameState): Tetris3DAction[] {
        const actions: Tetris3DAction[] = [];

        if (state.isGameOver) return actions;

        if (state.isPaused) {
            actions.push({ type: 'resume' });
        } else {
            actions.push({ type: 'pause' });
            if (state.currentPiece) {
                actions.push({ type: 'move', payload: 'left' });
                actions.push({ type: 'move', payload: 'right' });
                actions.push({ type: 'move', payload: 'forward' });
                actions.push({ type: 'move', payload: 'backward' });
                actions.push({ type: 'rotate', payload: 'x' });
                actions.push({ type: 'rotate', payload: 'y' });
                actions.push({ type: 'rotate', payload: 'z' });
                actions.push({ type: 'drop', payload: 'soft' });
                actions.push({ type: 'drop', payload: 'hard' });
                actions.push({ type: 'tick' });
                if (state.canHold) {
                    actions.push({ type: 'hold' });
                }
            }
        }

        return actions;
    }

    getPieces(_state: Tetris3DGameState): GamePieceData[] {
        // This method is for the old 2D system - we'll render differently in 3D
        return [];
    }
}

// Export singleton instance
export const tetris3DGame = new Tetris3DGame();

// Export types and constants for component use
export { TETRACUBES, getPieceCells };
