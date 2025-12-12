import { useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { CubeFace } from '@/types';
import { getFaceCameraPosition, getFaceCameraUp, FACE_NORMALS, FACE_UP_VECTORS } from '@/utils/cubeCoordinates';
import { SnakeDirection } from '@/games/snake/SnakeGame';

/**
 * Get the "right" vector for a face (perpendicular to up and normal).
 * This completes the coordinate frame for each face.
 */
function getFaceRightVector(face: CubeFace): THREE.Vector3 {
    const normal = FACE_NORMALS[face].clone();
    const up = FACE_UP_VECTORS[face].clone();
    // Right = Up × Normal (cross product gives perpendicular vector)
    return new THREE.Vector3().crossVectors(up, normal).normalize();
}

/**
 * Calculate the control rotation based on the camera's actual up vector vs the face's game coordinate up.
 *
 * @param cameraUp - The camera's current up vector (in world coordinates)
 * @param face - The face being viewed
 * @returns Rotation steps (0-3), where each step is 90° clockwise
 */
function calculateVisualRotation(cameraUp: THREE.Vector3, face: CubeFace): number {
    const gameUp = FACE_UP_VECTORS[face].clone();
    const gameRight = getFaceRightVector(face);

    // Calculate the angle between camera up and game up, projected onto the face plane
    const dotUp = cameraUp.dot(gameUp);
    const dotRight = cameraUp.dot(gameRight);

    // angle = how much camera up is rotated from game up (toward game right)
    const angle = Math.atan2(dotRight, dotUp);

    // Convert to quarter turns (0, 1, 2, 3)
    let quarterTurns = Math.round(angle / (Math.PI / 2));

    // Normalize to 0-3 range
    quarterTurns = ((quarterTurns % 4) + 4) % 4;

    return quarterTurns;
}

interface UseFaceFocusOptions {
    duration?: number;
    ease?: string;
    distance?: number;
    onStart?: (face: CubeFace) => void;
    onComplete?: (face: CubeFace) => void;
}

/**
 * Hook for programmatically animating the camera to focus on a specific cube face
 */
export function useFaceFocus(options: UseFaceFocusOptions = {}) {
    const {
        duration = 0.8,
        ease = 'power2.inOut',
        distance = 8,
        onStart,
        onComplete,
    } = options;

    const { camera } = useThree();
    const isAnimating = useRef(false);
    const currentAnimation = useRef<gsap.core.Tween | null>(null);

    // Track the camera's up vector explicitly (for calculating control rotation)
    // This is updated after each face transition animation completes
    const trackedCameraUp = useRef(new THREE.Vector3(0, 1, 0));

    // Track the current face being viewed
    const currentFaceRef = useRef<CubeFace>(CubeFace.FRONT);

    /**
     * Animate the camera to focus on a specific face of the cube (snaps to front-on view)
     */
    const focusOnFace = useCallback((face: CubeFace) => {
        if (isAnimating.current && currentAnimation.current) {
            currentAnimation.current.kill();
        }

        isAnimating.current = true;
        onStart?.(face);

        const targetPosition = getFaceCameraPosition(face, distance);
        const targetUp = getFaceCameraUp(face);

        // Animate camera position
        currentAnimation.current = gsap.to(camera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration,
            ease,
            onUpdate: () => {
                camera.lookAt(0, 0, 0);
                // Smoothly interpolate up vector
                camera.up.lerp(targetUp, 0.1);
            },
            onComplete: () => {
                camera.up.copy(targetUp);
                camera.lookAt(0, 0, 0);
                trackedCameraUp.current.copy(targetUp);
                currentFaceRef.current = face;
                isAnimating.current = false;
                onComplete?.(face);
            },
        });
    }, [camera, distance, duration, ease, onStart, onComplete]);

    /**
     * Transform a player input direction based on the current camera orientation.
     * This maps screen-relative directions to game-world directions.
     *
     * Uses the tracked camera up vector (which is immediately updated on face transitions)
     * to ensure consistent control mapping even during camera animations.
     */
    const transformDirection = useCallback((inputDir: SnakeDirection): SnakeDirection => {
        const directions: SnakeDirection[] = ['up', 'right', 'down', 'left'];
        const currentIndex = directions.indexOf(inputDir);

        // Use the tracked up vector, which represents where the camera WILL be
        // after any in-progress animation completes
        const rotation = calculateVisualRotation(trackedCameraUp.current, currentFaceRef.current);

        // Rotate input by visual rotation to get game direction
        const newIndex = (currentIndex + rotation) % 4;
        return directions[newIndex];
    }, []);

    /**
     * Reset the camera orientation and animate back to FRONT face view.
     * Used when starting a new game.
     */
    const resetRotation = useCallback(() => {
        // Reset tracking state
        trackedCameraUp.current.set(0, 1, 0);
        currentFaceRef.current = CubeFace.FRONT;

        // Animate camera back to FRONT face view
        if (currentAnimation.current) {
            currentAnimation.current.kill();
        }

        const targetPosition = getFaceCameraPosition(CubeFace.FRONT, distance);
        const targetUp = new THREE.Vector3(0, 1, 0);

        gsap.to(camera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: duration * 0.5, // Faster reset animation
            ease: 'power2.out',
            onUpdate: () => {
                camera.lookAt(0, 0, 0);
                camera.up.lerp(targetUp, 0.2);
            },
            onComplete: () => {
                camera.up.copy(targetUp);
                camera.lookAt(0, 0, 0);
            },
        });
    }, [camera, distance, duration]);

    /**
     * Update tracking when snake crosses to a new face.
     * This calculates the new camera up vector after the transition.
     */
    const updateRotationForTransition = useCallback((fromFace: CubeFace, toFace: CubeFace, _travelDirection: SnakeDirection) => {
        if (fromFace === toFace) return;

        // Calculate the quaternion for the face transition
        const fromNormal = FACE_NORMALS[fromFace].clone();
        const toNormal = FACE_NORMALS[toFace].clone();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(fromNormal, toNormal);

        // Update tracked camera up by applying the rotation
        trackedCameraUp.current.applyQuaternion(quaternion).normalize();
        currentFaceRef.current = toFace;
    }, []);

    /**
     * Rotate the camera to see a new face while maintaining relative orientation.
     * This keeps the viewing angle consistent as the subject moves across faces.
     */
    const rotateToFace = useCallback((fromFace: CubeFace, toFace: CubeFace) => {
        if (fromFace === toFace) return;

        if (isAnimating.current && currentAnimation.current) {
            currentAnimation.current.kill();
        }

        isAnimating.current = true;
        onStart?.(toFace);

        // Get current camera position in spherical coordinates
        const currentPos = camera.position.clone();
        const currentDistance = currentPos.length();

        // Get the normals for both faces
        const fromNormal = FACE_NORMALS[fromFace].clone();
        const toNormal = FACE_NORMALS[toFace].clone();

        // Calculate the rotation needed to go from one face to another
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(fromNormal, toNormal);

        // Apply this rotation to the current camera position
        const targetPosition = currentPos.clone().applyQuaternion(quaternion);
        // Normalize and scale to maintain distance
        targetPosition.normalize().multiplyScalar(currentDistance);

        // Also rotate the up vector
        const currentUp = camera.up.clone();
        const targetUp = currentUp.clone().applyQuaternion(quaternion);

        // Animate camera position
        currentAnimation.current = gsap.to(camera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration,
            ease,
            onUpdate: () => {
                camera.lookAt(0, 0, 0);
                // Smoothly interpolate up vector
                camera.up.lerp(targetUp, 0.15);
            },
            onComplete: () => {
                camera.up.copy(targetUp).normalize();
                camera.lookAt(0, 0, 0);
                isAnimating.current = false;
                onComplete?.(toFace);
            },
        });
    }, [camera, duration, ease, onStart, onComplete]);

    /**
     * Animate camera position along a path (useful for following pieces across edges)
     */
    const animateAlongPath = useCallback((
        positions: THREE.Vector3[],
        lookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
        pathDuration: number = duration
    ) => {
        if (positions.length === 0) return;

        if (isAnimating.current && currentAnimation.current) {
            currentAnimation.current.kill();
        }

        isAnimating.current = true;

        const timeline = gsap.timeline({
            onComplete: () => {
                isAnimating.current = false;
            },
        });

        const segmentDuration = pathDuration / positions.length;

        positions.forEach((pos) => {
            timeline.to(camera.position, {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                duration: segmentDuration,
                ease: 'power1.inOut',
                onUpdate: () => {
                    camera.lookAt(lookAt);
                },
            });
        });

        currentAnimation.current = timeline as unknown as gsap.core.Tween;
    }, [camera, duration]);

    /**
     * Get the current face the camera is looking at (approximately)
     */
    const getCurrentFace = useCallback((): CubeFace => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.negate(); // We want the direction FROM camera TO target

        // Find which face normal is closest to the camera direction
        const faces: { face: CubeFace; dot: number }[] = [
            { face: CubeFace.FRONT, dot: direction.dot(new THREE.Vector3(0, 0, 1)) },
            { face: CubeFace.BACK, dot: direction.dot(new THREE.Vector3(0, 0, -1)) },
            { face: CubeFace.LEFT, dot: direction.dot(new THREE.Vector3(-1, 0, 0)) },
            { face: CubeFace.RIGHT, dot: direction.dot(new THREE.Vector3(1, 0, 0)) },
            { face: CubeFace.TOP, dot: direction.dot(new THREE.Vector3(0, 1, 0)) },
            { face: CubeFace.BOTTOM, dot: direction.dot(new THREE.Vector3(0, -1, 0)) },
        ];

        faces.sort((a, b) => b.dot - a.dot);
        return faces[0].face;
    }, [camera]);

    /**
     * Rotate to the next face in order
     */
    const rotateToNextFace = useCallback((clockwise: boolean = true) => {
        const currentFace = getCurrentFace();
        const faceOrder: CubeFace[] = [
            CubeFace.FRONT,
            CubeFace.RIGHT,
            CubeFace.BACK,
            CubeFace.LEFT,
        ];

        const currentIndex = faceOrder.indexOf(currentFace);
        if (currentIndex === -1) {
            // Currently on top or bottom, go to front
            focusOnFace(CubeFace.FRONT);
            return;
        }

        const nextIndex = clockwise
            ? (currentIndex + 1) % faceOrder.length
            : (currentIndex - 1 + faceOrder.length) % faceOrder.length;

        focusOnFace(faceOrder[nextIndex]);
    }, [getCurrentFace, focusOnFace]);

    /**
     * Stop any current camera animation
     */
    const stopAnimation = useCallback(() => {
        if (currentAnimation.current) {
            currentAnimation.current.kill();
            isAnimating.current = false;
        }
    }, []);

    /**
     * Snap the camera to a clean front-on view of the current face being tracked.
     * This resets the camera position to directly face the current face with correct up orientation.
     */
    const snapToCurrentFace = useCallback(() => {
        const face = currentFaceRef.current;

        if (isAnimating.current && currentAnimation.current) {
            currentAnimation.current.kill();
        }

        isAnimating.current = true;
        onStart?.(face);

        const targetPosition = getFaceCameraPosition(face, distance);
        const targetUp = getFaceCameraUp(face);

        // Animate camera to front-on view of current face
        currentAnimation.current = gsap.to(camera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: duration * 0.6, // Slightly faster snap
            ease: 'power2.out',
            onUpdate: () => {
                camera.lookAt(0, 0, 0);
                // Smoothly interpolate up vector
                camera.up.lerp(targetUp, 0.15);
            },
            onComplete: () => {
                camera.up.copy(targetUp);
                camera.lookAt(0, 0, 0);
                trackedCameraUp.current.copy(targetUp);
                isAnimating.current = false;
                onComplete?.(face);
            },
        });
    }, [camera, distance, duration, onStart, onComplete]);

    return {
        focusOnFace,
        rotateToFace,
        animateAlongPath,
        getCurrentFace,
        rotateToNextFace,
        stopAnimation,
        transformDirection,
        resetRotation,
        updateRotationForTransition,
        snapToCurrentFace,
        isAnimating: isAnimating.current,
    };
}

/**
 * Component that provides face focus controls via keyboard shortcuts
 */
export function FaceFocusKeyboardControls() {
    const { focusOnFace, rotateToNextFace } = useFaceFocus();

    // Keyboard shortcuts for quick face navigation
    // 1-6 for direct face access, [ and ] for rotation
    useThree(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case '1':
                    focusOnFace(CubeFace.FRONT);
                    break;
                case '2':
                    focusOnFace(CubeFace.BACK);
                    break;
                case '3':
                    focusOnFace(CubeFace.LEFT);
                    break;
                case '4':
                    focusOnFace(CubeFace.RIGHT);
                    break;
                case '5':
                    focusOnFace(CubeFace.TOP);
                    break;
                case '6':
                    focusOnFace(CubeFace.BOTTOM);
                    break;
                case '[':
                    rotateToNextFace(false);
                    break;
                case ']':
                    rotateToNextFace(true);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    return null;
}
