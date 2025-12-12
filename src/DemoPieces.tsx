import { useState } from 'react';
import { GamePiece, ChessPawn, ChessRook, ChessKnight, ChessBishop, ChessQueen, ChessKing, SnakeHead, SnakeSegment } from '@/components';
import { CubeFace, DEFAULT_CUBE_CONFIG } from '@/types';

/**
 * Demo pieces to showcase the framework capabilities
 */
export function DemoPieces() {
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);

    const config = DEFAULT_CUBE_CONFIG;

    return (
        <group>
            {/* Chess pieces on FRONT face - white side */}
            <GamePiece
                position={{ face: CubeFace.FRONT, x: 0, y: 1 }}
                config={config}
                selected={selectedPiece === 'pawn1'}
                hovered={hoveredPiece === 'pawn1'}
                onClick={() => setSelectedPiece(selectedPiece === 'pawn1' ? null : 'pawn1')}
                onPointerEnter={() => setHoveredPiece('pawn1')}
                onPointerLeave={() => setHoveredPiece(null)}
            >
                <ChessPawn color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 1, y: 1 }}
                config={config}
                selected={selectedPiece === 'pawn2'}
                hovered={hoveredPiece === 'pawn2'}
                onClick={() => setSelectedPiece(selectedPiece === 'pawn2' ? null : 'pawn2')}
                onPointerEnter={() => setHoveredPiece('pawn2')}
                onPointerLeave={() => setHoveredPiece(null)}
            >
                <ChessPawn color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 2, y: 1 }}
                config={config}
            >
                <ChessPawn color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 0, y: 0 }}
                config={config}
                selected={selectedPiece === 'rook1'}
                hovered={hoveredPiece === 'rook1'}
                onClick={() => setSelectedPiece(selectedPiece === 'rook1' ? null : 'rook1')}
                onPointerEnter={() => setHoveredPiece('rook1')}
                onPointerLeave={() => setHoveredPiece(null)}
            >
                <ChessRook color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 1, y: 0 }}
                config={config}
            >
                <ChessKnight color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 2, y: 0 }}
                config={config}
            >
                <ChessBishop color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 3, y: 0 }}
                config={config}
            >
                <ChessQueen color="#f0f0f0" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.FRONT, x: 4, y: 0 }}
                config={config}
            >
                <ChessKing color="#f0f0f0" />
            </GamePiece>

            {/* Chess pieces on BACK face - black side */}
            <GamePiece
                position={{ face: CubeFace.BACK, x: 0, y: 1 }}
                config={config}
            >
                <ChessPawn color="#333333" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.BACK, x: 1, y: 1 }}
                config={config}
            >
                <ChessPawn color="#333333" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.BACK, x: 0, y: 0 }}
                config={config}
            >
                <ChessRook color="#333333" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.BACK, x: 1, y: 0 }}
                config={config}
            >
                <ChessKnight color="#333333" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.BACK, x: 3, y: 0 }}
                config={config}
            >
                <ChessQueen color="#333333" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.BACK, x: 4, y: 0 }}
                config={config}
            >
                <ChessKing color="#333333" />
            </GamePiece>

            {/* Snake on RIGHT face - demonstrating connected pieces */}
            <GamePiece
                position={{ face: CubeFace.RIGHT, x: 3, y: 4 }}
                config={config}
            >
                <SnakeHead color="#16a34a" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.RIGHT, x: 2, y: 4 }}
                config={config}
            >
                <SnakeSegment color="#22c55e" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.RIGHT, x: 1, y: 4 }}
                config={config}
            >
                <SnakeSegment color="#4ade80" />
            </GamePiece>

            <GamePiece
                position={{ face: CubeFace.RIGHT, x: 0, y: 4 }}
                config={config}
            >
                <SnakeSegment color="#86efac" />
            </GamePiece>

            {/* Apple for snake */}
            <GamePiece
                position={{ face: CubeFace.RIGHT, x: 5, y: 3 }}
                config={config}
            >
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
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
                    </mesh>
                    {/* Stem */}
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
            </GamePiece>

            {/* Tetris-like blocks on LEFT face */}
            {/* T-piece */}
            <GamePiece position={{ face: CubeFace.LEFT, x: 2, y: 0 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#a855f7" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 3, y: 0 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#a855f7" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 4, y: 0 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#a855f7" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 3, y: 1 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#a855f7" />
                </mesh>
            </GamePiece>

            {/* L-piece */}
            <GamePiece position={{ face: CubeFace.LEFT, x: 5, y: 0 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#f97316" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 5, y: 1 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#f97316" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 5, y: 2 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#f97316" />
                </mesh>
            </GamePiece>
            <GamePiece position={{ face: CubeFace.LEFT, x: 6, y: 0 }} config={config}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color="#f97316" />
                </mesh>
            </GamePiece>

            {/* Wordle-like tiles on TOP face */}
            {/* Word: CUBES */}
            {['C', 'U', 'B', 'E', 'S'].map((_letter, i) => (
                <GamePiece
                    key={`wordle-${i}`}
                    position={{ face: CubeFace.TOP, x: i + 1, y: 4 }}
                    config={config}
                >
                    <mesh castShadow>
                        <boxGeometry args={[0.42, 0.08, 0.42]} />
                        <meshStandardMaterial color={
                            i === 0 || i === 4 ? '#22c55e' : // Green: correct
                                i === 2 ? '#eab308' : // Yellow: wrong position
                                    '#6b7280' // Gray: not in word
                        } />
                    </mesh>
                </GamePiece>
            ))}

            {/* Second wordle attempt */}
            {['G', 'A', 'M', 'E', 'S'].map((_letter, i) => (
                <GamePiece
                    key={`wordle2-${i}`}
                    position={{ face: CubeFace.TOP, x: i + 1, y: 3 }}
                    config={config}
                >
                    <mesh castShadow>
                        <boxGeometry args={[0.42, 0.08, 0.42]} />
                        <meshStandardMaterial color={
                            i === 4 ? '#22c55e' : // Green: correct (S)
                                i === 3 ? '#eab308' : // Yellow: wrong position (E)
                                    '#6b7280' // Gray
                        } />
                    </mesh>
                </GamePiece>
            ))}
        </group>
    );
}
