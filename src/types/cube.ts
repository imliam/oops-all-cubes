// Cube face identifiers
export enum CubeFace {
  TOP = 'top',
  BOTTOM = 'bottom',
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
}

// Position on a cube face grid
export interface CubePosition {
  face: CubeFace;
  x: number; // 0 to gridSize-1
  y: number; // 0 to gridSize-1
}

// 3D world position with orientation
export interface WorldPosition {
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

// Edge direction for transitions
export type EdgeDirection = 'top' | 'bottom' | 'left' | 'right';

// Edge transition definition
export interface EdgeTransition {
  fromFace: CubeFace;
  toFace: CubeFace;
  fromEdge: EdgeDirection;
  toEdge: EdgeDirection;
  flipX: boolean;
  flipY: boolean;
  rotationOffset: number; // degrees
}

// Cube configuration
export interface CubeConfig {
  size: number; // Physical size of cube
  gridSize: number; // Grid divisions per face (e.g., 8 for chess)
  showGrid: boolean;
  gridColor: string;
  faceColors: Record<CubeFace, string>;
}

// Camera view state
export interface CameraView {
  face: CubeFace | null;
  distance: number;
  isTransitioning: boolean;
}

// Game piece definition
export interface GamePieceData {
  id: string;
  type: string;
  position: CubePosition;
  rotation: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

// Game state base
export interface GameState {
  pieces: GamePieceData[];
  currentPlayer?: number;
  isGameOver: boolean;
  winner?: number;
}

// Game lifecycle interface
export interface GameLifecycle<T extends GameState = GameState> {
  init(): T;
  update(state: T, action: GameAction): T;
  checkWin(state: T): { isOver: boolean; winner?: number };
}

// Generic game action
export interface GameAction {
  type: string;
  payload?: unknown;
}

// Default cube configuration
export const DEFAULT_CUBE_CONFIG: CubeConfig = {
  size: 4,
  gridSize: 8,
  showGrid: true,
  gridColor: '#ffffff',
  faceColors: {
    [CubeFace.TOP]: '#4a5568',
    [CubeFace.BOTTOM]: '#4a5568',
    [CubeFace.FRONT]: '#2d3748',
    [CubeFace.BACK]: '#2d3748',
    [CubeFace.LEFT]: '#1a202c',
    [CubeFace.RIGHT]: '#1a202c',
  },
};
