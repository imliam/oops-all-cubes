import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameState, GameAction, CubeFace } from '@/types';
import { Game } from './Game';

interface GameManagerState<TState extends GameState = GameState> {
  // Current game instance
  currentGame: Game | null;

  // Current game state
  gameState: TState | null;

  // UI state
  selectedPieceId: string | null;
  hoveredPieceId: string | null;
  currentFace: CubeFace;
  isPaused: boolean;

  // History for undo/redo
  history: TState[];
  historyIndex: number;

  // Actions
  loadGame: (game: Game) => void;
  unloadGame: () => void;
  dispatch: (action: GameAction) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;

  // UI actions
  selectPiece: (id: string | null) => void;
  hoverPiece: (id: string | null) => void;
  setCurrentFace: (face: CubeFace) => void;
  setPaused: (paused: boolean) => void;
}

/**
 * Global game state manager using Zustand
 */
export const useGameStore = create<GameManagerState>()(
  subscribeWithSelector((set, get) => ({
    currentGame: null,
    gameState: null,
    selectedPieceId: null,
    hoveredPieceId: null,
    currentFace: CubeFace.FRONT,
    isPaused: false,
    history: [],
    historyIndex: -1,

    loadGame: (game) => {
      const initialState = game.init();
      set({
        currentGame: game,
        gameState: initialState,
        selectedPieceId: null,
        hoveredPieceId: null,
        history: [initialState],
        historyIndex: 0,
        isPaused: false,
      });
    },

    unloadGame: () => {
      set({
        currentGame: null,
        gameState: null,
        selectedPieceId: null,
        hoveredPieceId: null,
        history: [],
        historyIndex: -1,
      });
    },

    dispatch: (action) => {
      const { currentGame, gameState, history, historyIndex } = get();
      if (!currentGame || !gameState) return;

      // Check if action is valid
      if (!currentGame.isValidAction(gameState, action)) {
        console.warn('Invalid action:', action);
        return;
      }

      // Apply action
      const newState = currentGame.applyAction(gameState, action);

      // Update history (remove any redo states)
      const newHistory = [...history.slice(0, historyIndex + 1), newState];

      set({
        gameState: newState,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedPieceId: null,
      });

      // Check for game over
      const result = currentGame.checkGameOver(newState);
      if (result.isOver) {
        console.log('Game Over! Winner:', result.winner);
      }
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;

      set({
        gameState: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
        selectedPieceId: null,
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;

      set({
        gameState: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
        selectedPieceId: null,
      });
    },

    reset: () => {
      const { currentGame } = get();
      if (!currentGame) return;

      const initialState = currentGame.init();
      set({
        gameState: initialState,
        selectedPieceId: null,
        hoveredPieceId: null,
        history: [initialState],
        historyIndex: 0,
      });
    },

    selectPiece: (id) => set({ selectedPieceId: id }),
    hoverPiece: (id) => set({ hoveredPieceId: id }),
    setCurrentFace: (face) => set({ currentFace: face }),
    setPaused: (paused) => set({ isPaused: paused }),
  }))
);

/**
 * Hook to get game-specific state with proper typing
 */
export function useTypedGameState<TState extends GameState>(): TState | null {
  return useGameStore((state) => state.gameState as TState | null);
}

/**
 * Hook to check if a specific piece is selected
 */
export function useIsPieceSelected(pieceId: string): boolean {
  return useGameStore((state) => state.selectedPieceId === pieceId);
}

/**
 * Hook to check if a specific piece is hovered
 */
export function useIsPieceHovered(pieceId: string): boolean {
  return useGameStore((state) => state.hoveredPieceId === pieceId);
}
