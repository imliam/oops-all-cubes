import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import {
    Tetris3DGameState,
    tetris3DGame,
    TETRACUBES,
    Tetracube,
    getPieceCells,
} from './TetrisGame';

// Dimensions
const CUBE_WIDTH = 6;
const CUBE_DEPTH = 6;
const CUBE_HEIGHT = 12;
const CELL_SIZE = 0.5;

// Colors
const WALL_COLOR = '#1e293b';
const GRID_COLOR = '#334155';
const GHOST_OPACITY = 0.2;

/**
 * A single tetris block (cube)
 */
function TetrisBlock({
    position,
    color,
    isGhost = false,
    isPreview = false,
}: {
    position: [number, number, number];
    color: string;
    isGhost?: boolean;
    isPreview?: boolean;
}) {
    const scale = isPreview ? 0.3 : CELL_SIZE * 0.9;

    return (
        <mesh position={position} castShadow={!isGhost}>
            <boxGeometry args={[scale, scale, scale]} />
            <meshStandardMaterial
                color={color}
                transparent={isGhost}
                opacity={isGhost ? GHOST_OPACITY : 1}
                emissive={color}
                emissiveIntensity={isGhost ? 0.05 : 0.2}
            />
        </mesh>
    );
}

/**
 * The wire-frame container (hollow cube)
 */
function WireframeContainer() {
    const width = CUBE_WIDTH * CELL_SIZE;
    const depth = CUBE_DEPTH * CELL_SIZE;
    const height = CUBE_HEIGHT * CELL_SIZE;

    // Offset to center the container
    const offsetX = -width / 2;
    const offsetY = 0;
    const offsetZ = -depth / 2;

    // Create lines for the edges of the container
    const edges = useMemo(() => {
        const lines: [THREE.Vector3, THREE.Vector3][] = [];

        // Bottom face
        lines.push([new THREE.Vector3(0, 0, 0), new THREE.Vector3(width, 0, 0)]);
        lines.push([new THREE.Vector3(width, 0, 0), new THREE.Vector3(width, 0, depth)]);
        lines.push([new THREE.Vector3(width, 0, depth), new THREE.Vector3(0, 0, depth)]);
        lines.push([new THREE.Vector3(0, 0, depth), new THREE.Vector3(0, 0, 0)]);

        // Top face
        lines.push([new THREE.Vector3(0, height, 0), new THREE.Vector3(width, height, 0)]);
        lines.push([new THREE.Vector3(width, height, 0), new THREE.Vector3(width, height, depth)]);
        lines.push([new THREE.Vector3(width, height, depth), new THREE.Vector3(0, height, depth)]);
        lines.push([new THREE.Vector3(0, height, depth), new THREE.Vector3(0, height, 0)]);

        // Vertical edges
        lines.push([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height, 0)]);
        lines.push([new THREE.Vector3(width, 0, 0), new THREE.Vector3(width, height, 0)]);
        lines.push([new THREE.Vector3(width, 0, depth), new THREE.Vector3(width, height, depth)]);
        lines.push([new THREE.Vector3(0, 0, depth), new THREE.Vector3(0, height, depth)]);

        return lines;
    }, [width, height, depth]);

    // Grid lines on the bottom
    const gridLines = useMemo(() => {
        const lines: [THREE.Vector3, THREE.Vector3][] = [];

        // X-direction grid lines on bottom
        for (let z = 0; z <= CUBE_DEPTH; z++) {
            lines.push([
                new THREE.Vector3(0, 0.01, z * CELL_SIZE),
                new THREE.Vector3(width, 0.01, z * CELL_SIZE)
            ]);
        }

        // Z-direction grid lines on bottom
        for (let x = 0; x <= CUBE_WIDTH; x++) {
            lines.push([
                new THREE.Vector3(x * CELL_SIZE, 0.01, 0),
                new THREE.Vector3(x * CELL_SIZE, 0.01, depth)
            ]);
        }

        return lines;
    }, [width, depth]);

    return (
        <group position={[offsetX, offsetY, offsetZ]}>
            {/* Main container edges */}
            {edges.map((points, i) => (
                <Line
                    key={`edge-${i}`}
                    points={points}
                    color="#6366f1"
                    lineWidth={2}
                />
            ))}

            {/* Bottom grid */}
            {gridLines.map((points, i) => (
                <Line
                    key={`grid-${i}`}
                    points={points}
                    color={GRID_COLOR}
                    lineWidth={1}
                    transparent
                    opacity={0.5}
                />
            ))}

            {/* Semi-transparent walls */}
            {/* Bottom */}
            <mesh position={[width / 2, -0.01, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>

            {/* Back wall */}
            <mesh position={[width / 2, height / 2, -0.01]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Left wall */}
            <mesh position={[-0.01, height / 2, depth / 2]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[depth, height]} />
                <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

/**
 * Convert grid coordinates to world position
 */
function gridToWorld(x: number, y: number, z: number): [number, number, number] {
    const offsetX = -CUBE_WIDTH * CELL_SIZE / 2;
    const offsetZ = -CUBE_DEPTH * CELL_SIZE / 2;

    return [
        offsetX + (x + 0.5) * CELL_SIZE,
        (y + 0.5) * CELL_SIZE,
        offsetZ + (z + 0.5) * CELL_SIZE,
    ];
}

/**
 * Render all placed blocks
 */
function PlacedBlocks({ grid }: { grid: Tetris3DGameState['grid'] }) {
    const blocks: { pos: [number, number, number]; color: string; key: string }[] = [];

    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[y].length; z++) {
            for (let x = 0; x < grid[y][z].length; x++) {
                const cell = grid[y][z][x];
                if (cell.filled) {
                    blocks.push({
                        pos: gridToWorld(x, y, z),
                        color: cell.color,
                        key: `block-${x}-${y}-${z}`,
                    });
                }
            }
        }
    }

    return (
        <>
            {blocks.map(({ pos, color, key }) => (
                <TetrisBlock key={key} position={pos} color={color} />
            ))}
        </>
    );
}

/**
 * Render the current falling piece
 */
function CurrentPiece({ piece, isGhost = false }: {
    piece: Tetris3DGameState['currentPiece'];
    isGhost?: boolean;
}) {
    if (!piece) return null;

    const cells = getPieceCells(piece);
    const color = TETRACUBES[piece.type].color;

    return (
        <>
            {cells.map((cell, i) => (
                <TetrisBlock
                    key={`${isGhost ? 'ghost' : 'current'}-${i}`}
                    position={gridToWorld(cell.x, cell.y, cell.z)}
                    color={color}
                    isGhost={isGhost}
                />
            ))}
        </>
    );
}

/**
 * Layer indicator showing which layers are close to complete
 */
function LayerIndicators({ grid }: { grid: Tetris3DGameState['grid'] }) {
    const indicators: { y: number; fillPercent: number }[] = [];

    for (let y = 0; y < grid.length; y++) {
        let filledCells = 0;
        const totalCells = CUBE_WIDTH * CUBE_DEPTH;

        for (let z = 0; z < grid[y].length; z++) {
            for (let x = 0; x < grid[y][z].length; x++) {
                if (grid[y][z][x].filled) filledCells++;
            }
        }

        const fillPercent = filledCells / totalCells;
        if (fillPercent > 0.5) {
            indicators.push({ y, fillPercent });
        }
    }

    const width = CUBE_WIDTH * CELL_SIZE;
    const depth = CUBE_DEPTH * CELL_SIZE;
    const offsetX = -width / 2;
    const offsetZ = -depth / 2;

    return (
        <>
            {indicators.map(({ y, fillPercent }) => (
                <mesh
                    key={`indicator-${y}`}
                    position={[offsetX + width / 2, (y + 0.5) * CELL_SIZE, offsetZ + depth / 2]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[width * 1.05, depth * 1.05]} />
                    <meshBasicMaterial
                        color={fillPercent > 0.8 ? '#fbbf24' : '#6366f1'}
                        transparent
                        opacity={0.1 + fillPercent * 0.2}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </>
    );
}

/**
 * Main 3D Scene
 */
function TetrisScene({ gameState }: { gameState: Tetris3DGameState }) {
    const ghostPiece = tetris3DGame.getGhostPosition(gameState);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
            <directionalLight position={[-10, 10, -10]} intensity={0.3} />
            <pointLight position={[0, CUBE_HEIGHT * CELL_SIZE + 2, 0]} intensity={0.5} color="#6366f1" />

            {/* Background */}
            <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />

            {/* Container */}
            <WireframeContainer />

            {/* Layer indicators */}
            <LayerIndicators grid={gameState.grid} />

            {/* Placed blocks */}
            <PlacedBlocks grid={gameState.grid} />

            {/* Ghost piece (where current piece will land) */}
            {ghostPiece && ghostPiece.position.y !== gameState.currentPiece?.position.y && (
                <CurrentPiece piece={ghostPiece} isGhost />
            )}

            {/* Current falling piece */}
            <CurrentPiece piece={gameState.currentPiece} />

            {/* Camera controls */}
            <OrbitControls
                makeDefault
                enablePan={false}
                minDistance={5}
                maxDistance={20}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2 - 0.1}
                target={[0, CUBE_HEIGHT * CELL_SIZE / 3, 0]}
            />
        </>
    );
}

/**
 * Piece preview component (2D)
 */
function PiecePreview({ type, label }: { type: Tetracube | null; label: string }) {
    if (!type) {
        return (
            <div style={previewStyles.container}>
                <div style={previewStyles.label}>{label}</div>
                <div style={previewStyles.empty}>-</div>
            </div>
        );
    }

    const piece = TETRACUBES[type];
    const cells = piece.cells;

    // Find bounds
    const xs = cells.map(c => c.x);
    const zs = cells.map(c => c.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const width = maxX - minX + 1;
    const depth = maxZ - minZ + 1;

    return (
        <div style={previewStyles.container}>
            <div style={previewStyles.label}>{label}</div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${width}, 18px)`,
                gridTemplateRows: `repeat(${depth}, 18px)`,
                gap: '2px',
                justifyContent: 'center',
            }}>
                {Array.from({ length: depth }, (_, z) =>
                    Array.from({ length: width }, (_, x) => {
                        const isFilled = cells.some(c =>
                            c.x - minX === x && c.z - minZ === z && c.y === 0
                        );
                        return (
                            <div
                                key={`${x}-${z}`}
                                style={{
                                    width: 18,
                                    height: 18,
                                    background: isFilled ? piece.color : 'transparent',
                                    border: isFilled ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                    borderRadius: 3,
                                    boxShadow: isFilled ? `0 0 8px ${piece.color}40` : 'none',
                                }}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

const previewStyles = {
    container: {
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '12px 16px',
        borderRadius: '10px',
        textAlign: 'center' as const,
        backdropFilter: 'blur(10px)',
    },
    label: {
        color: '#9ca3af',
        fontSize: '11px',
        marginBottom: '10px',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
    },
    empty: {
        color: '#4b5563',
        fontSize: '24px',
        padding: '10px',
    },
};

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
    stats: {
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 30px',
        borderRadius: '12px',
        color: 'white',
        display: 'flex',
        gap: '30px',
        backdropFilter: 'blur(10px)',
    },
    stat: {
        textAlign: 'center' as const,
    },
    statValue: {
        fontSize: '28px',
        fontWeight: 'bold' as const,
        color: '#a5b4fc',
        textShadow: '0 0 20px rgba(165, 180, 252, 0.5)',
    },
    statLabel: {
        fontSize: '11px',
        color: '#9ca3af',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
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
        backdropFilter: 'blur(10px)',
    },
    sidebar: {
        position: 'absolute' as const,
        top: '100px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        pointerEvents: 'auto' as const,
    },
    controls: {
        position: 'absolute' as const,
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '16px 20px',
        borderRadius: '12px',
        color: 'white',
        fontSize: '12px',
        lineHeight: '1.8',
        backdropFilter: 'blur(10px)',
    },
    controlGroup: {
        marginBottom: '12px',
    },
    controlTitle: {
        color: '#6366f1',
        fontWeight: 'bold' as const,
        marginBottom: '4px',
        fontSize: '11px',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
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
        background: 'rgba(0, 0, 0, 0.95)',
        padding: '50px 70px',
        borderRadius: '20px',
        textAlign: 'center' as const,
        color: 'white',
        pointerEvents: 'auto' as const,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
    },
    gameOverTitle: {
        fontSize: '42px',
        fontWeight: 'bold' as const,
        marginBottom: '10px',
        color: '#ef4444',
        textShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
    },
    gameOverScore: {
        fontSize: '20px',
        marginBottom: '30px',
        color: '#9ca3af',
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
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    },
    pauseOverlay: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '50px 70px',
        borderRadius: '20px',
        textAlign: 'center' as const,
        color: 'white',
        pointerEvents: 'auto' as const,
        backdropFilter: 'blur(20px)',
    },
};

interface TetrisGameComponentProps {
    onBack: () => void;
}

export function TetrisGameComponent({ onBack }: TetrisGameComponentProps) {
    const [gameState, setGameState] = useState<Tetris3DGameState>(() => tetris3DGame.init());
    const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Game loop (gravity)
    useEffect(() => {
        if (gameState.isPaused || gameState.isGameOver) {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
                gameLoopRef.current = null;
            }
            return;
        }

        gameLoopRef.current = setInterval(() => {
            setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'tick' }));
        }, gameState.fallSpeed);

        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
        };
    }, [gameState.fallSpeed, gameState.isPaused, gameState.isGameOver]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            if (gameState.isGameOver) return;
            if (gameState.isPaused && e.key !== 'Escape') return;

            switch (e.key.toLowerCase()) {
                // Movement (WASD + QE for forward/backward)
                case 'a':
                case 'arrowleft':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'move', payload: 'left' }));
                    break;
                case 'd':
                case 'arrowright':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'move', payload: 'right' }));
                    break;
                case 'w':
                case 'arrowup':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'move', payload: 'forward' }));
                    break;
                case 's':
                case 'arrowdown':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'move', payload: 'backward' }));
                    break;

                // Rotation (IJKL for X/Z rotation, UO for Y rotation)
                case 'i':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'x' }));
                    break;
                case 'k':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'x-' }));
                    break;
                case 'j':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'z' }));
                    break;
                case 'l':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'z-' }));
                    break;
                case 'u':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'y' }));
                    break;
                case 'o':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'rotate', payload: 'y-' }));
                    break;

                // Drop
                case ' ':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'drop', payload: 'hard' }));
                    break;
                case 'shift':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'drop', payload: 'soft' }));
                    break;

                // Hold
                case 'c':
                case 'h':
                    e.preventDefault();
                    setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'hold' }));
                    break;

                // Pause
                case 'escape':
                case 'p':
                    e.preventDefault();
                    if (gameState.isPaused) {
                        setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'resume' }));
                    } else {
                        setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'pause' }));
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState.isPaused, gameState.isGameOver]);

    const handlePause = useCallback(() => {
        setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'pause' }));
    }, []);

    const handleResume = useCallback(() => {
        setGameState((prev) => tetris3DGame.applyAction(prev, { type: 'resume' }));
    }, []);

    const handleRestart = useCallback(() => {
        setGameState(tetris3DGame.init());
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a1a' }}>
            <Canvas
                camera={{ position: [8, 8, 8], fov: 50 }}
                shadows
                gl={{ antialias: true }}
            >
                <TetrisScene gameState={gameState} />
            </Canvas>

            {/* UI Overlay */}
            <div style={uiStyles.overlay}>
                {/* Back button */}
                <button style={uiStyles.backButton} onClick={onBack}>
                    ← Menu
                </button>

                {/* Stats */}
                <div style={uiStyles.header}>
                    <div style={uiStyles.stats}>
                        <div style={uiStyles.stat}>
                            <div style={uiStyles.statValue}>{gameState.score}</div>
                            <div style={uiStyles.statLabel}>Score</div>
                        </div>
                        <div style={uiStyles.stat}>
                            <div style={uiStyles.statValue}>{gameState.level}</div>
                            <div style={uiStyles.statLabel}>Level</div>
                        </div>
                        <div style={uiStyles.stat}>
                            <div style={uiStyles.statValue}>{gameState.layersCleared}</div>
                            <div style={uiStyles.statLabel}>Layers</div>
                        </div>
                    </div>
                    {!gameState.isGameOver && !gameState.isPaused && (
                        <button style={uiStyles.pauseButton} onClick={handlePause}>
                            ⏸ Pause
                        </button>
                    )}
                </div>

                {/* Next & Hold */}
                <div style={uiStyles.sidebar}>
                    <PiecePreview type={gameState.nextPiece} label="Next" />
                    <PiecePreview type={gameState.heldPiece} label="Hold" />
                </div>

                {/* Controls */}
                <div style={uiStyles.controls}>
                    <div style={uiStyles.controlGroup}>
                        <div style={uiStyles.controlTitle}>Move</div>
                        W/S: Forward/Back<br />
                        A/D: Left/Right
                    </div>
                    <div style={uiStyles.controlGroup}>
                        <div style={uiStyles.controlTitle}>Rotate</div>
                        I/K: Pitch (X-axis)<br />
                        J/L: Roll (Z-axis)<br />
                        U/O: Yaw (Y-axis)
                    </div>
                    <div style={uiStyles.controlGroup}>
                        <div style={uiStyles.controlTitle}>Drop</div>
                        Space: Hard drop<br />
                        Shift: Soft drop
                    </div>
                    <div>
                        <div style={uiStyles.controlTitle}>Other</div>
                        C/H: Hold piece<br />
                        Esc/P: Pause<br />
                        🖱️ Drag: Rotate view
                    </div>
                </div>

                {/* Pause overlay */}
                {gameState.isPaused && !gameState.isGameOver && (
                    <div style={uiStyles.pauseOverlay}>
                        <div style={{ fontSize: '42px', marginBottom: '20px' }}>⏸ Paused</div>
                        <button style={uiStyles.restartButton} onClick={handleResume}>
                            Resume
                        </button>
                    </div>
                )}

                {/* Game Over */}
                {gameState.isGameOver && (
                    <div style={uiStyles.gameOver}>
                        <div style={uiStyles.gameOverTitle}>💥 Game Over!</div>
                        <div style={uiStyles.gameOverScore}>
                            Score: {gameState.score}<br />
                            Level: {gameState.level} | Layers: {gameState.layersCleared}
                        </div>
                        <button style={uiStyles.restartButton} onClick={handleRestart}>
                            🔄 Play Again
                        </button>
                        <button
                            style={{ ...uiStyles.restartButton, background: 'rgba(255,255,255,0.1)' }}
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
