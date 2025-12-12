import { CubeFace, CubePosition, GameState, GameAction, GamePieceData } from '@/types';
import { BaseGame } from '@/games/base/Game';
import { positionsEqual, getAllNeighbors } from '@/utils/faceTransitions';

// Cell state for each position on the cube
export interface MinesweeperCell {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
}

// Minesweeper-specific game state
export interface MinesweeperGameState extends GameState {
    cells: Map<string, MinesweeperCell>;
    mineCount: number;
    flagCount: number;
    revealedCount: number;
    isFirstClick: boolean;
    isGameOver: boolean;
    isWon: boolean;
    gridSize: number;
    totalMines: number;
    explodedMine: CubePosition | null; // Track which mine was clicked
}

// Action types
export interface MinesweeperRevealAction extends GameAction {
    type: 'reveal';
    payload: CubePosition;
}

export interface MinesweeperFlagAction extends GameAction {
    type: 'flag';
    payload: CubePosition;
}

export interface MinesweeperChordAction extends GameAction {
    type: 'chord';
    payload: CubePosition;
}

export type MinesweeperAction = MinesweeperRevealAction | MinesweeperFlagAction | MinesweeperChordAction;

// Configuration for different difficulties (expandable later)
export interface MinesweeperConfig {
    gridSize: number;
    totalMines: number;
}

const DEFAULT_CONFIG: MinesweeperConfig = {
    gridSize: 8,
    totalMines: 60, // ~15.6% mine density across 384 cells
};

// Helper to create position key for Map
function posKey(pos: CubePosition): string {
    return `${pos.face}-${pos.x}-${pos.y}`;
}

// Parse position key back to CubePosition
function parseKey(key: string): CubePosition {
    const [face, x, y] = key.split('-');
    return { face: face as CubeFace, x: parseInt(x), y: parseInt(y) };
}

// All cube faces
const ALL_FACES: CubeFace[] = [
    CubeFace.FRONT,
    CubeFace.BACK,
    CubeFace.LEFT,
    CubeFace.RIGHT,
    CubeFace.TOP,
    CubeFace.BOTTOM,
];

// Number colors (classic minesweeper style)
export const NUMBER_COLORS: Record<number, string> = {
    1: '#3b82f6', // blue
    2: '#22c55e', // green
    3: '#ef4444', // red
    4: '#8b5cf6', // purple
    5: '#a855f7', // fuchsia
    6: '#06b6d4', // cyan
    7: '#1f2937', // dark gray
    8: '#6b7280', // gray
};

/**
 * Minesweeper game implementation for the cube
 */
export class MinesweeperGame extends BaseGame<MinesweeperGameState, MinesweeperAction> {
    readonly id = 'minesweeper';
    readonly name = 'Minesweeper';
    readonly description = 'Classic minesweeper on a 3D cube - mines wrap across faces!';
    readonly gridSize: number;
    readonly playerCount = 1;
    readonly activeFaces = 6;
    readonly totalMines: number;

    constructor(config: MinesweeperConfig = DEFAULT_CONFIG) {
        super();
        this.gridSize = config.gridSize;
        this.totalMines = config.totalMines;
    }

    init(): MinesweeperGameState {
        const cells = new Map<string, MinesweeperCell>();

        // Create empty cells for all faces
        for (const face of ALL_FACES) {
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    const key = posKey({ face, x, y });
                    cells.set(key, {
                        isMine: false,
                        isRevealed: false,
                        isFlagged: false,
                        adjacentMines: 0,
                    });
                }
            }
        }

        return {
            pieces: [],
            cells,
            mineCount: 0,
            flagCount: 0,
            revealedCount: 0,
            isFirstClick: true,
            isGameOver: false,
            isWon: false,
            gridSize: this.gridSize,
            totalMines: this.totalMines,
            explodedMine: null,
            winner: undefined,
        };
    }

    /**
     * Place mines randomly, avoiding the safe position and its neighbors
     */
    private placeMines(
        cells: Map<string, MinesweeperCell>,
        safePosition: CubePosition,
        gridSize: number,
        totalMines: number
    ): Map<string, MinesweeperCell> {
        const newCells = new Map(cells);

        // Get safe zone (clicked cell + neighbors)
        const safeNeighbors = getAllNeighbors(safePosition, gridSize);
        const safeZone = new Set<string>([posKey(safePosition)]);
        for (const neighbor of safeNeighbors) {
            safeZone.add(posKey(neighbor));
        }

        // Get all possible positions (excluding safe zone)
        const availablePositions: string[] = [];
        for (const key of newCells.keys()) {
            if (!safeZone.has(key)) {
                availablePositions.push(key);
            }
        }

        // Shuffle and pick mine positions
        for (let i = availablePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
        }

        const minePositions = availablePositions.slice(0, totalMines);

        // Place mines
        for (const key of minePositions) {
            const cell = newCells.get(key)!;
            newCells.set(key, { ...cell, isMine: true });
        }

        // Calculate adjacent mine counts
        for (const [key, cell] of newCells) {
            if (!cell.isMine) {
                const pos = parseKey(key);
                const neighbors = getAllNeighbors(pos, gridSize);
                let adjacentMines = 0;
                for (const neighbor of neighbors) {
                    const neighborCell = newCells.get(posKey(neighbor));
                    if (neighborCell?.isMine) {
                        adjacentMines++;
                    }
                }
                newCells.set(key, { ...cell, adjacentMines });
            }
        }

        return newCells;
    }

    /**
     * Reveal a cell and flood-fill if it has no adjacent mines
     */
    private revealCell(
        cells: Map<string, MinesweeperCell>,
        position: CubePosition,
        gridSize: number
    ): { cells: Map<string, MinesweeperCell>; hitMine: boolean; revealed: number } {
        const newCells = new Map(cells);
        const key = posKey(position);
        const cell = newCells.get(key);

        if (!cell || cell.isRevealed || cell.isFlagged) {
            return { cells: newCells, hitMine: false, revealed: 0 };
        }

        // Hit a mine!
        if (cell.isMine) {
            newCells.set(key, { ...cell, isRevealed: true });
            return { cells: newCells, hitMine: true, revealed: 1 };
        }

        // Flood-fill reveal for cells with no adjacent mines
        const toReveal: CubePosition[] = [position];
        const visited = new Set<string>();
        let revealedCount = 0;

        while (toReveal.length > 0) {
            const current = toReveal.pop()!;
            const currentKey = posKey(current);

            if (visited.has(currentKey)) continue;
            visited.add(currentKey);

            const currentCell = newCells.get(currentKey);
            if (!currentCell || currentCell.isRevealed || currentCell.isFlagged || currentCell.isMine) {
                continue;
            }

            // Reveal this cell
            newCells.set(currentKey, { ...currentCell, isRevealed: true });
            revealedCount++;

            // If no adjacent mines, add neighbors to reveal queue
            if (currentCell.adjacentMines === 0) {
                const neighbors = getAllNeighbors(current, gridSize);
                for (const neighbor of neighbors) {
                    if (!visited.has(posKey(neighbor))) {
                        toReveal.push(neighbor);
                    }
                }
            }
        }

        return { cells: newCells, hitMine: false, revealed: revealedCount };
    }

    /**
     * Chord reveal: if number equals adjacent flags, reveal all unflagged neighbors
     */
    private chordReveal(
        cells: Map<string, MinesweeperCell>,
        position: CubePosition,
        gridSize: number
    ): { cells: Map<string, MinesweeperCell>; hitMine: boolean; revealed: number; explodedMine: CubePosition | null } {
        const key = posKey(position);
        const cell = cells.get(key);

        if (!cell || !cell.isRevealed || cell.adjacentMines === 0) {
            return { cells, hitMine: false, revealed: 0, explodedMine: null };
        }

        const neighbors = getAllNeighbors(position, gridSize);

        // Count adjacent flags
        let flagCount = 0;
        for (const neighbor of neighbors) {
            const neighborCell = cells.get(posKey(neighbor));
            if (neighborCell?.isFlagged) {
                flagCount++;
            }
        }

        // Only chord if flag count matches number
        if (flagCount !== cell.adjacentMines) {
            return { cells, hitMine: false, revealed: 0, explodedMine: null };
        }

        // Reveal all unflagged neighbors
        let newCells = new Map(cells);
        let totalRevealed = 0;
        let hitMine = false;
        let explodedMine: CubePosition | null = null;

        for (const neighbor of neighbors) {
            const neighborCell = newCells.get(posKey(neighbor));
            if (neighborCell && !neighborCell.isFlagged && !neighborCell.isRevealed) {
                const result = this.revealCell(newCells, neighbor, gridSize);
                newCells = result.cells;
                totalRevealed += result.revealed;
                if (result.hitMine) {
                    hitMine = true;
                    explodedMine = neighbor;
                }
            }
        }

        return { cells: newCells, hitMine, revealed: totalRevealed, explodedMine };
    }

    isValidAction(state: MinesweeperGameState, action: MinesweeperAction): boolean {
        if (state.isGameOver) return false;

        const key = posKey(action.payload);
        const cell = state.cells.get(key);
        if (!cell) return false;

        switch (action.type) {
            case 'reveal':
                return !cell.isRevealed && !cell.isFlagged;
            case 'flag':
                return !cell.isRevealed;
            case 'chord':
                return cell.isRevealed && cell.adjacentMines > 0;
            default:
                return false;
        }
    }

    applyAction(state: MinesweeperGameState, action: MinesweeperAction): MinesweeperGameState {
        if (state.isGameOver) return state;

        switch (action.type) {
            case 'reveal': {
                let cells = state.cells;
                let isFirstClick = state.isFirstClick;

                // First click: place mines (ensuring safe start)
                if (isFirstClick) {
                    cells = this.placeMines(cells, action.payload, state.gridSize, state.totalMines);
                    isFirstClick = false;
                }

                const result = this.revealCell(cells, action.payload, state.gridSize);
                const newRevealedCount = state.revealedCount + result.revealed;
                const totalCells = 6 * state.gridSize * state.gridSize;
                const nonMineCells = totalCells - state.totalMines;
                const isWon = newRevealedCount >= nonMineCells;

                return {
                    ...state,
                    cells: result.cells,
                    mineCount: state.totalMines,
                    revealedCount: newRevealedCount,
                    isFirstClick,
                    isGameOver: result.hitMine || isWon,
                    isWon: isWon && !result.hitMine,
                    explodedMine: result.hitMine ? action.payload : null,
                };
            }

            case 'flag': {
                const key = posKey(action.payload);
                const cell = state.cells.get(key);
                if (!cell || cell.isRevealed) return state;

                const newCells = new Map(state.cells);
                const newFlagged = !cell.isFlagged;
                newCells.set(key, { ...cell, isFlagged: newFlagged });

                return {
                    ...state,
                    cells: newCells,
                    flagCount: state.flagCount + (newFlagged ? 1 : -1),
                };
            }

            case 'chord': {
                const result = this.chordReveal(state.cells, action.payload, state.gridSize);
                const newRevealedCount = state.revealedCount + result.revealed;
                const totalCells = 6 * state.gridSize * state.gridSize;
                const nonMineCells = totalCells - state.totalMines;
                const isWon = newRevealedCount >= nonMineCells;

                return {
                    ...state,
                    cells: result.cells,
                    revealedCount: newRevealedCount,
                    isGameOver: result.hitMine || isWon,
                    isWon: isWon && !result.hitMine,
                    explodedMine: result.explodedMine,
                };
            }

            default:
                return state;
        }
    }

    checkGameOver(state: MinesweeperGameState): { isOver: boolean; winner?: number } {
        return { isOver: state.isGameOver, winner: state.isWon ? 1 : undefined };
    }

    getValidActions(state: MinesweeperGameState): MinesweeperAction[] {
        const actions: MinesweeperAction[] = [];

        if (state.isGameOver) return actions;

        for (const [key, cell] of state.cells) {
            const pos = parseKey(key);

            if (!cell.isRevealed && !cell.isFlagged) {
                actions.push({ type: 'reveal', payload: pos });
            }
            if (!cell.isRevealed) {
                actions.push({ type: 'flag', payload: pos });
            }
            if (cell.isRevealed && cell.adjacentMines > 0) {
                actions.push({ type: 'chord', payload: pos });
            }
        }

        return actions;
    }

    getPieces(state: MinesweeperGameState): GamePieceData[] {
        const pieces: GamePieceData[] = [];

        for (const [key, cell] of state.cells) {
            const pos = parseKey(key);
            let type: string;
            let color: string;

            if (!cell.isRevealed) {
                if (cell.isFlagged) {
                    type = 'flagged';
                    color = '#ef4444'; // red
                } else {
                    type = 'hidden';
                    color = '#6b7280'; // gray
                }
            } else if (cell.isMine) {
                type = 'mine';
                color = state.explodedMine && positionsEqual(pos, state.explodedMine)
                    ? '#dc2626' // bright red for exploded
                    : '#1f2937'; // dark for revealed mines
            } else if (cell.adjacentMines > 0) {
                type = `number-${cell.adjacentMines}`;
                color = NUMBER_COLORS[cell.adjacentMines] || '#374151';
            } else {
                type = 'empty';
                color = '#d1d5db'; // light gray for revealed empty
            }

            pieces.push({
                id: key,
                type,
                position: pos,
                rotation: 0,
                color,
                metadata: {
                    adjacentMines: cell.adjacentMines,
                    isMine: cell.isMine,
                    isRevealed: cell.isRevealed,
                    isFlagged: cell.isFlagged,
                },
            });
        }

        return pieces;
    }
}

// Export singleton instance with default config
export const minesweeperGame = new MinesweeperGame();
