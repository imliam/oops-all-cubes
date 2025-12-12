import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CubePosition, CubeConfig, DEFAULT_CUBE_CONFIG } from '@/types';
import { cubeToWorld, FACE_NORMALS } from '@/utils/cubeCoordinates';

interface SnakeBodyProps {
    segments: CubePosition[];
    config?: Partial<CubeConfig>;
    headColor?: string;
    bodyColor?: string;
    tailColor?: string;
}

/**
 * Renders a smooth, slithery snake body using tube geometry
 * The snake is rendered as one continuous mesh with gradient coloring
 */
export function SnakeBody({
    segments,
    config: configOverrides,
    headColor = '#16a34a',
    bodyColor = '#22c55e',
    tailColor = '#86efac',
}: SnakeBodyProps) {
    const config: CubeConfig = { ...DEFAULT_CUBE_CONFIG, ...configOverrides };
    const meshRef = useRef<THREE.Mesh>(null);
    const eyeLeftRef = useRef<THREE.Mesh>(null);
    const eyeRightRef = useRef<THREE.Mesh>(null);
    const tongueRef = useRef<THREE.Group>(null);
    const timeRef = useRef(0);

    // Convert segment positions to world coordinates with offset from cube surface
    const { curve, points, headPosition, headDirection, headNormal } = useMemo(() => {
        if (segments.length < 2) {
            return { curve: null, points: [], headPosition: null, headDirection: null, headNormal: null };
        }

        const surfaceOffset = 0.25; // How far above the cube surface
        const worldPoints: THREE.Vector3[] = [];

        segments.forEach((segment) => {
            const worldPos = cubeToWorld(segment, config);
            const normal = FACE_NORMALS[segment.face].clone();

            // Position the point above the cube surface
            const point = new THREE.Vector3(
                worldPos.x + normal.x * surfaceOffset,
                worldPos.y + normal.y * surfaceOffset,
                worldPos.z + normal.z * surfaceOffset
            );
            worldPoints.push(point);
        });

        // Add extra points at head and tail for smoother ends
        if (worldPoints.length >= 2) {
            // Extend head slightly in the direction of movement
            const headDir = new THREE.Vector3()
                .subVectors(worldPoints[0], worldPoints[1])
                .normalize();
            const extendedHead = worldPoints[0].clone().add(headDir.multiplyScalar(0.15));
            worldPoints.unshift(extendedHead);

            // Extend tail slightly
            const tailDir = new THREE.Vector3()
                .subVectors(worldPoints[worldPoints.length - 1], worldPoints[worldPoints.length - 2])
                .normalize();
            const extendedTail = worldPoints[worldPoints.length - 1].clone().add(tailDir.multiplyScalar(0.1));
            worldPoints.push(extendedTail);
        }

        // Create a smooth Catmull-Rom curve through the points
        // Using THREE.CurvePath with CubicBezier for type compatibility
        const splineCurve = new (THREE as any).CatmullRomCurve3(worldPoints, false, 'catmullrom', 0.5);

        // Calculate head position and direction for eyes/tongue
        const headPos = worldPoints[0].clone();
        const headDir = new THREE.Vector3()
            .subVectors(worldPoints[0], worldPoints[1])
            .normalize();
        const headNorm = FACE_NORMALS[segments[0].face].clone();

        return {
            curve: splineCurve,
            points: worldPoints,
            headPosition: headPos,
            headDirection: headDir,
            headNormal: headNorm,
        };
    }, [segments, config]);

    // Create tube geometry with varying radius (thicker at head, thinner at tail)
    const geometry = useMemo(() => {
        if (!curve || points.length < 2) {
            return null;
        }

        const tubularSegments = Math.max(segments.length * 8, 32);
        const radialSegments = 12;

        // Create custom tube with varying radius
        const frames = curve.computeFrenetFrames(tubularSegments, false);
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const colorArray: number[] = [];
        const indices: number[] = [];

        // Parse colors
        const headColorObj = new THREE.Color(headColor);
        const bodyColorObj = new THREE.Color(bodyColor);
        const tailColorObj = new THREE.Color(tailColor);

        for (let i = 0; i <= tubularSegments; i++) {
            const t = i / tubularSegments;
            const point = curve.getPointAt(t);
            const normal = frames.normals[i];
            const binormal = frames.binormals[i];

            // Varying radius: thicker near head, smoothly tapers to pointed tail
            const baseRadius = 0.09;
            // Head bulge - slightly thicker at front to blend with head
            const headBulge = Math.max(0, 1 - t * 4) * 0.04;
            // Smooth taper from body to tail - uses smoothstep for natural curve
            const taperStart = 0.5; // Start tapering at 50% along body
            const taperT = Math.max(0, (t - taperStart) / (1 - taperStart));
            const smoothTaper = taperT * taperT * (3 - 2 * taperT); // Smoothstep
            const taper = (1 - smoothTaper * 0.9) * baseRadius - baseRadius + 0.02;
            // Subtle wave for organic feel
            const wave = Math.sin(t * Math.PI * 3) * 0.008 * (1 - t);
            const radius = Math.max(0.02, baseRadius + headBulge + taper + wave);

            // Calculate gradient color
            let color: THREE.Color;
            if (t < 0.15) {
                // Head region
                color = headColorObj.clone();
            } else if (t < 0.7) {
                // Body region - gradient from body to lighter
                const bodyT = (t - 0.15) / 0.55;
                color = bodyColorObj.clone().lerp(tailColorObj, bodyT * 0.3);
            } else {
                // Tail region
                const tailT = (t - 0.7) / 0.3;
                color = bodyColorObj.clone().lerp(tailColorObj, 0.3 + tailT * 0.7);
            }

            for (let j = 0; j <= radialSegments; j++) {
                const v = (j / radialSegments) * Math.PI * 2;
                const sin = Math.sin(v);
                const cos = Math.cos(v);

                // Calculate vertex position
                const x = point.x + radius * (cos * normal.x + sin * binormal.x);
                const y = point.y + radius * (cos * normal.y + sin * binormal.y);
                const z = point.z + radius * (cos * normal.z + sin * binormal.z);

                vertices.push(x, y, z);

                // Normal
                const nx = cos * normal.x + sin * binormal.x;
                const ny = cos * normal.y + sin * binormal.y;
                const nz = cos * normal.z + sin * binormal.z;
                normals.push(nx, ny, nz);

                // UV
                uvs.push(t, j / radialSegments);

                // Color
                colorArray.push(color.r, color.g, color.b);
            }
        }

        // Generate indices - note: winding order determines which side is "front"
        for (let i = 0; i < tubularSegments; i++) {
            for (let j = 0; j < radialSegments; j++) {
                const a = i * (radialSegments + 1) + j;
                const b = (i + 1) * (radialSegments + 1) + j;
                const c = (i + 1) * (radialSegments + 1) + (j + 1);
                const d = i * (radialSegments + 1) + (j + 1);

                // Reversed winding order for outward-facing normals
                indices.push(a, d, b);
                indices.push(b, d, c);
            }
        }

        // Simple head cap - just close the tube opening (hidden by head mesh)
        const headCenter = curve.getPointAt(0);
        const headTangent = curve.getTangentAt(0).normalize();

        // Add center vertex for head cap
        const headCenterIndex = vertices.length / 3;
        vertices.push(headCenter.x, headCenter.y, headCenter.z);
        normals.push(headTangent.x, headTangent.y, headTangent.z);
        uvs.push(0, 0.5);
        colorArray.push(headColorObj.r, headColorObj.g, headColorObj.b);

        // Connect first ring of tube to center point (simple fan cap)
        for (let j = 0; j < radialSegments; j++) {
            indices.push(headCenterIndex, j + 1, j);
        }

        // Add tail tip - simple pointed end
        const tailCenter = curve.getPointAt(1);
        const tailTangent = curve.getTangentAt(1).normalize();

        // Add single point for tail tip
        const tailTipIndex = vertices.length / 3;
        const tailTipOffset = 0.06; // How far the tip extends
        vertices.push(
            tailCenter.x + tailTangent.x * tailTipOffset,
            tailCenter.y + tailTangent.y * tailTipOffset,
            tailCenter.z + tailTangent.z * tailTipOffset
        );
        normals.push(tailTangent.x, tailTangent.y, tailTangent.z);
        uvs.push(1, 0.5);
        colorArray.push(tailColorObj.r, tailColorObj.g, tailColorObj.b);

        // Connect last ring of tube to tail tip point (fan)
        const lastTubeRing = tubularSegments * (radialSegments + 1);
        for (let j = 0; j < radialSegments; j++) {
            const a = lastTubeRing + j;
            const b = lastTubeRing + j + 1;
            indices.push(tailTipIndex, a, b);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
        geo.setIndex(indices);

        return geo;
    }, [curve, points, segments.length, headColor, bodyColor, tailColor]);

    // Animate eyes and tongue
    useFrame((_, delta) => {
        timeRef.current += delta;

        // Animate tongue flickering
        if (tongueRef.current) {
            const flickerSpeed = 8;
            const flickerAmount = Math.sin(timeRef.current * flickerSpeed) * 0.5 + 0.5;
            tongueRef.current.scale.z = 0.5 + flickerAmount * 0.5;

            // Tongue fork wiggle
            const wiggle = Math.sin(timeRef.current * 12) * 0.1;
            tongueRef.current.rotation.y = wiggle;
        }

        // Subtle eye movement
        if (eyeLeftRef.current && eyeRightRef.current) {
            const lookX = Math.sin(timeRef.current * 0.5) * 0.02;
            const lookY = Math.cos(timeRef.current * 0.7) * 0.02;
            eyeLeftRef.current.position.x = lookX;
            eyeLeftRef.current.position.z = lookY;
            eyeRightRef.current.position.x = lookX;
            eyeRightRef.current.position.z = lookY;
        }
    });

    // Calculate head orientation for eyes - must be before conditional return for hooks rules
    const headQuaternion = useMemo(() => {
        if (!headDirection || !headNormal) return new THREE.Quaternion();

        const quat = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();

        // Create rotation matrix with direction as forward
        const up = headNormal.clone();
        const forward = headDirection.clone();
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        const adjustedUp = new THREE.Vector3().crossVectors(forward, right).normalize();

        matrix.makeBasis(right, adjustedUp, forward);
        quat.setFromRotationMatrix(matrix);

        return quat;
    }, [headDirection, headNormal]);

    if (!geometry || !headPosition || !headDirection || !headNormal) {
        return null;
    }

    return (
        <group>
            {/* Main snake body */}
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial
                    vertexColors
                    roughness={0.4}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Snake head - a proper 3D head shape */}
            <group position={headPosition} quaternion={headQuaternion}>
                {/* Main head shape - elongated sphere */}
                <mesh castShadow position={[0, 0.0, 0.02]}>
                    <sphereGeometry args={[0.15, 16, 12]} />
                    <meshStandardMaterial color={headColor} roughness={0.4} metalness={0.1} />
                </mesh>
                {/* Snout - extends forward */}
                <mesh castShadow position={[0, -0.01, 0.16]} scale={[0.75, 0.6, 1.1]}>
                    <sphereGeometry args={[0.1, 12, 10]} />
                    <meshStandardMaterial color={headColor} roughness={0.4} metalness={0.1} />
                </mesh>

                {/* Eyes - positioned on sides of head */}
                <group position={[0.08, 0.07, 0.08]}>
                    {/* Eye socket/brow bump */}
                    <mesh castShadow position={[0, 0.01, 0]}>
                        <sphereGeometry args={[0.045, 10, 10]} />
                        <meshStandardMaterial color="#0f5132" roughness={0.5} />
                    </mesh>
                    {/* Eye white */}
                    <mesh castShadow position={[0.012, 0, 0.018]}>
                        <sphereGeometry args={[0.032, 12, 12]} />
                        <meshStandardMaterial color="#ffffee" />
                    </mesh>
                    {/* Pupil - vertical slit */}
                    <mesh ref={eyeLeftRef} position={[0.02, 0, 0.038]}>
                        <sphereGeometry args={[0.016, 8, 8]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                </group>
                <group position={[-0.08, 0.07, 0.08]}>
                    {/* Eye socket/brow bump */}
                    <mesh castShadow position={[0, 0.01, 0]}>
                        <sphereGeometry args={[0.045, 10, 10]} />
                        <meshStandardMaterial color="#0f5132" roughness={0.5} />
                    </mesh>
                    {/* Eye white */}
                    <mesh castShadow position={[-0.012, 0, 0.018]}>
                        <sphereGeometry args={[0.032, 12, 12]} />
                        <meshStandardMaterial color="#ffffee" />
                    </mesh>
                    {/* Pupil */}
                    <mesh ref={eyeRightRef} position={[-0.02, 0, 0.038]}>
                        <sphereGeometry args={[0.016, 8, 8]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                </group>

                {/* Nostrils */}
                <mesh position={[0.03, 0.01, 0.24]}>
                    <sphereGeometry args={[0.012, 6, 6]} />
                    <meshStandardMaterial color="#0a3d23" />
                </mesh>
                <mesh position={[-0.03, 0.01, 0.24]}>
                    <sphereGeometry args={[0.012, 6, 6]} />
                    <meshStandardMaterial color="#0a3d23" />
                </mesh>

                {/* Tongue */}
                <group ref={tongueRef} position={[0, -0.04, 0.24]}>
                    {/* Main tongue */}
                    <mesh>
                        <boxGeometry args={[0.02, 0.01, 0.12]} />
                        <meshStandardMaterial color="#ff4444" />
                    </mesh>
                    {/* Fork left */}
                    <mesh position={[0.02, 0, 0.07]} rotation={[0, 0.4, 0]}>
                        <boxGeometry args={[0.015, 0.008, 0.04]} />
                        <meshStandardMaterial color="#ff4444" />
                    </mesh>
                    {/* Fork right */}
                    <mesh position={[-0.02, 0, 0.07]} rotation={[0, -0.4, 0]}>
                        <boxGeometry args={[0.015, 0.008, 0.04]} />
                        <meshStandardMaterial color="#ff4444" />
                    </mesh>
                </group>
            </group>
        </group>
    );
}
