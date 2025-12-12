import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameCube, GamePiece } from '@/components';
import { CameraController } from '@/controls';
import { CubeFace, CubeConfig, CubePosition } from '@/types';
import {
    NonogramGameState,
    NonogramAction,
    NonogramCellState,
    NonogramGame,
    FaceClues,
} from './NonogramGame';
import { FACE_NORMALS, getFaceRotation } from '@/utils/cubeCoordinates';

const CUBE_CONFIG: CubeConfig = {
    size: 4,
    gridSize: 5,
    showGrid: true,
    gridColor: '#475569',
    faceColors: {
        [CubeFace.TOP]: '#1e293b',
        [CubeFace.BOTTOM]: '#1e293b',
        [CubeFace.FRONT]: '#334155',
        [CubeFace.BACK]: '#334155',
        [CubeFace.LEFT]: '#2d3a4f',
        [CubeFace.RIGHT]: '#2d3a4f',
    },
};

// Colors for the game
const COLORS = {
    filled: '#3b82f6',        // Blue for filled cells
    filledHover: '#60a5fa',   // Lighter blue on hover
    empty: '#ef4444',         // Red X for empty cells
    unknown: '#475569',       // Gray for unknown cells
    unknownHover: '#64748b',  // Lighter gray on hover
    clueComplete: '#22c55e',  // Green for completed clues
    clueIncomplete: '#f8fafc', // White for incomplete clues
};

interface NonogramCellProps {
    position: CubePosition;
    state: NonogramCellState;
    isHovered: boolean;
    onFill: () => void;
    onMarkEmpty: () => void;
    onHover: (hovering: boolean) => void;
    gameOver: boolean;
}

function NonogramCell({
    position,
    state,
    isHovered,
    onFill,
    onMarkEmpty,
    onHover,
    gameOver,
}: NonogramCellProps) {
    const handleClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        if (gameOver) return;

        if (state === NonogramCellState.UNKNOWN) {
            onFill();
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameOver) return;

        if (state === NonogramCellState.UNKNOWN) {
            onMarkEmpty();
        }
    };

    const getCellContent = () => {
        if (state === NonogramCellState.FILLED) {
            return (
                <mesh castShadow>
                    <boxGeometry args={[0.7, 0.7, 0.2]} />
                    <meshStandardMaterial
                        color={isHovered && !gameOver ? COLORS.filledHover : COLORS.filled}
                        metalness={0.3}
                        roughness={0.5}
                        emissive={COLORS.filled}
                        emissiveIntensity={0.1}
                    />
                </mesh>
            );
        }

        if (state === NonogramCellState.EMPTY) {
            return (
                <group>
                    {/* X mark */}
                    <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
                        <boxGeometry args={[0.5, 0.08, 0.08]} />
                        <meshStandardMaterial color={COLORS.empty} />
                    </mesh>
                    <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
                        <boxGeometry args={[0.5, 0.08, 0.08]} />
                        <meshStandardMaterial color={COLORS.empty} />
                    </mesh>
                </group>
            );
        }

        // Unknown state - show subtle cell outline
        return (
            <mesh castShadow>
                <boxGeometry args={[0.65, 0.65, 0.08]} />
                <meshStandardMaterial
                    color={isHovered && !gameOver ? COLORS.unknownHover : COLORS.unknown}
                    metalness={0.1}
                    roughness={0.8}
                    transparent
                    opacity={isHovered ? 0.9 : 0.6}
                />
            </mesh>
        );
    };

    return (
        <GamePiece
            position={position}
            config={CUBE_CONFIG}
            surfaceOffset={0.05}
        >
            {/* Invisible hit area */}
            <mesh
                visible={false}
                onClick={handleClick}
                onContextMenu={handleRightClick as unknown as (e: THREE.Event) => void}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHover(true);
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onHover(false);
                }}
            >
                <boxGeometry args={[0.75, 0.75, 0.3]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {getCellContent()}
        </GamePiece>
    );
}

interface FaceCluesDisplayProps {
    face: CubeFace;
    clues: FaceClues;
    gridSize: number;
    completedRows: boolean[];
    completedCols: boolean[];
}

/**
 * Render clues for a single face as 3D text positioned around the grid
 * with guide lines to make it clear which row/column they relate to
 */
function FaceCluesDisplay({
    face,
    clues,
    gridSize,
    completedRows,
    completedCols,
}: FaceCluesDisplayProps) {
    const normal = FACE_NORMALS[face];
    const rotation = getFaceRotation(face);
    const cubeHalfSize = CUBE_CONFIG.size / 2;
    const cellSize = CUBE_CONFIG.size / gridSize;

    // Position the clues group at the face center
    const facePosition = new THREE.Vector3(
        normal.x * cubeHalfSize,
        normal.y * cubeHalfSize,
        normal.z * cubeHalfSize
    );

    // Offset slightly above the face
    const offset = 0.05;
    facePosition.add(normal.clone().multiplyScalar(offset));

    return (
        <group position={facePosition} rotation={rotation}>
            {/* Row clues (left side) with guide lines */}
            {clues.rows.map((clue, rowIndex) => {
                const clueText = clue.join(' ');
                // rowIndex 0 corresponds to y=0 cells which are at the BOTTOM of the visual display
                // So we need to invert: rowIndex 0 -> bottom, rowIndex (gridSize-1) -> top
                const yPos = (-gridSize / 2 + 0.5 + rowIndex) * cellSize;
                const xPos = -cubeHalfSize - 0.15;
                const isComplete = completedRows[rowIndex];

                // Calculate text width based on content
                const textWidth = Math.max(clueText.length * 0.18 + 0.3, 0.6);
                const guideLineLength = 0.15;

                return (
                    <group key={`row-${rowIndex}`}>
                        {/* Background panel for clue */}
                        <mesh position={[xPos - textWidth / 2, yPos, 0.01]}>
                            <planeGeometry args={[textWidth, cellSize * 0.85]} />
                            <meshBasicMaterial
                                color={isComplete ? '#166534' : '#1e293b'}
                                transparent
                                opacity={0.9}
                            />
                        </mesh>

                        {/* Border around clue panel */}
                        <mesh position={[xPos - textWidth / 2, yPos, 0.008]}>
                            <planeGeometry args={[textWidth + 0.04, cellSize * 0.85 + 0.04]} />
                            <meshBasicMaterial
                                color={isComplete ? '#22c55e' : '#475569'}
                                transparent
                                opacity={0.8}
                            />
                        </mesh>

                        {/* Guide line (thin rectangle) connecting clue to row */}
                        <mesh position={[-cubeHalfSize - guideLineLength / 2, yPos, 0.005]}>
                            <planeGeometry args={[guideLineLength, 0.03]} />
                            <meshBasicMaterial
                                color={isComplete ? '#22c55e' : '#64748b'}
                                transparent
                                opacity={0.7}
                            />
                        </mesh>

                        {/* Clue text */}
                        <Text
                            position={[xPos - textWidth / 2, yPos, 0.02]}
                            fontSize={0.3}
                            color={isComplete ? COLORS.clueComplete : COLORS.clueIncomplete}
                            anchorX="center"
                            anchorY="middle"
                            fontWeight="bold"
                        >
                            {clueText}
                        </Text>
                    </group>
                );
            })}

            {/* Column clues (top side) with guide lines */}
            {clues.cols.map((clue, colIndex) => {
                const clueText = clue.join('\n');
                const xPos = (-gridSize / 2 + 0.5 + colIndex) * cellSize;
                const yPos = cubeHalfSize + 0.15;
                const isComplete = completedCols[colIndex];

                // Calculate text height based on number of clue numbers
                const textHeight = Math.max(clue.length * 0.32 + 0.2, 0.5);
                const guideLineLength = 0.15;

                return (
                    <group key={`col-${colIndex}`}>
                        {/* Background panel for clue */}
                        <mesh position={[xPos, yPos + textHeight / 2, 0.01]}>
                            <planeGeometry args={[cellSize * 0.85, textHeight]} />
                            <meshBasicMaterial
                                color={isComplete ? '#166534' : '#1e293b'}
                                transparent
                                opacity={0.9}
                            />
                        </mesh>

                        {/* Border around clue panel */}
                        <mesh position={[xPos, yPos + textHeight / 2, 0.008]}>
                            <planeGeometry args={[cellSize * 0.85 + 0.04, textHeight + 0.04]} />
                            <meshBasicMaterial
                                color={isComplete ? '#22c55e' : '#475569'}
                                transparent
                                opacity={0.8}
                            />
                        </mesh>

                        {/* Guide line (thin rectangle) connecting clue to column */}
                        <mesh position={[xPos, cubeHalfSize + guideLineLength / 2, 0.005]}>
                            <planeGeometry args={[0.03, guideLineLength]} />
                            <meshBasicMaterial
                                color={isComplete ? '#22c55e' : '#64748b'}
                                transparent
                                opacity={0.7}
                            />
                        </mesh>

                        {/* Clue text */}
                        <Text
                            position={[xPos, yPos + textHeight / 2, 0.02]}
                            fontSize={0.28}
                            color={isComplete ? COLORS.clueComplete : COLORS.clueIncomplete}
                            anchorX="center"
                            anchorY="middle"
                            fontWeight="bold"
                            textAlign="center"
                            lineHeight={1.15}
                        >
                            {clueText}
                        </Text>
                    </group>
                );
            })}
        </group>
    );
}

interface NonogramSceneProps {
    gameState: NonogramGameState;
    game: NonogramGame;
    hoveredCell: string | null;
    onFill: (pos: CubePosition) => void;
    onMarkEmpty: (pos: CubePosition) => void;
    onHover: (key: string | null) => void;
}

function NonogramScene({
    gameState,
    game,
    hoveredCell,
    onFill,
    onMarkEmpty,
    onHover,
}: NonogramSceneProps) {
    // Get cell data from state
    const cells = useMemo(() => {
        const result: Array<{
            key: string;
            position: CubePosition;
            state: NonogramCellState;
        }> = [];

        for (const [key, cell] of gameState.cells) {
            const [face, x, y] = key.split('-');
            result.push({
                key,
                position: { face: face as CubeFace, x: parseInt(x), y: parseInt(y) },
                state: cell.state,
            });
        }

        return result;
    }, [gameState.cells]);

    // Calculate completed rows/cols for each face
    const faceCompletionData = useMemo(() => {
        const data = new Map<CubeFace, { rows: boolean[]; cols: boolean[] }>();

        const allFaces: CubeFace[] = [
            CubeFace.FRONT, CubeFace.BACK, CubeFace.LEFT,
            CubeFace.RIGHT, CubeFace.TOP, CubeFace.BOTTOM
        ];

        for (const face of allFaces) {
            const rows: boolean[] = [];
            const cols: boolean[] = [];

            for (let i = 0; i < gameState.gridSize; i++) {
                rows.push(game.isRowComplete(gameState, face, i));
                cols.push(game.isColComplete(gameState, face, i));
            }

            data.set(face, { rows, cols });
        }

        return data;
    }, [gameState, game]);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight position={[-10, -10, -10]} intensity={0.3} />
            <pointLight position={[0, 10, 0]} intensity={0.3} color="#60a5fa" />

            {/* Background */}
            <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.3} />

            {/* Game Cube */}
            <GameCube config={CUBE_CONFIG} />

            {/* Render cells */}
            {cells.map((cell) => (
                <NonogramCell
                    key={cell.key}
                    position={cell.position}
                    state={cell.state}
                    isHovered={hoveredCell === cell.key}
                    onFill={() => onFill(cell.position)}
                    onMarkEmpty={() => onMarkEmpty(cell.position)}
                    onHover={(hovering) => onHover(hovering ? cell.key : null)}
                    gameOver={gameState.isGameOver}
                />
            ))}

            {/* Render clues for each face */}
            {Array.from(gameState.clues.entries()).map(([face, clues]) => {
                const completion = faceCompletionData.get(face);
                return (
                    <FaceCluesDisplay
                        key={face}
                        face={face}
                        clues={clues}
                        gridSize={gameState.gridSize}
                        completedRows={completion?.rows || []}
                        completedCols={completion?.cols || []}
                    />
                );
            })}

            {/* Camera controls */}
            <CameraController
                enableWASD={true}
                enableOrbit={true}
                rotateSpeed={0.8}
                minDistance={6}
                maxDistance={15}
            />
        </>
    );
}

const uiStyles = {
    overlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none' as const,
    },
    header: {
        position: 'absolute' as const,
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        pointerEvents: 'auto' as const,
    },
    stat: {
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '12px 20px',
        borderRadius: '10px',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    backButton: {
        position: 'absolute' as const,
        top: '20px',
        left: '20px',
        padding: '12px 24px',
        background: 'rgba(99, 102, 241, 0.9)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer',
        pointerEvents: 'auto' as const,
    },
    controls: {
        position: 'absolute' as const,
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 20px',
        borderRadius: '10px',
        color: 'white',
        fontSize: '13px',
        lineHeight: '1.6',
    },
    puzzleSelector: {
        position: 'absolute' as const,
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 20px',
        borderRadius: '10px',
        color: 'white',
        fontSize: '13px',
        pointerEvents: 'auto' as const,
    },
    restartButton: {
        padding: '10px 20px',
        background: 'rgba(251, 191, 36, 0.9)',
        border: 'none',
        borderRadius: '8px',
        color: '#1a1a2e',
        fontSize: '14px',
        fontWeight: 'bold' as const,
        cursor: 'pointer',
        pointerEvents: 'auto' as const,
    },
    gameOver: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '40px 60px',
        borderRadius: '20px',
        textAlign: 'center' as const,
        color: 'white',
        pointerEvents: 'auto' as const,
    },
    gameOverTitle: {
        fontSize: '36px',
        fontWeight: 'bold' as const,
        marginBottom: '10px',
    },
    gameOverSubtitle: {
        fontSize: '20px',
        marginBottom: '30px',
        opacity: 0.8,
    },
    playAgainButton: {
        padding: '15px 40px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold' as const,
        cursor: 'pointer',
        marginRight: '10px',
    },
    progressBar: {
        width: '200px',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden' as const,
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
        borderRadius: '4px',
        transition: 'width 0.3s ease',
    },
};

interface NonogramGameComponentProps {
    onBack: () => void;
}

export function NonogramGameComponent({ onBack }: NonogramGameComponentProps) {
    const [currentSeed, setCurrentSeed] = useState<number>(() => NonogramGame.getRandomSeed());
    const [strategy, setStrategy] = useState<string>('mixed');

    const [game, setGame] = useState<NonogramGame>(() =>
        NonogramGame.createWithSeed(currentSeed, strategy as Parameters<typeof NonogramGame.createWithSeed>[1])
    );

    const [gameState, setGameState] = useState<NonogramGameState>(() => game.init());
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const hoveredCellRef = useRef<string | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        hoveredCellRef.current = hoveredCell;
    }, [hoveredCell]);

    // Calculate progress
    const progress = useMemo(() => {
        let totalFilled = 0;
        let correctFilled = 0;

        for (const [, cell] of gameState.cells) {
            if (cell.solution) {
                totalFilled++;
                if (cell.state === NonogramCellState.FILLED) {
                    correctFilled++;
                }
            }
        }

        return totalFilled > 0 ? (correctFilled / totalFilled) * 100 : 0;
    }, [gameState.cells]);

    const handleFill = useCallback((pos: CubePosition) => {
        setGameState((prev) => {
            const action: NonogramAction = { type: 'fill', payload: pos };
            if (game.isValidAction(prev, action)) {
                return game.applyAction(prev, action);
            }
            return prev;
        });
    }, [game]);

    const handleMarkEmpty = useCallback((pos: CubePosition) => {
        setGameState((prev) => {
            const action: NonogramAction = { type: 'markEmpty', payload: pos };
            if (game.isValidAction(prev, action)) {
                return game.applyAction(prev, action);
            }
            return prev;
        });
    }, [game]);

    const handleRestart = useCallback(() => {
        setGameState(game.init());
    }, [game]);

    const handleNewPuzzle = useCallback((seed?: number, newStrategy?: string) => {
        const newSeed = seed ?? NonogramGame.getRandomSeed();
        const useStrategy = newStrategy ?? strategy;
        setCurrentSeed(newSeed);
        if (newStrategy) setStrategy(newStrategy);
        const newGame = NonogramGame.createWithSeed(
            newSeed,
            useStrategy as Parameters<typeof NonogramGame.createWithSeed>[1]
        );
        setGame(newGame);
        setGameState(newGame.init());
    }, [strategy]);

    // Handle right-click for marking empty
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            if (hoveredCellRef.current && !gameState.isGameOver) {
                const [face, x, y] = hoveredCellRef.current.split('-');
                const pos: CubePosition = { face: face as CubeFace, x: parseInt(x), y: parseInt(y) };
                handleMarkEmpty(pos);
            }
        };
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [gameState.isGameOver, handleMarkEmpty]);

    const completedFacesCount = gameState.completedFaces.size;
    const strategies = NonogramGame.getStrategies();

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 0, 10], fov: 60 }}
                shadows
                gl={{ antialias: true }}
            >
                <NonogramScene
                    gameState={gameState}
                    game={game}
                    hoveredCell={hoveredCell}
                    onFill={handleFill}
                    onMarkEmpty={handleMarkEmpty}
                    onHover={setHoveredCell}
                />
            </Canvas>

            {/* UI Overlay */}
            <div style={uiStyles.overlay}>
                {/* Back button */}
                <button style={uiStyles.backButton} onClick={onBack}>
                    ← Menu
                </button>

                {/* Stats header */}
                <div style={uiStyles.header}>
                    <div style={uiStyles.stat}>
                        🎲 Seed: {currentSeed}
                    </div>
                    <div style={uiStyles.stat}>
                        ✨ {completedFacesCount}/6 Faces
                    </div>
                    <div style={uiStyles.stat}>
                        ❌ {gameState.mistakes}/{gameState.maxMistakes}
                    </div>
                    <div style={uiStyles.stat}>
                        <div style={uiStyles.progressBar}>
                            <div style={{ ...uiStyles.progressFill, width: `${progress}%` }} />
                        </div>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    {!gameState.isGameOver && (
                        <button style={uiStyles.restartButton} onClick={handleRestart}>
                            🔄 Restart
                        </button>
                    )}
                </div>

                {/* Controls help */}
                <div style={uiStyles.controls}>
                    <strong>Controls:</strong><br />
                    🖱️ Left Click: Fill cell<br />
                    🖱️ Right Click: Mark empty (X)<br />
                    🔄 Drag: Rotate cube<br />
                    📷 WASD/Arrows: Pan view<br />
                    <br />
                    <strong>Rules:</strong><br />
                    Numbers show consecutive<br />
                    filled cells in row/column
                </div>

                {/* Puzzle generator */}
                <div style={uiStyles.puzzleSelector}>
                    <strong>Pattern Style:</strong><br />
                    {strategies.map((s) => (
                        <button
                            key={s}
                            onClick={() => handleNewPuzzle(undefined, s)}
                            style={{
                                display: 'block',
                                width: '100%',
                                marginTop: '8px',
                                padding: '8px 16px',
                                background: s === strategy ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                            }}
                        >
                            {s}
                        </button>
                    ))}
                    <button
                        onClick={() => handleNewPuzzle()}
                        style={{
                            display: 'block',
                            width: '100%',
                            marginTop: '16px',
                            padding: '10px 16px',
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        🎲 New Puzzle
                    </button>
                </div>

                {/* Game Over overlay */}
                {gameState.isGameOver && (
                    <div style={uiStyles.gameOver}>
                        <div style={{
                            ...uiStyles.gameOverTitle,
                            color: gameState.isWon ? '#22c55e' : '#ef4444',
                        }}>
                            {gameState.isWon ? '🎉 Puzzle Complete!' : '💔 Game Over!'}
                        </div>
                        <div style={uiStyles.gameOverSubtitle}>
                            {gameState.isWon
                                ? `Puzzle #${currentSeed} complete!`
                                : `Too many mistakes on puzzle #${currentSeed}`}
                        </div>
                        <button style={uiStyles.playAgainButton} onClick={handleRestart}>
                            🔄 Try Again
                        </button>
                        <button
                            style={{ ...uiStyles.playAgainButton, background: 'rgba(255,255,255,0.1)' }}
                            onClick={() => handleNewPuzzle()}
                        >
                            🎲 New Puzzle
                        </button>
                        <button
                            style={{ ...uiStyles.playAgainButton, background: 'rgba(255,255,255,0.1)' }}
                            onClick={onBack}
                        >
                            Menu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
