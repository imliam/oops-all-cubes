import { useEffect, useCallback, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Text } from '@react-three/drei';
import { GameCube, GamePiece } from '@/components';
import { CameraController } from '@/controls';
import { CubeFace, CubeConfig, CubePosition } from '@/types';
import {
    MinesweeperGameState,
    MinesweeperAction,
    minesweeperGame,
    NUMBER_COLORS,
} from './MinesweeperGame';

const CUBE_CONFIG: CubeConfig = {
    size: 4,
    gridSize: 8,
    showGrid: true,
    gridColor: '#64748b',
    faceColors: {
        [CubeFace.TOP]: '#334155',
        [CubeFace.BOTTOM]: '#334155',
        [CubeFace.FRONT]: '#475569',
        [CubeFace.BACK]: '#475569',
        [CubeFace.LEFT]: '#3f4f63',
        [CubeFace.RIGHT]: '#3f4f63',
    },
};

interface MinesweeperCellProps {
    position: CubePosition;
    type: string;
    color: string;
    adjacentMines: number;
    isHovered: boolean;
    onReveal: () => void;
    onHover: (hovering: boolean) => void;
    gameOver: boolean;
}

function MinesweeperCell({
    position,
    type,
    color,
    adjacentMines,
    isHovered,
    onReveal,
    onHover,
    gameOver,
}: MinesweeperCellProps) {
    const handleClick = () => {
        if (gameOver) return;

        // Left click only reveals unrevealed cells
        // Chord is handled via both-buttons-pressed at the component level
        if (!type.startsWith('number-') && type !== 'empty') {
            onReveal();
        }
    };

    // Cell appearance based on type
    const getCellContent = () => {
        if (type === 'hidden') {
            return (
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.15]} />
                    <meshStandardMaterial
                        color={isHovered && !gameOver ? '#94a3b8' : '#64748b'}
                        metalness={0.3}
                        roughness={0.7}
                    />
                </mesh>
            );
        }

        if (type === 'flagged') {
            return (
                <group>
                    <mesh castShadow>
                        <boxGeometry args={[0.4, 0.4, 0.15]} />
                        <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.7} />
                    </mesh>
                    {/* Flag standing up - rotated so pole is perpendicular to tile */}
                    <group position={[0, 0, 0.08]}>
                        {/* Flag pole - along Z axis (perpendicular to tile) */}
                        <mesh position={[0, 0, 0.15]} castShadow rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.015, 0.02, 0.3, 8]} />
                            <meshStandardMaterial color="#1f2937" />
                        </mesh>
                        {/* Flag - attached to top of pole */}
                        <mesh position={[0.06, 0, 0.24]} castShadow>
                            <boxGeometry args={[0.12, 0.02, 0.08]} />
                            <meshStandardMaterial color="#ef4444" emissive="#ff0000" emissiveIntensity={0.3} />
                        </mesh>
                    </group>
                </group>
            );
        }

        if (type === 'mine') {
            const isExploded = color === '#dc2626';
            return (
                <group>
                    {/* Revealed cell background */}
                    <mesh>
                        <boxGeometry args={[0.4, 0.4, 0.05]} />
                        <meshStandardMaterial color={isExploded ? '#7f1d1d' : '#e5e7eb'} />
                    </mesh>
                    {/* Mine body */}
                    <mesh position={[0, 0, 0.1]} castShadow>
                        <sphereGeometry args={[0.12, 16, 16]} />
                        <meshStandardMaterial
                            color="#1f2937"
                            metalness={0.8}
                            roughness={0.2}
                        />
                    </mesh>
                    {/* Mine spikes */}
                    {[0, 45, 90, 135].map((angle) => (
                        <mesh
                            key={angle}
                            position={[0, 0, 0.1]}
                            rotation={[0, 0, (angle * Math.PI) / 180]}
                            castShadow
                        >
                            <boxGeometry args={[0.3, 0.03, 0.03]} />
                            <meshStandardMaterial color="#1f2937" />
                        </mesh>
                    ))}
                </group>
            );
        }

        if (type === 'empty') {
            return (
                <mesh>
                    <boxGeometry args={[0.4, 0.4, 0.03]} />
                    <meshStandardMaterial color="#e5e7eb" metalness={0.1} roughness={0.9} />
                </mesh>
            );
        }

        if (type.startsWith('number-')) {
            return (
                <group>
                    {/* Revealed cell background */}
                    <mesh>
                        <boxGeometry args={[0.4, 0.4, 0.03]} />
                        <meshStandardMaterial color="#e5e7eb" metalness={0.1} roughness={0.9} />
                    </mesh>
                    {/* Number */}
                    <Text
                        position={[0, 0, 0.05]}
                        fontSize={0.25}
                        color={NUMBER_COLORS[adjacentMines] || '#374151'}
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                    >
                        {adjacentMines}
                    </Text>
                </group>
            );
        }

        return null;
    };

    return (
        <GamePiece
            position={position}
            config={CUBE_CONFIG}
            surfaceOffset={0}
        >
            {/* Invisible hit area for consistent pointer events */}
            <mesh
                visible={false}
                onClick={handleClick}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHover(true);
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onHover(false);
                }}
            >
                <boxGeometry args={[0.45, 0.45, 0.3]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {getCellContent()}
        </GamePiece>
    );
}

interface MinesweeperSceneProps {
    gameState: MinesweeperGameState;
    hoveredCell: string | null;
    onReveal: (pos: CubePosition) => void;
    onHover: (key: string | null) => void;
}

function MinesweeperScene({
    gameState,
    hoveredCell,
    onReveal,
    onHover,
}: MinesweeperSceneProps) {
    const pieces = minesweeperGame.getPieces(gameState);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight position={[-10, -10, -10]} intensity={0.3} />
            <pointLight position={[0, 10, 0]} intensity={0.3} color="#94a3b8" />

            {/* Background */}
            <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.3} />

            {/* Game Cube */}
            <GameCube config={CUBE_CONFIG} />

            {/* Render cells */}
            {pieces.map((piece) => (
                <MinesweeperCell
                    key={piece.id}
                    position={piece.position}
                    type={piece.type}
                    color={piece.color || '#6b7280'}
                    adjacentMines={(piece.metadata?.adjacentMines as number) || 0}
                    isHovered={hoveredCell === piece.id}
                    onReveal={() => onReveal(piece.position)}
                    onHover={(hovering) => onHover(hovering ? piece.id : null)}
                    gameOver={gameState.isGameOver}
                />
            ))}

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

// Format time as MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        fontSize: '20px',
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
    gameOverTime: {
        fontSize: '24px',
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
};

interface MinesweeperGameComponentProps {
    onBack: () => void;
}

export function MinesweeperGameComponent({ onBack }: MinesweeperGameComponentProps) {
    const [gameState, setGameState] = useState<MinesweeperGameState>(() => minesweeperGame.init());
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hoveredCellRef = useRef<string | null>(null);
    const mouseButtonsRef = useRef<Set<number>>(new Set());

    // Keep ref in sync with state for use in event handler
    useEffect(() => {
        hoveredCellRef.current = hoveredCell;
    }, [hoveredCell]);

    // Start timer on first click, stop on game over
    useEffect(() => {
        if (!gameState.isFirstClick && !gameState.isGameOver) {
            // Start timer
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    setTimer((t) => t + 1);
                }, 1000);
            }
        } else if (gameState.isGameOver) {
            // Stop timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameState.isFirstClick, gameState.isGameOver]);

    const handleReveal = useCallback((pos: CubePosition) => {
        setGameState((prev) => {
            const action: MinesweeperAction = { type: 'reveal', payload: pos };
            if (minesweeperGame.isValidAction(prev, action)) {
                return minesweeperGame.applyAction(prev, action);
            }
            return prev;
        });
    }, []);

    const handleFlag = useCallback((pos: CubePosition) => {
        setGameState((prev) => {
            const action: MinesweeperAction = { type: 'flag', payload: pos };
            if (minesweeperGame.isValidAction(prev, action)) {
                return minesweeperGame.applyAction(prev, action);
            }
            return prev;
        });
    }, []);

    const handleChord = useCallback((pos: CubePosition) => {
        setGameState((prev) => {
            const action: MinesweeperAction = { type: 'chord', payload: pos };
            if (minesweeperGame.isValidAction(prev, action)) {
                return minesweeperGame.applyAction(prev, action);
            }
            return prev;
        });
    }, []);

    const handleRestart = useCallback(() => {
        setGameState(minesweeperGame.init());
        setTimer(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Track mouse buttons for chord detection (both buttons pressed)
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            mouseButtonsRef.current.add(e.button);

            // Check if both left (0) and right (2) buttons are pressed
            if (mouseButtonsRef.current.has(0) && mouseButtonsRef.current.has(2)) {
                if (hoveredCellRef.current && !gameState.isGameOver) {
                    const [face, x, y] = hoveredCellRef.current.split('-');
                    const pos: CubePosition = { face: face as CubeFace, x: parseInt(x), y: parseInt(y) };
                    handleChord(pos);
                }
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            mouseButtonsRef.current.delete(e.button);
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [gameState.isGameOver, handleChord]);

    // Prevent context menu on right-click and handle flag action
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            // Only flag if we're not chordin (both buttons weren't pressed)
            // Check if left button is also pressed - if so, this is a chord, not a flag
            if (!mouseButtonsRef.current.has(0) && hoveredCellRef.current && !gameState.isGameOver) {
                const [face, x, y] = hoveredCellRef.current.split('-');
                const pos: CubePosition = { face: face as CubeFace, x: parseInt(x), y: parseInt(y) };
                handleFlag(pos);
            }
        };
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [gameState.isGameOver, handleFlag]);

    const minesRemaining = gameState.totalMines - gameState.flagCount;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 60 }}
                shadows
                gl={{ antialias: true }}
            >
                <MinesweeperScene
                    gameState={gameState}
                    hoveredCell={hoveredCell}
                    onReveal={handleReveal}
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
                        💣 {minesRemaining}
                    </div>
                    <div style={uiStyles.stat}>
                        ⏱️ {formatTime(timer)}
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
                    🖱️ Left Click: Reveal cell<br />
                    🖱️ Right Click: Flag/unflag<br />
                    🖱️ Both Buttons: Chord reveal<br />
                    🔄 Drag: Rotate cube<br />
                    📷 WASD/Arrows: Pan view
                </div>

                {/* Game Over overlay */}
                {gameState.isGameOver && (
                    <div style={uiStyles.gameOver}>
                        <div style={{
                            ...uiStyles.gameOverTitle,
                            color: gameState.isWon ? '#22c55e' : '#ef4444',
                        }}>
                            {gameState.isWon ? '🎉 You Won!' : '💥 Game Over!'}
                        </div>
                        <div style={uiStyles.gameOverTime}>
                            Time: {formatTime(timer)}
                        </div>
                        <button style={uiStyles.playAgainButton} onClick={handleRestart}>
                            🔄 Play Again
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
