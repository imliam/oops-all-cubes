import * as THREE from 'three';
import { CubeFace, CubePosition, GameState, GameAction, GamePieceData } from '@/types';
import { BaseGame } from '@/games/base/Game';
import { movePosition, positionsEqual, transformDirectionAcrossEdge } from '@/utils/faceTransitions';
import { FACE_NORMALS } from '@/utils/cubeCoordinates';

// Snake-specific types
export interface SnakeGameState extends GameState {
    snake: CubePosition[];
    direction: SnakeDirection;
    nextDirection: SnakeDirection;
    food: CubePosition;
    score: number;
    speed: number;
    isGameOver: boolean;
    isPaused: boolean;
    gridSize: number;
    cameraUp: { x: number; y: number; z: number }; // Track camera up for direction transforms
}

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export interface SnakeMoveAction extends GameAction {
    type: 'move';
}

export interface SnakeChangeDirectionAction extends GameAction {
    type: 'changeDirection';
    payload: SnakeDirection;
}

export interface SnakePauseAction extends GameAction {
    type: 'pause';
}

export interface SnakeResumeAction extends GameAction {
    type: 'resume';
}

export type SnakeAction = SnakeMoveAction | SnakeChangeDirectionAction | SnakePauseAction | SnakeResumeAction;

// Direction to movement delta mapping
const DIRECTION_DELTAS: Record<SnakeDirection, { dx: number; dy: number }> = {
    up: { dx: 0, dy: 1 },
    down: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

// Opposite directions (can't reverse into yourself)
const OPPOSITE_DIRECTIONS: Record<SnakeDirection, SnakeDirection> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};

/**
 * Snake game implementation for the cube
 */
export class SnakeGame extends BaseGame<SnakeGameState, SnakeAction> {
    readonly id = 'snake';
    readonly name = 'Snake';
    readonly description = 'Classic snake game on a 3D cube';
    readonly gridSize = 8;
    readonly playerCount = 1;
    readonly activeFaces = 6;

    init(): SnakeGameState {
        const initialSnake: CubePosition[] = [
            { face: CubeFace.FRONT, x: 4, y: 4 },
            { face: CubeFace.FRONT, x: 3, y: 4 },
            { face: CubeFace.FRONT, x: 2, y: 4 },
        ];

        return {
            pieces: [],
            snake: initialSnake,
            direction: 'right',
            nextDirection: 'right',
            food: this.spawnFood(initialSnake),
            score: 0,
            speed: 200, // ms per move
            isGameOver: false,
            isPaused: false,
            gridSize: this.gridSize,
            winner: undefined,
            cameraUp: { x: 0, y: 1, z: 0 }, // Start looking at FRONT with up = Y+
        };
    }

    /**
     * Spawn food at a random position not occupied by the snake
     */
    private spawnFood(snake: CubePosition[]): CubePosition {
        const allFaces: CubeFace[] = [
            CubeFace.FRONT,
            CubeFace.BACK,
            CubeFace.LEFT,
            CubeFace.RIGHT,
            CubeFace.TOP,
            CubeFace.BOTTOM,
        ];

        let position: CubePosition;
        let attempts = 0;
        const maxAttempts = 1000;

        do {
            const face = allFaces[Math.floor(Math.random() * allFaces.length)];
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            position = { face, x, y };
            attempts++;
        } while (
            snake.some((segment) => positionsEqual(segment, position)) &&
            attempts < maxAttempts
        );

        return position;
    }

    isValidAction(state: SnakeGameState, action: SnakeAction): boolean {
        if (state.isGameOver && action.type !== 'pause') return false;

        switch (action.type) {
            case 'move':
                return !state.isPaused;
            case 'changeDirection':
                // Can't reverse direction
                return action.payload !== OPPOSITE_DIRECTIONS[state.direction];
            case 'pause':
            case 'resume':
                return true;
            default:
                return false;
        }
    }

    applyAction(state: SnakeGameState, action: SnakeAction): SnakeGameState {
        switch (action.type) {
            case 'changeDirection':
                if (action.payload !== OPPOSITE_DIRECTIONS[state.direction]) {
                    return { ...state, nextDirection: action.payload };
                }
                return state;

            case 'pause':
                return { ...state, isPaused: true };

            case 'resume':
                return { ...state, isPaused: false };

            case 'move':
                return this.moveSnake(state);

            default:
                return state;
        }
    }

    private moveSnake(state: SnakeGameState): SnakeGameState {
        if (state.isPaused || state.isGameOver) return state;

        const { snake, nextDirection, food, score, gridSize, cameraUp } = state;
        let direction = nextDirection;
        const delta = DIRECTION_DELTAS[direction];

        // Calculate new head position
        const head = snake[0];
        const newHead = movePosition(head, delta, gridSize);

        // Track camera up vector for direction transformations
        let newCameraUp = cameraUp;

        // If we crossed to a new face, transform the direction to maintain visual continuity
        if (newHead.face !== head.face) {
            const cameraUpVec = new THREE.Vector3(cameraUp.x, cameraUp.y, cameraUp.z);
            direction = transformDirectionAcrossEdge(head.face, direction, cameraUpVec);

            // Update camera up using the same quaternion rotation as the camera system
            const fromNormal = FACE_NORMALS[head.face].clone();
            const toNormal = FACE_NORMALS[newHead.face].clone();
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(fromNormal, toNormal);
            cameraUpVec.applyQuaternion(quaternion).normalize();
            newCameraUp = { x: cameraUpVec.x, y: cameraUpVec.y, z: cameraUpVec.z };
        }

        // Check for self-collision
        const hitSelf = snake.some((segment) => positionsEqual(segment, newHead));
        if (hitSelf) {
            return { ...state, isGameOver: true, direction, cameraUp: newCameraUp };
        }

        // Check if eating food
        const eatingFood = positionsEqual(newHead, food);

        // Create new snake array
        const newSnake = [newHead, ...snake];
        if (!eatingFood) {
            newSnake.pop(); // Remove tail if not eating
        }

        // Spawn new food if eaten
        const newFood = eatingFood ? this.spawnFood(newSnake) : food;
        const newScore = eatingFood ? score + 10 : score;

        // Increase speed every 50 points
        const newSpeed = Math.max(80, 200 - Math.floor(newScore / 50) * 20);

        // Debug: log snake positions
        console.log('Snake positions:', newSnake.map((s, i) => `${i}: ${s.face}(${s.x},${s.y})`).join(' | '));

        return {
            ...state,
            snake: newSnake,
            direction,
            nextDirection: direction, // Update nextDirection too so player input is relative to new orientation
            food: newFood,
            score: newScore,
            speed: newSpeed,
            cameraUp: newCameraUp,
        };
    }

    checkGameOver(state: SnakeGameState): { isOver: boolean; winner?: number } {
        return { isOver: state.isGameOver };
    }

    getValidActions(state: SnakeGameState): SnakeAction[] {
        const actions: SnakeAction[] = [];

        if (!state.isGameOver) {
            if (state.isPaused) {
                actions.push({ type: 'resume' });
            } else {
                actions.push({ type: 'move' });
                actions.push({ type: 'pause' });

                // Add valid direction changes
                const directions: SnakeDirection[] = ['up', 'down', 'left', 'right'];
                for (const dir of directions) {
                    if (dir !== OPPOSITE_DIRECTIONS[state.direction]) {
                        actions.push({ type: 'changeDirection', payload: dir });
                    }
                }
            }
        }

        return actions;
    }

    getPieces(state: SnakeGameState): GamePieceData[] {
        const pieces: GamePieceData[] = [];

        // Snake segments
        state.snake.forEach((segment, index) => {
            pieces.push({
                id: `snake-${index}`,
                type: index === 0 ? 'snake-head' : 'snake-segment',
                position: segment,
                rotation: this.getSegmentRotation(state, index),
                color: index === 0 ? '#16a34a' : this.getSegmentColor(index, state.snake.length),
            });
        });

        // Food
        pieces.push({
            id: 'food',
            type: 'food',
            position: state.food,
            rotation: 0,
            color: '#ef4444',
        });

        return pieces;
    }

    private getSegmentRotation(state: SnakeGameState, index: number): number {
        if (index === 0) {
            // Head rotation based on direction
            switch (state.direction) {
                case 'up': return 0;
                case 'right': return 90;
                case 'down': return 180;
                case 'left': return 270;
            }
        }
        return 0;
    }

    private getSegmentColor(index: number, length: number): string {
        // Gradient from head to tail
        const t = index / length;
        const r = Math.round(34 + t * 100);
        const g = Math.round(197 - t * 50);
        const b = Math.round(94 - t * 20);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Export singleton instance
export const snakeGame = new SnakeGame();
