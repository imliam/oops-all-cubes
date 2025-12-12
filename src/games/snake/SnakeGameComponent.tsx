import { useEffect, useCallback, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { GameCube, GamePiece, SnakeBody } from '@/components';
import { CameraController, useFaceFocus } from '@/controls';
import { CubeFace, CubeConfig } from '@/types';
import { SnakeGameState, SnakeDirection, snakeGame } from './SnakeGame';

const CUBE_CONFIG: CubeConfig = {
    size: 4,
    gridSize: 8,
    showGrid: true,
    gridColor: '#4ade80',
    faceColors: {
        [CubeFace.TOP]: '#1e3a29',
        [CubeFace.BOTTOM]: '#1e3a29',
        [CubeFace.FRONT]: '#162d22',
        [CubeFace.BACK]: '#162d22',
        [CubeFace.LEFT]: '#0f241a',
        [CubeFace.RIGHT]: '#0f241a',
    },
};

interface SnakeGameSceneProps {
    gameState: SnakeGameState;
    gameId: number;
    onMove: () => void;
    onChangeDirection: (dir: SnakeDirection) => void;
    onPause: () => void;
    onResume: () => void;
}

function SnakeGameScene({ gameState, gameId, onChangeDirection }: SnakeGameSceneProps) {
    const { rotateToFace, transformDirection, resetRotation, updateRotationForTransition, snapToCurrentFace } = useFaceFocus({ duration: 0.4 });
    const lastHeadFace = useRef<CubeFace>(CubeFace.FRONT);
    const lastDirection = useRef<SnakeDirection>('right');

    // Track the current direction for face transitions
    useEffect(() => {
        lastDirection.current = gameState.direction;
    }, [gameState.direction]);

    // Reset rotation tracking when game restarts (detected by gameId change)
    useEffect(() => {
        resetRotation();
        lastHeadFace.current = CubeFace.FRONT;
        lastDirection.current = 'right';
    }, [gameId, resetRotation]);

    // Follow the snake head when it changes faces - maintain orientation
    useEffect(() => {
        if (gameState.snake.length > 0) {
            const headFace = gameState.snake[0].face;
            if (headFace !== lastHeadFace.current) {
                // Update the rotation tracking based on face transition and travel direction
                updateRotationForTransition(lastHeadFace.current, headFace, lastDirection.current);
                // Animate the camera
                rotateToFace(lastHeadFace.current, headFace);
                lastHeadFace.current = headFace;
            }
        }
    }, [gameState.snake, rotateToFace, updateRotationForTransition]);

    // Keyboard controls for direction - transform based on camera rotation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            let screenDirection: SnakeDirection | null = null;

            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    screenDirection = 'up';
                    break;
                case 'arrowdown':
                case 's':
                    e.preventDefault();
                    screenDirection = 'down';
                    break;
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    screenDirection = 'left';
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    screenDirection = 'right';
                    break;
                case ' ':
                    e.preventDefault();
                    // Snap camera to front-on view of current face
                    snapToCurrentFace();
                    break;
            }

            if (screenDirection) {
                // Transform the screen direction to game world direction
                const gameDirection = transformDirection(screenDirection);
                onChangeDirection(gameDirection);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onChangeDirection, transformDirection, snapToCurrentFace]);

    const pieces = snakeGame.getPieces(gameState);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight position={[-10, -10, -10]} intensity={0.3} />
            <pointLight position={[0, 10, 0]} intensity={0.5} color="#4ade80" />

            {/* Background */}
            <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />

            {/* Game Cube */}
            <GameCube config={CUBE_CONFIG} />

            {/* Render smooth snake body */}
            <SnakeBody
                segments={gameState.snake}
                config={CUBE_CONFIG}
                headColor="#16a34a"
                bodyColor="#22c55e"
                tailColor="#86efac"
            />

            {/* Render food */}
            {pieces.filter(piece => piece.type === 'food').map((piece) => (
                <GamePiece
                    key={piece.id}
                    position={piece.position}
                    config={CUBE_CONFIG}
                >
                    {piece.type === 'food' && (
                        <group>
                            {/* Outer glow sphere */}
                            <mesh>
                                <sphereGeometry args={[0.45, 24, 24]} />
                                <meshBasicMaterial
                                    color="#fbbf24"
                                    transparent
                                    opacity={0.15}
                                    side={2}
                                    depthWrite={false}
                                />
                            </mesh>
                            {/* Middle glow sphere */}
                            <mesh>
                                <sphereGeometry args={[0.32, 24, 24]} />
                                <meshBasicMaterial
                                    color="#fcd34d"
                                    transparent
                                    opacity={0.25}
                                    side={2}
                                    depthWrite={false}
                                />
                            </mesh>
                            {/* Inner glow sphere */}
                            <mesh>
                                <sphereGeometry args={[0.24, 24, 24]} />
                                <meshBasicMaterial
                                    color="#fef08a"
                                    transparent
                                    opacity={0.35}
                                    side={2}
                                    depthWrite={false}
                                />
                            </mesh>
                            {/* Apple */}
                            <mesh castShadow>
                                <sphereGeometry args={[0.18, 16, 16]} />
                                <meshStandardMaterial color="#ef4444" emissive="#ff0000" emissiveIntensity={0.5} />
                            </mesh>
                            {/* Stem - pointing in local Y */}
                            <mesh position={[0, 0.2, 0]} castShadow>
                                <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
                                <meshStandardMaterial color="#65a30d" />
                            </mesh>
                            {/* Leaf */}
                            <mesh position={[0.04, 0.22, 0]} rotation={[0, 0, 0.5]} castShadow>
                                <sphereGeometry args={[0.035, 8, 8]} />
                                <meshStandardMaterial color="#22c55e" />
                            </mesh>
                        </group>
                    )}
                </GamePiece>
            ))}

            {/* Camera controls - disable WASD since it's used for snake */}
            <CameraController
                enableWASD={false}
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
    score: {
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 30px',
        borderRadius: '10px',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold' as const,
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
    pauseButton: {
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
        color: '#ef4444',
    },
    gameOverScore: {
        fontSize: '24px',
        marginBottom: '30px',
    },
    restartButton: {
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
    pauseOverlay: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '40px 60px',
        borderRadius: '20px',
        textAlign: 'center' as const,
        color: 'white',
        pointerEvents: 'auto' as const,
    },
};

interface SnakeGameComponentProps {
    onBack: () => void;
}

export function SnakeGameComponent({ onBack }: SnakeGameComponentProps) {
    const [gameState, setGameState] = useState<SnakeGameState>(() => snakeGame.init());
    const [gameId, setGameId] = useState(0); // Increments on restart to trigger reset
    const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Game loop
    useEffect(() => {
        if (gameState.isPaused || gameState.isGameOver) {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
                gameLoopRef.current = null;
            }
            return;
        }

        gameLoopRef.current = setInterval(() => {
            setGameState((prev) => snakeGame.applyAction(prev, { type: 'move' }));
        }, gameState.speed);

        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
        };
    }, [gameState.speed, gameState.isPaused, gameState.isGameOver]);

    const handleChangeDirection = useCallback((dir: SnakeDirection) => {
        setGameState((prev) => snakeGame.applyAction(prev, { type: 'changeDirection', payload: dir }));
    }, []);

    const handlePause = useCallback(() => {
        setGameState((prev) => snakeGame.applyAction(prev, { type: 'pause' }));
    }, []);

    const handleResume = useCallback(() => {
        setGameState((prev) => snakeGame.applyAction(prev, { type: 'resume' }));
    }, []);

    const handleRestart = useCallback(() => {
        setGameState(snakeGame.init());
        setGameId(id => id + 1); // Trigger reset in scene
    }, []);

    // Pause with Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (gameState.isPaused) {
                    handleResume();
                } else if (!gameState.isGameOver) {
                    handlePause();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState.isPaused, gameState.isGameOver, handlePause, handleResume]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 60 }}
                shadows
                gl={{ antialias: true }}
            >
                <SnakeGameScene
                    gameState={gameState}
                    gameId={gameId}
                    onMove={() => { }}
                    onChangeDirection={handleChangeDirection}
                    onPause={handlePause}
                    onResume={handleResume}
                />
            </Canvas>

            {/* UI Overlay */}
            <div style={uiStyles.overlay}>
                {/* Back button */}
                <button style={uiStyles.backButton} onClick={onBack}>
                    ← Menu
                </button>

                {/* Score */}
                <div style={uiStyles.header}>
                    <div style={uiStyles.score}>
                        🍎 Score: {gameState.score}
                    </div>
                    {!gameState.isGameOver && !gameState.isPaused && (
                        <button style={uiStyles.pauseButton} onClick={handlePause}>
                            ⏸ Pause
                        </button>
                    )}
                </div>

                {/* Controls help */}
                <div style={uiStyles.controls}>
                    <strong>Controls:</strong><br />
                    🐍 WASD / Arrows: Move snake<br />
                    🖱️ Click + Drag: Rotate view<br />
                    📷 Space: Reset camera view<br />
                    ⏸ Esc: Pause
                </div>

                {/* Pause overlay */}
                {gameState.isPaused && !gameState.isGameOver && (
                    <div style={uiStyles.pauseOverlay}>
                        <div style={{ fontSize: '36px', marginBottom: '20px' }}>⏸ Paused</div>
                        <button style={uiStyles.restartButton} onClick={handleResume}>
                            Resume
                        </button>
                    </div>
                )}

                {/* Game Over overlay */}
                {gameState.isGameOver && (
                    <div style={uiStyles.gameOver}>
                        <div style={uiStyles.gameOverTitle}>💀 Game Over!</div>
                        <div style={uiStyles.gameOverScore}>Final Score: {gameState.score}</div>
                        <button style={uiStyles.restartButton} onClick={handleRestart}>
                            🔄 Play Again
                        </button>
                        <button style={{ ...uiStyles.restartButton, background: 'rgba(255,255,255,0.1)' }} onClick={onBack}>
                            Menu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
