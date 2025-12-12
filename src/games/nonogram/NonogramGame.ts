import { CubeFace, CubePosition, GameState, GameAction, GamePieceData } from '@/types';
import { BaseGame } from '@/games/base/Game';

// Cell state for each position on the cube
export enum NonogramCellState {
    UNKNOWN = 'unknown',    // Not yet interacted with
    FILLED = 'filled',      // Player marked as filled
    EMPTY = 'empty',        // Player marked as definitely empty (X)
}

export interface NonogramCell {
    solution: boolean;      // True if this cell should be filled in the solution
    state: NonogramCellState;
}

// Clue for a row or column - array of consecutive group sizes
export type NonogramClue = number[];

// Clues for a single face
export interface FaceClues {
    rows: NonogramClue[];    // Clues for each row (left side)
    cols: NonogramClue[];    // Clues for each column (top side)
}

// Nonogram-specific game state
export interface NonogramGameState extends GameState {
    cells: Map<string, NonogramCell>;
    clues: Map<CubeFace, FaceClues>;
    gridSize: number;
    isGameOver: boolean;
    isWon: boolean;
    mistakes: number;
    maxMistakes: number;
    revealedHint: CubePosition | null;
    completedFaces: Set<CubeFace>;
}

// Action types
export interface NonogramFillAction extends GameAction {
    type: 'fill';
    payload: CubePosition;
}

export interface NonogramMarkEmptyAction extends GameAction {
    type: 'markEmpty';
    payload: CubePosition;
}

export interface NonogramClearAction extends GameAction {
    type: 'clear';
    payload: CubePosition;
}

export interface NonogramHintAction extends GameAction {
    type: 'hint';
    payload: CubePosition;
}

export type NonogramAction = NonogramFillAction | NonogramMarkEmptyAction | NonogramClearAction | NonogramHintAction;

// Configuration for different difficulties
export interface NonogramConfig {
    gridSize: number;
    maxMistakes: number;
    puzzleSet?: string;
}

const DEFAULT_CONFIG: NonogramConfig = {
    gridSize: 5,
    maxMistakes: 3,
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

/**
 * Seeded random number generator (Mulberry32)
 * Provides deterministic random numbers for reproducible puzzles
 */
class SeededRandom {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    // Returns a random number between 0 and 1
    next(): number {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Returns a random integer between min (inclusive) and max (exclusive)
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
    }

    // Returns true with the given probability (0-1)
    nextBool(probability: number = 0.5): boolean {
        return this.next() < probability;
    }

    // Shuffle an array in place
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

/**
 * Generate a random seed from current time or provided value
 */
function generateSeed(): number {
    return Date.now() ^ (Math.random() * 0xFFFFFFFF);
}

/**
 * Puzzle generation strategies
 */
type GeneratorStrategy = 'noise' | 'symmetric' | 'blob' | 'lines' | 'mixed';

/**
 * Generate a puzzle pattern for all faces using procedural generation
 * The pattern wraps around the cube with connected edges
 */
function generatePuzzlePattern(
    gridSize: number,
    seed: number,
    fillDensity: number = 0.4,
    strategy?: GeneratorStrategy
): { pattern: Record<CubeFace, boolean[][]>; seed: number; strategyUsed: GeneratorStrategy } {
    const rng = new SeededRandom(seed);

    // Pick a random strategy if not specified
    const strategies: GeneratorStrategy[] = ['noise', 'symmetric', 'blob', 'lines', 'mixed'];
    const strategyUsed = strategy || strategies[rng.nextInt(0, strategies.length)];

    // Initialize empty patterns for all faces
    const pattern: Record<CubeFace, boolean[][]> = {
        [CubeFace.FRONT]: createEmptyGrid(gridSize),
        [CubeFace.BACK]: createEmptyGrid(gridSize),
        [CubeFace.LEFT]: createEmptyGrid(gridSize),
        [CubeFace.RIGHT]: createEmptyGrid(gridSize),
        [CubeFace.TOP]: createEmptyGrid(gridSize),
        [CubeFace.BOTTOM]: createEmptyGrid(gridSize),
    };

    // Generate pattern based on strategy
    switch (strategyUsed) {
        case 'noise':
            generateNoisePattern(pattern, gridSize, rng, fillDensity);
            break;
        case 'symmetric':
            generateSymmetricPattern(pattern, gridSize, rng, fillDensity);
            break;
        case 'blob':
            generateBlobPattern(pattern, gridSize, rng, fillDensity);
            break;
        case 'lines':
            generateLinesPattern(pattern, gridSize, rng, fillDensity);
            break;
        case 'mixed':
            generateMixedPattern(pattern, gridSize, rng, fillDensity);
            break;
    }

    // Ensure edges connect properly across faces
    enforceEdgeConnections(pattern, gridSize);

    // Ensure the puzzle is solvable (has at least some filled cells and isn't trivial)
    ensureMinimumComplexity(pattern, gridSize, rng, fillDensity);

    return { pattern, seed, strategyUsed };
}

function createEmptyGrid(size: number): boolean[][] {
    return Array(size).fill(null).map(() => Array(size).fill(false));
}

/**
 * Noise-based pattern: Random cells with some clustering
 */
function generateNoisePattern(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    fillDensity: number
): void {
    // Use cellular automata-like approach for more interesting patterns
    for (const face of ALL_FACES) {
        // Initial random fill
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                pattern[face][y][x] = rng.nextBool(fillDensity);
            }
        }

        // Apply smoothing pass
        const smoothed = createEmptyGrid(gridSize);
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const neighbors = countNeighbors(pattern[face], x, y, gridSize);
                const current = pattern[face][y][x];
                // Keep filled if has enough neighbors, or become filled if surrounded
                smoothed[y][x] = current ? neighbors >= 2 : neighbors >= 4;
            }
        }
        pattern[face] = smoothed;
    }
}

/**
 * Symmetric pattern: Mirror symmetry on each face
 */
function generateSymmetricPattern(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    fillDensity: number
): void {
    const halfSize = Math.ceil(gridSize / 2);

    for (const face of ALL_FACES) {
        // Generate one quadrant and mirror it
        for (let y = 0; y < halfSize; y++) {
            for (let x = 0; x < halfSize; x++) {
                const filled = rng.nextBool(fillDensity * 1.2); // Slightly higher density
                pattern[face][y][x] = filled;
                pattern[face][y][gridSize - 1 - x] = filled;
                pattern[face][gridSize - 1 - y][x] = filled;
                pattern[face][gridSize - 1 - y][gridSize - 1 - x] = filled;
            }
        }
    }
}

/**
 * Blob pattern: Grow organic shapes from random seeds
 */
function generateBlobPattern(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    fillDensity: number
): void {
    const targetCells = Math.floor(gridSize * gridSize * fillDensity);

    for (const face of ALL_FACES) {
        // Place random seed points
        const numSeeds = rng.nextInt(2, 5);
        const seeds: Array<{x: number; y: number}> = [];

        for (let i = 0; i < numSeeds; i++) {
            seeds.push({
                x: rng.nextInt(0, gridSize),
                y: rng.nextInt(0, gridSize)
            });
        }

        // Grow from seeds
        let filledCount = 0;
        const frontier: Array<{x: number; y: number}> = [...seeds];

        // Mark seeds as filled
        for (const seed of seeds) {
            if (!pattern[face][seed.y][seed.x]) {
                pattern[face][seed.y][seed.x] = true;
                filledCount++;
            }
        }

        while (filledCount < targetCells && frontier.length > 0) {
            const idx = rng.nextInt(0, frontier.length);
            const current = frontier[idx];

            // Try to expand to neighbors
            const neighbors = [
                {x: current.x - 1, y: current.y},
                {x: current.x + 1, y: current.y},
                {x: current.x, y: current.y - 1},
                {x: current.x, y: current.y + 1},
            ];

            let expanded = false;
            for (const n of rng.shuffle(neighbors)) {
                if (n.x >= 0 && n.x < gridSize && n.y >= 0 && n.y < gridSize) {
                    if (!pattern[face][n.y][n.x] && rng.nextBool(0.6)) {
                        pattern[face][n.y][n.x] = true;
                        filledCount++;
                        frontier.push(n);
                        expanded = true;
                        break;
                    }
                }
            }

            if (!expanded) {
                frontier.splice(idx, 1);
            }
        }
    }
}

/**
 * Lines pattern: Horizontal, vertical, or diagonal lines
 */
function generateLinesPattern(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    _fillDensity: number
): void {
    const lineType = rng.nextInt(0, 4); // 0: horizontal, 1: vertical, 2: diagonal, 3: cross

    for (const face of ALL_FACES) {
        const offset = rng.nextInt(0, 3);
        const spacing = rng.nextInt(2, 4);
        const thickness = rng.nextInt(1, 3);

        switch (lineType) {
            case 0: // Horizontal
                for (let y = 0; y < gridSize; y++) {
                    if ((y + offset) % spacing < thickness) {
                        for (let x = 0; x < gridSize; x++) {
                            pattern[face][y][x] = true;
                        }
                    }
                }
                break;
            case 1: // Vertical
                for (let x = 0; x < gridSize; x++) {
                    if ((x + offset) % spacing < thickness) {
                        for (let y = 0; y < gridSize; y++) {
                            pattern[face][y][x] = true;
                        }
                    }
                }
                break;
            case 2: // Diagonal
                for (let y = 0; y < gridSize; y++) {
                    for (let x = 0; x < gridSize; x++) {
                        if ((x + y + offset) % spacing < thickness) {
                            pattern[face][y][x] = true;
                        }
                    }
                }
                break;
            case 3: // Cross
                const center = Math.floor(gridSize / 2);
                for (let i = 0; i < gridSize; i++) {
                    // Horizontal line
                    pattern[face][center][i] = true;
                    if (center > 0) pattern[face][center - 1][i] = rng.nextBool(0.5);
                    if (center < gridSize - 1) pattern[face][center + 1][i] = rng.nextBool(0.5);
                    // Vertical line
                    pattern[face][i][center] = true;
                    if (center > 0) pattern[face][i][center - 1] = rng.nextBool(0.5);
                    if (center < gridSize - 1) pattern[face][i][center + 1] = rng.nextBool(0.5);
                }
                break;
        }
    }
}

/**
 * Mixed pattern: Combination of strategies
 */
function generateMixedPattern(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    fillDensity: number
): void {
    // Start with a base pattern
    generateNoisePattern(pattern, gridSize, rng, fillDensity * 0.5);

    // Add some structure
    const center = Math.floor(gridSize / 2);

    for (const face of ALL_FACES) {
        // Maybe add a border
        if (rng.nextBool(0.4)) {
            for (let i = 0; i < gridSize; i++) {
                pattern[face][0][i] = true;
                pattern[face][gridSize - 1][i] = true;
                pattern[face][i][0] = true;
                pattern[face][i][gridSize - 1] = true;
            }
        }

        // Maybe add center cross
        if (rng.nextBool(0.3)) {
            for (let i = 0; i < gridSize; i++) {
                pattern[face][center][i] = true;
                pattern[face][i][center] = true;
            }
        }

        // Maybe add corners
        if (rng.nextBool(0.3)) {
            pattern[face][0][0] = true;
            pattern[face][0][gridSize - 1] = true;
            pattern[face][gridSize - 1][0] = true;
            pattern[face][gridSize - 1][gridSize - 1] = true;
        }
    }
}

/**
 * Count filled neighbors of a cell
 */
function countNeighbors(grid: boolean[][], x: number, y: number, size: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx]) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Enforce that edges connect properly between adjacent faces
 * This makes the puzzle feel like it wraps around the cube
 */
function enforceEdgeConnections(pattern: Record<CubeFace, boolean[][]>, gridSize: number): void {
    const last = gridSize - 1;

    // FRONT <-> RIGHT (front's right edge = right's left edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.FRONT][i][last] || pattern[CubeFace.RIGHT][i][0];
        pattern[CubeFace.FRONT][i][last] = val;
        pattern[CubeFace.RIGHT][i][0] = val;
    }

    // RIGHT <-> BACK (right's right edge = back's left edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.RIGHT][i][last] || pattern[CubeFace.BACK][i][0];
        pattern[CubeFace.RIGHT][i][last] = val;
        pattern[CubeFace.BACK][i][0] = val;
    }

    // BACK <-> LEFT (back's right edge = left's left edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.BACK][i][last] || pattern[CubeFace.LEFT][i][0];
        pattern[CubeFace.BACK][i][last] = val;
        pattern[CubeFace.LEFT][i][0] = val;
    }

    // LEFT <-> FRONT (left's right edge = front's left edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.LEFT][i][last] || pattern[CubeFace.FRONT][i][0];
        pattern[CubeFace.LEFT][i][last] = val;
        pattern[CubeFace.FRONT][i][0] = val;
    }

    // FRONT <-> TOP (front's top edge = top's bottom edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.FRONT][last][i] || pattern[CubeFace.TOP][0][i];
        pattern[CubeFace.FRONT][last][i] = val;
        pattern[CubeFace.TOP][0][i] = val;
    }

    // FRONT <-> BOTTOM (front's bottom edge = bottom's top edge)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.FRONT][0][i] || pattern[CubeFace.BOTTOM][last][i];
        pattern[CubeFace.FRONT][0][i] = val;
        pattern[CubeFace.BOTTOM][last][i] = val;
    }

    // TOP <-> BACK (top's top edge = back's top edge, reversed)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.TOP][last][i] || pattern[CubeFace.BACK][last][last - i];
        pattern[CubeFace.TOP][last][i] = val;
        pattern[CubeFace.BACK][last][last - i] = val;
    }

    // BOTTOM <-> BACK (bottom's bottom edge = back's bottom edge, reversed)
    for (let i = 0; i < gridSize; i++) {
        const val = pattern[CubeFace.BOTTOM][0][i] || pattern[CubeFace.BACK][0][last - i];
        pattern[CubeFace.BOTTOM][0][i] = val;
        pattern[CubeFace.BACK][0][last - i] = val;
    }
}

/**
 * Ensure the puzzle has minimum complexity (not too empty or too full)
 */
function ensureMinimumComplexity(
    pattern: Record<CubeFace, boolean[][]>,
    gridSize: number,
    rng: SeededRandom,
    _targetDensity: number
): void {
    const totalCells = gridSize * gridSize * 6;
    const minFilled = Math.floor(totalCells * 0.15);
    const maxFilled = Math.floor(totalCells * 0.7);

    let filledCount = 0;
    for (const face of ALL_FACES) {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (pattern[face][y][x]) filledCount++;
            }
        }
    }

    // If too empty, add some cells
    while (filledCount < minFilled) {
        const face = ALL_FACES[rng.nextInt(0, ALL_FACES.length)];
        const x = rng.nextInt(0, gridSize);
        const y = rng.nextInt(0, gridSize);
        if (!pattern[face][y][x]) {
            pattern[face][y][x] = true;
            filledCount++;
        }
    }

    // If too full, remove some cells
    while (filledCount > maxFilled) {
        const face = ALL_FACES[rng.nextInt(0, ALL_FACES.length)];
        const x = rng.nextInt(0, gridSize);
        const y = rng.nextInt(0, gridSize);
        if (pattern[face][y][x]) {
            pattern[face][y][x] = false;
            filledCount--;
        }
    }

    // Ensure each face has at least some cells
    for (const face of ALL_FACES) {
        let faceCount = 0;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (pattern[face][y][x]) faceCount++;
            }
        }

        const minPerFace = Math.floor(gridSize * gridSize * 0.1);
        while (faceCount < minPerFace) {
            const x = rng.nextInt(0, gridSize);
            const y = rng.nextInt(0, gridSize);
            if (!pattern[face][y][x]) {
                pattern[face][y][x] = true;
                faceCount++;
            }
        }
    }
}

/**
 * Calculate clues for a single row or column
 * Returns an array of consecutive group sizes
 */
function calculateLineClue(line: boolean[]): NonogramClue {
    const clue: number[] = [];
    let currentGroup = 0;

    for (const cell of line) {
        if (cell) {
            currentGroup++;
        } else if (currentGroup > 0) {
            clue.push(currentGroup);
            currentGroup = 0;
        }
    }

    if (currentGroup > 0) {
        clue.push(currentGroup);
    }

    // Empty row/column has clue [0]
    return clue.length > 0 ? clue : [0];
}

/**
 * Generate clues for a single face (non-wrapping, just this face's cells)
 */
function generateFaceClues(pattern: boolean[][], gridSize: number): FaceClues {
    const rows: NonogramClue[] = [];
    const cols: NonogramClue[] = [];

    // Row clues (read left to right)
    for (let y = 0; y < gridSize; y++) {
        rows.push(calculateLineClue(pattern[y]));
    }

    // Column clues (read top to bottom)
    for (let x = 0; x < gridSize; x++) {
        const column: boolean[] = [];
        for (let y = 0; y < gridSize; y++) {
            column.push(pattern[y][x]);
        }
        cols.push(calculateLineClue(column));
    }

    return { rows, cols };
}

/**
 * Nonogram game implementation for the cube
 */
export class NonogramGame extends BaseGame<NonogramGameState, NonogramAction> {
    readonly id = 'nonogram';
    readonly name = 'Nonogram';
    readonly description = 'Solve picture puzzles on each face using number clues!';
    readonly gridSize: number;
    readonly playerCount = 1;
    readonly activeFaces = 6;
    readonly maxMistakes: number;
    private seed: number;
    private strategy: GeneratorStrategy | undefined;

    constructor(config: NonogramConfig = DEFAULT_CONFIG, seed?: number, strategy?: GeneratorStrategy) {
        super();
        this.gridSize = config.gridSize;
        this.maxMistakes = config.maxMistakes;
        this.seed = seed ?? generateSeed();
        this.strategy = strategy;
    }

    /**
     * Get the seed used for this puzzle (for sharing/reproducing)
     */
    getSeed(): number {
        return this.seed;
    }

    init(): NonogramGameState {
        const cells = new Map<string, NonogramCell>();
        const clues = new Map<CubeFace, FaceClues>();

        // Generate the puzzle pattern procedurally
        const { pattern } = generatePuzzlePattern(
            this.gridSize,
            this.seed,
            0.4, // fill density
            this.strategy
        );

        // Initialize cells and generate clues for all faces
        for (const face of ALL_FACES) {
            const facePattern = pattern[face];

            // Create cells with solution
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const key = posKey({ face, x, y });
                    cells.set(key, {
                        solution: facePattern[y][x],
                        state: NonogramCellState.UNKNOWN,
                    });
                }
            }

            // Generate clues for this face (non-wrapping, just this face)
            clues.set(face, generateFaceClues(facePattern, this.gridSize));
        }

        return {
            pieces: [],
            cells,
            clues,
            gridSize: this.gridSize,
            isGameOver: false,
            isWon: false,
            mistakes: 0,
            maxMistakes: this.maxMistakes,
            revealedHint: null,
            completedFaces: new Set(),
            winner: undefined,
        };
    }

    isValidAction(state: NonogramGameState, action: NonogramAction): boolean {
        if (state.isGameOver) return false;

        const key = posKey(action.payload);
        const cell = state.cells.get(key);
        if (!cell) return false;

        switch (action.type) {
            case 'fill':
            case 'markEmpty':
                // Can only interact with unknown cells
                return cell.state === NonogramCellState.UNKNOWN;
            case 'clear':
                // Can clear any non-unknown cell
                return cell.state !== NonogramCellState.UNKNOWN;
            case 'hint':
                // Can use hint on unknown cells
                return cell.state === NonogramCellState.UNKNOWN;
            default:
                return false;
        }
    }

    applyAction(state: NonogramGameState, action: NonogramAction): NonogramGameState {
        const newCells = new Map(state.cells);
        const key = posKey(action.payload);
        const cell = newCells.get(key)!;
        let mistakes = state.mistakes;
        let revealedHint: CubePosition | null = null;

        switch (action.type) {
            case 'fill':
                if (cell.solution) {
                    // Correct fill
                    newCells.set(key, { ...cell, state: NonogramCellState.FILLED });
                } else {
                    // Wrong fill - mark as mistake and reveal it's empty
                    mistakes++;
                    newCells.set(key, { ...cell, state: NonogramCellState.EMPTY });
                }
                break;

            case 'markEmpty':
                // Mark as empty (player thinks it should be empty)
                newCells.set(key, { ...cell, state: NonogramCellState.EMPTY });
                break;

            case 'clear':
                // Reset to unknown
                newCells.set(key, { ...cell, state: NonogramCellState.UNKNOWN });
                break;

            case 'hint':
                // Reveal the correct state for this cell
                revealedHint = action.payload;
                const correctState = cell.solution ? NonogramCellState.FILLED : NonogramCellState.EMPTY;
                newCells.set(key, { ...cell, state: correctState });
                break;
        }

        // Check for completed faces
        const completedFaces = new Set(state.completedFaces);
        for (const face of ALL_FACES) {
            if (this.isFaceComplete(newCells, face, this.gridSize)) {
                completedFaces.add(face);
            } else {
                completedFaces.delete(face);
            }
        }

        // Check win/lose conditions
        const isWon = this.checkWinCondition(newCells);
        const isGameOver = isWon || mistakes >= this.maxMistakes;

        return {
            ...state,
            cells: newCells,
            mistakes,
            isWon,
            isGameOver,
            revealedHint,
            completedFaces,
            winner: isWon ? 1 : undefined,
        };
    }

    /**
     * Check if a face is completely and correctly solved
     */
    private isFaceComplete(cells: Map<string, NonogramCell>, face: CubeFace, gridSize: number): boolean {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const key = posKey({ face, x, y });
                const cell = cells.get(key);
                if (!cell) return false;

                // For a face to be complete:
                // - All solution=true cells must be FILLED
                // - All solution=false cells must be EMPTY or UNKNOWN (we're lenient on marking empties)
                if (cell.solution && cell.state !== NonogramCellState.FILLED) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Check if the puzzle is completely solved
     */
    private checkWinCondition(cells: Map<string, NonogramCell>): boolean {
        for (const [, cell] of cells) {
            // All cells that should be filled must be filled
            if (cell.solution && cell.state !== NonogramCellState.FILLED) {
                return false;
            }
        }
        return true;
    }

    checkGameOver(state: NonogramGameState): { isOver: boolean; winner?: number } {
        return {
            isOver: state.isGameOver,
            winner: state.isWon ? 1 : undefined,
        };
    }

    getValidActions(state: NonogramGameState): NonogramAction[] {
        const actions: NonogramAction[] = [];

        if (state.isGameOver) return actions;

        for (const [key, cell] of state.cells) {
            const pos = parseKey(key);

            if (cell.state === NonogramCellState.UNKNOWN) {
                actions.push({ type: 'fill', payload: pos });
                actions.push({ type: 'markEmpty', payload: pos });
                actions.push({ type: 'hint', payload: pos });
            } else {
                actions.push({ type: 'clear', payload: pos });
            }
        }

        return actions;
    }

    getPieces(state: NonogramGameState): GamePieceData[] {
        const pieces: GamePieceData[] = [];

        for (const [key, cell] of state.cells) {
            const pos = parseKey(key);

            let type: string;
            let color: string;

            switch (cell.state) {
                case NonogramCellState.FILLED:
                    type = 'filled';
                    color = '#3b82f6'; // blue
                    break;
                case NonogramCellState.EMPTY:
                    type = 'empty';
                    color = '#ef4444'; // red X
                    break;
                default:
                    type = 'unknown';
                    color = '#64748b'; // gray
            }

            pieces.push({
                id: key,
                type,
                position: pos,
                rotation: 0,
                color,
                metadata: {
                    solution: cell.solution,
                },
            });
        }

        return pieces;
    }

    /**
     * Get clues for a specific face
     */
    getCluesForFace(state: NonogramGameState, face: CubeFace): FaceClues | undefined {
        return state.clues.get(face);
    }

    /**
     * Check if a specific row on a face is complete
     */
    isRowComplete(state: NonogramGameState, face: CubeFace, row: number): boolean {
        for (let x = 0; x < this.gridSize; x++) {
            const key = posKey({ face, x, y: row });
            const cell = state.cells.get(key);
            if (cell?.solution && cell.state !== NonogramCellState.FILLED) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if a specific column on a face is complete
     */
    isColComplete(state: NonogramGameState, face: CubeFace, col: number): boolean {
        for (let y = 0; y < this.gridSize; y++) {
            const key = posKey({ face, x: col, y });
            const cell = state.cells.get(key);
            if (cell?.solution && cell.state !== NonogramCellState.FILLED) {
                return false;
            }
        }
        return true;
    }

    /**
     * Create a new puzzle with a specific seed (for reproducibility)
     */
    static createWithSeed(seed: number, strategy?: GeneratorStrategy, config: NonogramConfig = DEFAULT_CONFIG): NonogramGame {
        return new NonogramGame(config, seed, strategy);
    }

    /**
     * Create a new puzzle with a specific strategy
     */
    static createWithStrategy(strategy: GeneratorStrategy, config: NonogramConfig = DEFAULT_CONFIG): NonogramGame {
        return new NonogramGame(config, undefined, strategy);
    }

    /**
     * Create a new random puzzle
     */
    static createRandom(config: NonogramConfig = DEFAULT_CONFIG): NonogramGame {
        return new NonogramGame(config);
    }

    /**
     * Generate a random seed
     */
    static getRandomSeed(): number {
        return generateSeed();
    }

    /**
     * Get available generation strategies
     */
    static getStrategies(): GeneratorStrategy[] {
        return ['noise', 'symmetric', 'blob', 'lines', 'mixed'];
    }
}

// Export types for external use
export type { GeneratorStrategy };

// Create singleton instance with random puzzle
export const nonogramGame = new NonogramGame();
