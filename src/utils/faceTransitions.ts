import * as THREE from 'three';
import { CubeFace, CubePosition, EdgeDirection, EdgeTransition } from '@/types';
import { FACE_NORMALS, FACE_UP_VECTORS } from './cubeCoordinates';

/**
 * Complete edge transition map for all 24 edge connections on a cube
 * When moving off an edge of one face, this defines which face and edge you enter
 */
export const EDGE_TRANSITIONS: EdgeTransition[] = [
  // FRONT face edges
  { fromFace: CubeFace.FRONT, toFace: CubeFace.TOP, fromEdge: 'top', toEdge: 'bottom', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.FRONT, toFace: CubeFace.BOTTOM, fromEdge: 'bottom', toEdge: 'top', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.FRONT, toFace: CubeFace.LEFT, fromEdge: 'left', toEdge: 'right', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.FRONT, toFace: CubeFace.RIGHT, fromEdge: 'right', toEdge: 'left', flipX: false, flipY: false, rotationOffset: 0 },

  // BACK face edges
  { fromFace: CubeFace.BACK, toFace: CubeFace.TOP, fromEdge: 'top', toEdge: 'top', flipX: true, flipY: false, rotationOffset: 180 },
  { fromFace: CubeFace.BACK, toFace: CubeFace.BOTTOM, fromEdge: 'bottom', toEdge: 'bottom', flipX: true, flipY: false, rotationOffset: 180 },
  { fromFace: CubeFace.BACK, toFace: CubeFace.RIGHT, fromEdge: 'left', toEdge: 'right', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.BACK, toFace: CubeFace.LEFT, fromEdge: 'right', toEdge: 'left', flipX: false, flipY: false, rotationOffset: 0 },

  // LEFT face edges
  { fromFace: CubeFace.LEFT, toFace: CubeFace.TOP, fromEdge: 'top', toEdge: 'left', flipX: false, flipY: true, rotationOffset: -90 },
  { fromFace: CubeFace.LEFT, toFace: CubeFace.BOTTOM, fromEdge: 'bottom', toEdge: 'left', flipX: false, flipY: false, rotationOffset: 90 },
  { fromFace: CubeFace.LEFT, toFace: CubeFace.BACK, fromEdge: 'left', toEdge: 'right', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.LEFT, toFace: CubeFace.FRONT, fromEdge: 'right', toEdge: 'left', flipX: false, flipY: false, rotationOffset: 0 },

  // RIGHT face edges
  { fromFace: CubeFace.RIGHT, toFace: CubeFace.TOP, fromEdge: 'top', toEdge: 'right', flipX: false, flipY: false, rotationOffset: 90 },
  { fromFace: CubeFace.RIGHT, toFace: CubeFace.BOTTOM, fromEdge: 'bottom', toEdge: 'right', flipX: false, flipY: true, rotationOffset: -90 },
  { fromFace: CubeFace.RIGHT, toFace: CubeFace.FRONT, fromEdge: 'left', toEdge: 'right', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.RIGHT, toFace: CubeFace.BACK, fromEdge: 'right', toEdge: 'left', flipX: false, flipY: false, rotationOffset: 0 },

  // TOP face edges
  { fromFace: CubeFace.TOP, toFace: CubeFace.BACK, fromEdge: 'top', toEdge: 'top', flipX: true, flipY: false, rotationOffset: 180 },
  { fromFace: CubeFace.TOP, toFace: CubeFace.FRONT, fromEdge: 'bottom', toEdge: 'top', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.TOP, toFace: CubeFace.LEFT, fromEdge: 'left', toEdge: 'top', flipX: false, flipY: true, rotationOffset: 90 },
  { fromFace: CubeFace.TOP, toFace: CubeFace.RIGHT, fromEdge: 'right', toEdge: 'top', flipX: false, flipY: false, rotationOffset: -90 },

  // BOTTOM face edges
  { fromFace: CubeFace.BOTTOM, toFace: CubeFace.FRONT, fromEdge: 'top', toEdge: 'bottom', flipX: false, flipY: false, rotationOffset: 0 },
  { fromFace: CubeFace.BOTTOM, toFace: CubeFace.BACK, fromEdge: 'bottom', toEdge: 'bottom', flipX: true, flipY: false, rotationOffset: 180 },
  { fromFace: CubeFace.BOTTOM, toFace: CubeFace.LEFT, fromEdge: 'left', toEdge: 'bottom', flipX: false, flipY: false, rotationOffset: -90 },
  { fromFace: CubeFace.BOTTOM, toFace: CubeFace.RIGHT, fromEdge: 'right', toEdge: 'bottom', flipX: false, flipY: true, rotationOffset: 90 },
];

/**
 * Find the transition for moving off a specific edge of a face
 */
export function getEdgeTransition(
  fromFace: CubeFace,
  edge: EdgeDirection
): EdgeTransition | null {
  return EDGE_TRANSITIONS.find(
    t => t.fromFace === fromFace && t.fromEdge === edge
  ) || null;
}

/**
 * Check if a position is at an edge of the face
 */
export function getEdgeAtPosition(
  position: CubePosition,
  gridSize: number
): EdgeDirection | null {
  const { x, y } = position;

  if (y === gridSize - 1) return 'top';
  if (y === 0) return 'bottom';
  if (x === 0) return 'left';
  if (x === gridSize - 1) return 'right';

  return null;
}

/**
 * Get the edge a piece would cross when moving in a direction
 */
export function getEdgeForDirection(
  position: CubePosition,
  direction: { dx: number; dy: number },
  gridSize: number
): EdgeDirection | null {
  const newX = position.x + direction.dx;
  const newY = position.y + direction.dy;

  if (newY >= gridSize) return 'top';
  if (newY < 0) return 'bottom';
  if (newX < 0) return 'left';
  if (newX >= gridSize) return 'right';

  return null;
}

/**
 * Transform a position when crossing an edge to a new face
 */
export function transformPositionAcrossEdge(
  position: CubePosition,
  direction: { dx: number; dy: number },
  gridSize: number
): CubePosition | null {
  const edge = getEdgeForDirection(position, direction, gridSize);
  if (!edge) {
    // Not crossing an edge, just move normally
    return {
      face: position.face,
      x: position.x + direction.dx,
      y: position.y + direction.dy,
    };
  }

  const transition = getEdgeTransition(position.face, edge);
  if (!transition) return null;

  const { toFace, toEdge, flipX, flipY } = transition;

  // Get the coordinate that runs along the edge we're leaving
  // For top/bottom edges, it's X. For left/right edges, it's Y.
  const edgeCoord = (edge === 'top' || edge === 'bottom') ? position.x : position.y;

  // Start with the edge coordinate
  let transformedCoord = edgeCoord;

  // Apply flip if needed
  // The flip flags indicate whether the coordinate should be inverted when mapping to the new face
  // We apply flip if either flag is set - the flags indicate the coordinate mapping needs inversion
  if (flipX || flipY) {
    transformedCoord = gridSize - 1 - transformedCoord;
  }

  console.log('Edge transition debug:', {
    from: { face: position.face, x: position.x, y: position.y },
    edge,
    toFace,
    toEdge,
    edgeCoord,
    transformedCoord,
    flipX,
    flipY,
  });

  // Place the coordinate on the target face based on which edge we're entering
  // The transformed coordinate runs along the target edge
  let finalX = 0;
  let finalY = 0;

  switch (toEdge) {
    case 'top':
      // Entering from top edge: Y is at max, position along edge determines X
      finalX = transformedCoord;
      finalY = gridSize - 1;
      break;
    case 'bottom':
      // Entering from bottom edge: Y is at 0, position along edge determines X
      finalX = transformedCoord;
      finalY = 0;
      break;
    case 'left':
      // Entering from left edge: X is at 0, position along edge determines Y
      finalX = 0;
      finalY = transformedCoord;
      break;
    case 'right':
      // Entering from right edge: X is at max, position along edge determines Y
      finalX = gridSize - 1;
      finalY = transformedCoord;
      break;
  }

  console.log('Edge transition result:', {
    toFace,
    finalX,
    finalY,
    transformedCoord,
  });

  return {
    face: toFace,
    x: finalX,
    y: finalY,
  };
}

/**
 * Move a position in a direction, handling edge wrapping
 */
export function movePosition(
  position: CubePosition,
  direction: { dx: number; dy: number },
  gridSize: number
): CubePosition {
  const newX = position.x + direction.dx;
  const newY = position.y + direction.dy;

  // Check if we're staying on the same face
  if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
    return { face: position.face, x: newX, y: newY };
  }

  // We're crossing an edge
  const result = transformPositionAcrossEdge(position, direction, gridSize);
  return result || position; // Return original if transition failed
}

/**
 * Get all positions in a straight line from start, wrapping around cube edges
 * Useful for chess pieces like rooks, bishops, queens
 */
export function getLinePositions(
  start: CubePosition,
  direction: { dx: number; dy: number },
  gridSize: number,
  maxSteps: number = gridSize * 4 // Max distance before looping back
): CubePosition[] {
  const positions: CubePosition[] = [];
  let current = start;

  for (let i = 0; i < maxSteps; i++) {
    const next = movePosition(current, direction, gridSize);

    // Check if we've looped back to start
    if (next.face === start.face && next.x === start.x && next.y === start.y) {
      break;
    }

    positions.push(next);
    current = next;
  }

  return positions;
}

/**
 * Check if two positions are the same
 */
export function positionsEqual(a: CubePosition, b: CubePosition): boolean {
  return a.face === b.face && a.x === b.x && a.y === b.y;
}

/**
 * Direction type for snake movement
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Get the "right" vector for a face (perpendicular to up and normal).
 * This completes the coordinate frame for each face.
 */
function getFaceRightVector(face: CubeFace): THREE.Vector3 {
  const normal = FACE_NORMALS[face].clone();
  const up = FACE_UP_VECTORS[face].clone();
  return new THREE.Vector3().crossVectors(up, normal).normalize();
}

/**
 * Calculate the visual rotation for a given camera up vector and face.
 * Returns the number of 90° clockwise rotations needed.
 */
function calculateVisualRotation(cameraUp: THREE.Vector3, face: CubeFace): number {
  const gameUp = FACE_UP_VECTORS[face].clone();
  const gameRight = getFaceRightVector(face);

  const dotUp = cameraUp.dot(gameUp);
  const dotRight = cameraUp.dot(gameRight);

  const angle = Math.atan2(dotRight, dotUp);
  let quarterTurns = Math.round(angle / (Math.PI / 2));
  quarterTurns = ((quarterTurns % 4) + 4) % 4;

  return quarterTurns;
}

/**
 * Transform a movement direction when crossing from one face to another.
 *
 * This ensures visual continuity - the snake continues moving in the same
 * screen direction after the camera rotates to view the new face.
 *
 * We calculate:
 * 1. What the camera up vector was on the old face
 * 2. What it will be on the new face (after quaternion rotation)
 * 3. Apply the rotation difference to the direction
 *
 * @param fromFace - The face the snake is leaving
 * @param direction - The current movement direction
 * @param cameraUpBeforeTransition - The camera's up vector before the transition
 */
export function transformDirectionAcrossEdge(
  fromFace: CubeFace,
  direction: Direction,
  cameraUpBeforeTransition: THREE.Vector3
): Direction {
  // Determine which edge we're crossing based on direction
  const directionToEdge: Record<Direction, EdgeDirection> = {
    up: 'top',
    down: 'bottom',
    left: 'left',
    right: 'right',
  };

  const edge = directionToEdge[direction];
  const transition = getEdgeTransition(fromFace, edge);

  if (!transition) return direction;

  const toFace = transition.toFace;

  // Calculate the quaternion for the face transition (same as camera uses)
  const fromNormal = FACE_NORMALS[fromFace].clone();
  const toNormal = FACE_NORMALS[toFace].clone();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(fromNormal, toNormal);

  // Calculate what the camera up will be after transition
  const cameraUpAfterTransition = cameraUpBeforeTransition.clone().applyQuaternion(quaternion).normalize();

  // Calculate visual rotations before and after
  const rotationBefore = calculateVisualRotation(cameraUpBeforeTransition, fromFace);
  const rotationAfter = calculateVisualRotation(cameraUpAfterTransition, toFace);

  // The direction needs to rotate by the same amount as the controls
  const rotationDelta = (rotationAfter - rotationBefore + 4) % 4;

  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  const currentIndex = directions.indexOf(direction);
  const newIndex = (currentIndex + rotationDelta) % 4;

  return directions[newIndex];
}

/**
 * Get the rotation offset (in degrees) when transitioning between faces
 * This is used to rotate pieces correctly when they move to a new face
 */
export function getTransitionRotation(
  fromFace: CubeFace,
  edge: EdgeDirection
): number {
  const transition = getEdgeTransition(fromFace, edge);
  return transition?.rotationOffset || 0;
}

/**
 * Direction deltas for all 8 neighbors (orthogonal + diagonal)
 */
const NEIGHBOR_DELTAS = [
  { dx: 0, dy: 1 },   // up
  { dx: 0, dy: -1 },  // down
  { dx: -1, dy: 0 },  // left
  { dx: 1, dy: 0 },   // right
  { dx: -1, dy: 1 },  // up-left
  { dx: 1, dy: 1 },   // up-right
  { dx: -1, dy: -1 }, // down-left
  { dx: 1, dy: -1 },  // down-right
];

/**
 * Get all neighboring positions for a cell (up to 8 neighbors).
 * Handles cross-face edges and corners correctly.
 *
 * For cells in the middle of a face: 8 neighbors
 * For cells on an edge (not corner): 8 neighbors (3 wrap to adjacent face)
 * For cells at corners: neighbors from up to 3 faces (corner cells touch 3 faces)
 *
 * @param position - The cell position to find neighbors for
 * @param gridSize - The grid size per face
 * @returns Array of unique neighboring positions
 */
export function getAllNeighbors(
  position: CubePosition,
  gridSize: number
): CubePosition[] {
  const neighbors: CubePosition[] = [];
  const seen = new Set<string>();

  const posKey = (p: CubePosition) => `${p.face}-${p.x}-${p.y}`;

  for (const delta of NEIGHBOR_DELTAS) {
    // For orthogonal moves, use movePosition directly
    if (delta.dx === 0 || delta.dy === 0) {
      const neighbor = movePosition(position, delta, gridSize);
      const key = posKey(neighbor);
      if (!seen.has(key)) {
        seen.add(key);
        neighbors.push(neighbor);
      }
    } else {
      // For diagonal moves, we need special handling at edges/corners
      const neighbor = getDiagonalNeighbor(position, delta, gridSize);
      if (neighbor) {
        const key = posKey(neighbor);
        if (!seen.has(key)) {
          seen.add(key);
          neighbors.push(neighbor);
        }
      }
    }
  }

  return neighbors;
}

/**
 * Get diagonal neighbor, handling edge wrapping.
 *
 * For diagonal moves that cross edges:
 * - If we cross one edge, follow that edge transition and adjust the other coordinate
 * - If we're at a corner, the diagonal may wrap around the cube corner
 *
 * The key insight is that when crossing an edge, we need to figure out how the
 * "parallel to edge" direction maps to the new face's coordinate system.
 */
function getDiagonalNeighbor(
  position: CubePosition,
  delta: { dx: number; dy: number },
  gridSize: number
): CubePosition | null {
  const newX = position.x + delta.dx;
  const newY = position.y + delta.dy;

  // Check if we're staying on the same face
  const crossingLeft = newX < 0;
  const crossingRight = newX >= gridSize;
  const crossingBottom = newY < 0;
  const crossingTop = newY >= gridSize;

  // Not crossing any edge - simple case
  if (!crossingLeft && !crossingRight && !crossingBottom && !crossingTop) {
    return { face: position.face, x: newX, y: newY };
  }

  // Crossing exactly one edge - this is the tricky case
  // We need to:
  // 1. Move to the adjacent face via the edge
  // 2. Then move one step in the "parallel to edge" direction on the new face
  //    BUT we need to figure out which direction that is on the new face

  if ((crossingLeft || crossingRight) && !crossingBottom && !crossingTop) {
    // Crossing left or right edge, with a vertical component (delta.dy)
    // First, get to the adjacent face
    const onNewFace = movePosition(position, { dx: delta.dx, dy: 0 }, gridSize);

    // Now we need to move in the "vertical" direction relative to original face
    // Try moving in all 4 directions on the new face and see which one
    // corresponds to moving parallel to the edge we just crossed
    const edgeCrossed: EdgeDirection = crossingLeft ? 'left' : 'right';
    const secondaryDelta = transformSecondaryDelta(
      position.face,
      edgeCrossed,
      { dx: 0, dy: delta.dy }
    );

    if (secondaryDelta) {
      const finalX = onNewFace.x + secondaryDelta.dx;
      const finalY = onNewFace.y + secondaryDelta.dy;
      if (finalX >= 0 && finalX < gridSize && finalY >= 0 && finalY < gridSize) {
        return { face: onNewFace.face, x: finalX, y: finalY };
      }
    }
    return null;
  }

  if ((crossingTop || crossingBottom) && !crossingLeft && !crossingRight) {
    // Crossing top or bottom edge, with a horizontal component (delta.dx)
    const onNewFace = movePosition(position, { dx: 0, dy: delta.dy }, gridSize);

    const edgeCrossed: EdgeDirection = crossingTop ? 'top' : 'bottom';
    const secondaryDelta = transformSecondaryDelta(
      position.face,
      edgeCrossed,
      { dx: delta.dx, dy: 0 }
    );

    if (secondaryDelta) {
      const finalX = onNewFace.x + secondaryDelta.dx;
      const finalY = onNewFace.y + secondaryDelta.dy;
      if (finalX >= 0 && finalX < gridSize && finalY >= 0 && finalY < gridSize) {
        return { face: onNewFace.face, x: finalX, y: finalY };
      }
    }
    return null;
  }

  // Corner case - crossing two edges
  // Try both paths and see which one gives a valid result
  // Path 1: horizontal first, then vertical
  const path1 = (() => {
    const step1 = movePosition(position, { dx: delta.dx, dy: 0 }, gridSize);
    // After horizontal transition, try vertical on new face
    const step2 = movePosition(step1, { dx: 0, dy: delta.dy }, gridSize);
    return step2;
  })();

  // Path 2: vertical first, then horizontal
  const path2 = (() => {
    const step1 = movePosition(position, { dx: 0, dy: delta.dy }, gridSize);
    // After vertical transition, try horizontal on new face
    const step2 = movePosition(step1, { dx: delta.dx, dy: 0 }, gridSize);
    return step2;
  })();

  // Both paths should lead to the same cell on a properly connected cube
  // If they differ, it's a corner situation - return the first valid one
  if (path1.face === path2.face && path1.x === path2.x && path1.y === path2.y) {
    return path1;
  }

  // At cube corners, both paths are valid diagonal neighbors
  // Return one of them (path1) - the other will be found via a different delta
  return path1;
}

/**
 * Transform a delta that runs parallel to an edge when crossing to a new face.
 *
 * When we cross an edge diagonally, the "parallel to edge" component needs to
 * be transformed based on how the two faces connect.
 */
function transformSecondaryDelta(
  fromFace: CubeFace,
  crossedEdge: EdgeDirection,
  parallelDelta: { dx: number; dy: number }
): { dx: number; dy: number } | null {
  const transition = getEdgeTransition(fromFace, crossedEdge);
  if (!transition) return null;

  const { toEdge, flipX, flipY } = transition;

  // The parallel delta on the original face runs along the crossed edge
  // We need to figure out which direction that maps to on the target face

  // On the source face, the parallel direction is:
  // - For left/right edges: vertical (dy)
  // - For top/bottom edges: horizontal (dx)

  // On the target face, after entering via toEdge, the parallel direction is:
  // - For left/right toEdge: vertical (dy)
  // - For top/bottom toEdge: horizontal (dx)

  const sourceIsVerticalEdge = crossedEdge === 'left' || crossedEdge === 'right';
  const targetIsVerticalEdge = toEdge === 'left' || toEdge === 'right';

  // Get the magnitude and sign of the parallel movement
  const parallelAmount = sourceIsVerticalEdge ? parallelDelta.dy : parallelDelta.dx;

  // Apply flip if needed
  const flipped = (flipX || flipY) ? -parallelAmount : parallelAmount;

  // Map to target face's coordinate system
  if (targetIsVerticalEdge) {
    // On target face, parallel to the entry edge means moving in Y
    return { dx: 0, dy: flipped };
  } else {
    // On target face, parallel to the entry edge means moving in X
    return { dx: flipped, dy: 0 };
  }
}
