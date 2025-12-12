import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControllerProps {
    enableWASD?: boolean;
    enableOrbit?: boolean;
    moveSpeed?: number;
    rotateSpeed?: number;
    minDistance?: number;
    maxDistance?: number;
    enableDamping?: boolean;
    dampingFactor?: number;
}

/**
 * Combined camera controller that supports:
 * - Click + drag to orbit around the cube (OrbitControls)
 * - WASD keys to pan/orbit the camera
 */
export function CameraController({
    enableWASD = true,
    enableOrbit = true,
    moveSpeed = 2,
    rotateSpeed = 0.5,
    minDistance = 5,
    maxDistance = 20,
    enableDamping = true,
    dampingFactor = 0.05,
}: CameraControllerProps) {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { camera, gl } = useThree();

    // Track which keys are currently pressed
    const keysPressed = useRef<Set<string>>(new Set());

    // Keyboard event handlers
    useEffect(() => {
        if (!enableWASD) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            keysPressed.current.add(e.key.toLowerCase());
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [enableWASD]);

    // Update camera position based on WASD keys
    useFrame((_, delta) => {
        if (!enableWASD || !controlsRef.current) return;

        const keys = keysPressed.current;
        if (keys.size === 0) return;

        const controls = controlsRef.current;

        // Calculate rotation deltas
        let azimuthDelta = 0;
        let polarDelta = 0;

        // A/D rotate horizontally (azimuth)
        if (keys.has('a') || keys.has('arrowleft')) {
            azimuthDelta += rotateSpeed * delta;
        }
        if (keys.has('d') || keys.has('arrowright')) {
            azimuthDelta -= rotateSpeed * delta;
        }

        // W/S rotate vertically (polar)
        if (keys.has('w') || keys.has('arrowup')) {
            polarDelta -= rotateSpeed * delta;
        }
        if (keys.has('s') || keys.has('arrowdown')) {
            polarDelta += rotateSpeed * delta;
        }

        // Apply rotations to OrbitControls
        if (azimuthDelta !== 0 || polarDelta !== 0) {
            // Get current spherical coordinates
            const spherical = new THREE.Spherical();
            const offset = camera.position.clone().sub(controls.target);
            spherical.setFromVector3(offset);

            // Apply deltas
            spherical.theta += azimuthDelta;
            spherical.phi += polarDelta;

            // Allow full rotation - clamp phi to valid range but allow going over the poles
            // by wrapping theta when phi goes past 0 or PI
            if (spherical.phi < 0.001) {
                spherical.phi = 0.001;
                spherical.theta += Math.PI; // Flip to other side
            } else if (spherical.phi > Math.PI - 0.001) {
                spherical.phi = Math.PI - 0.001;
                spherical.theta += Math.PI; // Flip to other side
            }

            // Convert back to position
            offset.setFromSpherical(spherical);
            camera.position.copy(controls.target).add(offset);
            camera.lookAt(controls.target);
        }

        // Q/E for zoom in/out
        if (keys.has('q')) {
            const direction = camera.position.clone().sub(controls.target).normalize();
            camera.position.add(direction.multiplyScalar(moveSpeed * delta));
        }
        if (keys.has('e')) {
            const direction = camera.position.clone().sub(controls.target).normalize();
            camera.position.sub(direction.multiplyScalar(moveSpeed * delta));
        }

        // Clamp distance
        const distance = camera.position.distanceTo(controls.target);
        if (distance < minDistance) {
            const direction = camera.position.clone().sub(controls.target).normalize();
            camera.position.copy(controls.target).add(direction.multiplyScalar(minDistance));
        }
        if (distance > maxDistance) {
            const direction = camera.position.clone().sub(controls.target).normalize();
            camera.position.copy(controls.target).add(direction.multiplyScalar(maxDistance));
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            args={[camera, gl.domElement]}
            enableRotate={enableOrbit}
            enablePan={false}
            enableZoom={true}
            minDistance={minDistance}
            maxDistance={maxDistance}
            minPolarAngle={0.001}
            maxPolarAngle={Math.PI - 0.001}
            enableDamping={enableDamping}
            dampingFactor={dampingFactor}
            rotateSpeed={rotateSpeed}
            target={[0, 0, 0]}
        />
    );
}

/**
 * Hook to get the OrbitControls ref for programmatic camera control
 */
export function useCameraControls() {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    return controlsRef;
}
