import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CubePosition, CubeConfig, DEFAULT_CUBE_CONFIG } from '@/types';
import { cubeToWorld, getFaceRotation, FACE_NORMALS } from '@/utils/cubeCoordinates';

interface GamePieceProps {
    position: CubePosition;
    config?: Partial<CubeConfig>;
    color?: string;
    scale?: number;
    hovered?: boolean;
    selected?: boolean;
    surfaceOffset?: number;
    onClick?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    children?: React.ReactNode;
}

/**
 * Base game piece component that positions itself on the cube surface
 * Renders children (the actual 3D piece geometry) at the correct position
 */
export function GamePiece({
    position,
    config: configOverrides,
    color = '#ffffff',
    scale = 1,
    hovered = false,
    selected = false,
    surfaceOffset = 0.15,
    onClick,
    onPointerEnter,
    onPointerLeave,
    children,
}: GamePieceProps) {
    const config: CubeConfig = { ...DEFAULT_CUBE_CONFIG, ...configOverrides };
    const groupRef = useRef<THREE.Group>(null);

    // Calculate world position and rotation
    const { worldPos, faceRotation, normal } = useMemo(() => {
        const worldPosition = cubeToWorld(position, config);
        const rotation = getFaceRotation(position.face);
        const faceNormal = FACE_NORMALS[position.face].clone();
        return {
            worldPos: new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z),
            faceRotation: rotation,
            normal: faceNormal,
        };
    }, [position, config]);

    // Hover/select animation
    const targetScale = selected ? scale * 1.15 : hovered ? scale * 1.05 : scale;
    const targetY = selected ? 0.2 : hovered ? 0.1 : 0;

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        // Smooth scale animation
        groupRef.current.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            delta * 10
        );

        // Smooth lift animation (local Y offset)
        const currentY = groupRef.current.position.y;
        const newY = THREE.MathUtils.lerp(currentY, targetY, delta * 10);
        groupRef.current.position.y = newY;
    });

    // Calculate height offset to sit on cube surface
    // Offset outward along face normal so pieces float above the surface
    // (surfaceOffset is now a prop, defaulting to 0.15)

    return (
        <group
            position={[
                worldPos.x + normal.x * surfaceOffset,
                worldPos.y + normal.y * surfaceOffset,
                worldPos.z + normal.z * surfaceOffset,
            ]}
            rotation={faceRotation}
        >
            <group
                ref={groupRef}
                onClick={onClick}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                {children || (
                    // Default piece: simple cylinder
                    <mesh castShadow>
                        <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                )}
            </group>
        </group>
    );
}

// Pre-made piece shapes for common game pieces

interface PieceShapeProps {
    color?: string;
}

export function ChessPawn({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 0.2, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.38, 0]} castShadow>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}

export function ChessRook({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.18, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.22, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.14, 0.24, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Top */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.12, 0.12, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Battlements */}
            {[0, 90, 180, 270].map((angle) => (
                <mesh
                    key={angle}
                    position={[
                        Math.cos((angle * Math.PI) / 180) * 0.1,
                        0.5,
                        Math.sin((angle * Math.PI) / 180) * 0.1,
                    ]}
                    castShadow
                >
                    <boxGeometry args={[0.06, 0.08, 0.06]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
}

export function ChessKnight({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 0.2, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Head (simplified horse shape) */}
            <mesh position={[0.02, 0.38, 0]} rotation={[0, 0, 0.3]} castShadow>
                <boxGeometry args={[0.1, 0.18, 0.08]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Snout */}
            <mesh position={[0.1, 0.35, 0]} castShadow>
                <boxGeometry args={[0.1, 0.06, 0.06]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}

export function ChessBishop({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.12, 0.3, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.45, 0]} castShadow>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Tip */}
            <mesh position={[0, 0.55, 0]} castShadow>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}

export function ChessQueen({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.19, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.28, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.14, 0.36, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Crown base */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.08, 0.08, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Crown points */}
            {[0, 60, 120, 180, 240, 300].map((angle) => (
                <mesh
                    key={angle}
                    position={[
                        Math.cos((angle * Math.PI) / 180) * 0.08,
                        0.58,
                        Math.sin((angle * Math.PI) / 180) * 0.08,
                    ]}
                    castShadow
                >
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
}

export function ChessKing({ color = '#ffffff' }: PieceShapeProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.19, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Body */}
            <mesh position={[0, 0.3, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.14, 0.4, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Crown base */}
            <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.09, 0.1, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Cross vertical */}
            <mesh position={[0, 0.68, 0]} castShadow>
                <boxGeometry args={[0.04, 0.12, 0.04]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Cross horizontal */}
            <mesh position={[0, 0.7, 0]} castShadow>
                <boxGeometry args={[0.1, 0.04, 0.04]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}

// Generic game pieces

export function SnakeSegment({ color = '#22c55e' }: PieceShapeProps) {
    return (
        <mesh castShadow>
            <boxGeometry args={[0.35, 0.15, 0.35]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}

export function SnakeHead({ color = '#16a34a' }: PieceShapeProps) {
    return (
        <group>
            <mesh castShadow>
                <boxGeometry args={[0.38, 0.18, 0.38]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.12, 0.05, 0.15]} castShadow>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.12, 0.05, 0.15]} castShadow>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Pupils */}
            <mesh position={[0.12, 0.05, 0.19]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[-0.12, 0.05, 0.19]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
        </group>
    );
}

export function TetrisBlock({ color = '#3b82f6' }: PieceShapeProps) {
    return (
        <mesh castShadow>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}

export function WordleTile({ color = '#6b7280', letter: _letter = '' }: PieceShapeProps & { letter?: string }) {
    return (
        <group>
            <mesh castShadow>
                <boxGeometry args={[0.4, 0.08, 0.4]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Letter would be rendered as 3D text or texture */}
        </group>
    );
}
