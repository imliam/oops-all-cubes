import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CubeConfig, CubeFace, DEFAULT_CUBE_CONFIG } from '@/types';

interface CubeFaceProps {
    face: CubeFace;
    config: CubeConfig;
    children?: React.ReactNode;
}

/**
 * Individual face of the game cube with grid overlay
 */
export function CubeFaceComponent({ face, config, children }: CubeFaceProps) {
    const { size, gridSize, showGrid, gridColor, faceColors } = config;
    const halfSize = size / 2;

    // Calculate face position and rotation
    const { position, rotation } = useMemo(() => {
        switch (face) {
            case CubeFace.FRONT:
                return { position: [0, 0, halfSize] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };
            case CubeFace.BACK:
                return { position: [0, 0, -halfSize] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] };
            case CubeFace.RIGHT:
                return { position: [halfSize, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] };
            case CubeFace.LEFT:
                return { position: [-halfSize, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number] };
            case CubeFace.TOP:
                return { position: [0, halfSize, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] };
            case CubeFace.BOTTOM:
                return { position: [0, -halfSize, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] };
        }
    }, [face, halfSize]);

    // Create grid lines geometry
    const gridLines = useMemo(() => {
        if (!showGrid) return null;

        const points: THREE.Vector3[] = [];
        const cellSize = size / gridSize;

        // Vertical lines
        for (let i = 0; i <= gridSize; i++) {
            const x = i * cellSize - halfSize;
            points.push(new THREE.Vector3(x, -halfSize, 0.001));
            points.push(new THREE.Vector3(x, halfSize, 0.001));
        }

        // Horizontal lines
        for (let i = 0; i <= gridSize; i++) {
            const y = i * cellSize - halfSize;
            points.push(new THREE.Vector3(-halfSize, y, 0.001));
            points.push(new THREE.Vector3(halfSize, y, 0.001));
        }

        return new THREE.BufferGeometry().setFromPoints(points);
    }, [size, gridSize, halfSize, showGrid]);

    return (
        <group position={position} rotation={rotation}>
            {/* Face plane */}
            <mesh>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial
                    color={faceColors[face]}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Grid overlay */}
            {showGrid && gridLines && (
                <lineSegments geometry={gridLines}>
                    <lineBasicMaterial color={gridColor} transparent opacity={0.3} />
                </lineSegments>
            )}

            {/* Children (game pieces, etc.) */}
            {children}
        </group>
    );
}

interface GameCubeProps {
    config?: Partial<CubeConfig>;
    children?: React.ReactNode;
}

/**
 * Main game cube component
 * Renders all 6 faces with configurable grid overlay
 */
export function GameCube({ config: configOverrides, children }: GameCubeProps) {
    const config: CubeConfig = { ...DEFAULT_CUBE_CONFIG, ...configOverrides };

    const faces = [
        CubeFace.FRONT,
        CubeFace.BACK,
        CubeFace.LEFT,
        CubeFace.RIGHT,
        CubeFace.TOP,
        CubeFace.BOTTOM,
    ];

    return (
        <group>
            {/* Solid cube to block raycasts through gaps - slightly smaller to sit behind faces */}
            <mesh
                onPointerOver={(e) => e.stopPropagation()}
                onPointerOut={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <boxGeometry args={[config.size * 0.99, config.size * 0.99, config.size * 0.99]} />
                <meshStandardMaterial color="#1a1a2e" />
            </mesh>

            {faces.map(face => (
                <CubeFaceComponent key={face} face={face} config={config} />
            ))}

            {/* Cube edges for visual definition */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(config.size, config.size, config.size)]} />
                <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
            </lineSegments>

            {children}
        </group>
    );
}
