import { GameState, GameAction, GamePieceData } from '@/types';

/**
 * Abstract game interface that all cube games must implement
 */
export interface Game<TState extends GameState = GameState, TAction extends GameAction = GameAction> {
  /** Unique identifier for the game type */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Game description */
  readonly description: string;

  /** Grid size for each cube face */
  readonly gridSize: number;

  /** Number of players */
  readonly playerCount: number;

  /** Whether the game uses all 6 faces or just some (e.g., Tetris uses 4) */
  readonly activeFaces: number;

  /** Initialize a new game state */
  init(): TState;

  /** Check if an action is valid given current state */
  isValidAction(state: TState, action: TAction): boolean;

  /** Apply an action to the state and return new state */
  applyAction(state: TState, action: TAction): TState;

  /** Check if the game is over and determine winner */
  checkGameOver(state: TState): { isOver: boolean; winner?: number };

  /** Get all valid actions for the current player */
  getValidActions(state: TState): TAction[];

  /** Get pieces to render for current state */
  getPieces(state: TState): GamePieceData[];
}

/**
 * Base class with common game functionality
 */
export abstract class BaseGame<TState extends GameState, TAction extends GameAction>
  implements Game<TState, TAction>
{
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly gridSize: number;
  abstract readonly playerCount: number;
  abstract readonly activeFaces: number;

  abstract init(): TState;
  abstract isValidAction(state: TState, action: TAction): boolean;
  abstract applyAction(state: TState, action: TAction): TState;
  abstract checkGameOver(state: TState): { isOver: boolean; winner?: number };
  abstract getValidActions(state: TState): TAction[];

  getPieces(state: TState): GamePieceData[] {
    return state.pieces;
  }

  /**
   * Get the next player in turn order
   */
  protected getNextPlayer(currentPlayer: number): number {
    return (currentPlayer % this.playerCount) + 1;
  }

  /**
   * Generate unique piece ID
   */
  protected generatePieceId(): string {
    return `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Game registry for managing available games
 */
export class GameRegistry {
  private games: Map<string, Game> = new Map();

  register<TState extends GameState, TAction extends GameAction>(
    game: Game<TState, TAction>
  ): void {
    this.games.set(game.id, game as unknown as Game);
  }

  get(id: string): Game | undefined {
    return this.games.get(id);
  }

  getAll(): Game[] {
    return Array.from(this.games.values());
  }

  has(id: string): boolean {
    return this.games.has(id);
  }
}

// Global game registry instance
export const gameRegistry = new GameRegistry();
