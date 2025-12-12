import * as THREE from 'three';
import { CubeFace, CubePosition, WorldPosition, CubeConfig } from '@/types';

/**
 * Face normal vectors for each cube face
 */
export const FACE_NORMALS: Record<CubeFace, THREE.Vector3> = {
  [CubeFace.TOP]: new THREE.Vector3(0, 1, 0),
  [CubeFace.BOTTOM]: new THREE.Vector3(0, -1, 0),
  [CubeFace.FRONT]: new THREE.Vector3(0, 0, 1),
  [CubeFace.BACK]: new THREE.Vector3(0, 0, -1),
  [CubeFace.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CubeFace.RIGHT]: new THREE.Vector3(1, 0, 0),
};

/**
 * Face "up" vectors - defines which direction is "up" on each face
 */
export const FACE_UP_VECTORS: Record<CubeFace, THREE.Vector3> = {
  [CubeFace.TOP]: new THREE.Vector3(0, 0, -1),
  [CubeFace.BOTTOM]: new THREE.Vector3(0, 0, 1),
  [CubeFace.FRONT]: new THREE.Vector3(0, 1, 0),
  [CubeFace.BACK]: new THREE.Vector3(0, 1, 0),
  [CubeFace.LEFT]: new THREE.Vector3(0, 1, 0),
  [CubeFace.RIGHT]: new THREE.Vector3(0, 1, 0),
};

/**
 * Get camera position for viewing a specific face
 */
export function getFaceCameraPosition(face: CubeFace, distance: number = 8): THREE.Vector3 {
  const normal = FACE_NORMALS[face].clone();
  return normal.multiplyScalar(distance);
}

/**
 * Get camera "up" vector for viewing a specific face
 */
export function getFaceCameraUp(face: CubeFace): THREE.Vector3 {
  return FACE_UP_VECTORS[face].clone();
}

/**
 * Convert a grid position on a cube face to 3D world coordinates
 */
export function cubeToWorld(
  position: CubePosition,
  config: CubeConfig
): WorldPosition {
  const { face, x, y } = position;
  const { size, gridSize } = config;
  const halfSize = size / 2;
  const cellSize = size / gridSize;

  // Calculate position within face (-halfSize to +halfSize)
  const localX = (x + 0.5) * cellSize - halfSize;
  const localY = (y + 0.5) * cellSize - halfSize;

  const normal = FACE_NORMALS[face];
  let worldX = 0, worldY = 0, worldZ = 0;

  switch (face) {
    case CubeFace.FRONT:
      worldX = localX;
      worldY = localY;
      worldZ = halfSize;
      break;
    case CubeFace.BACK:
      worldX = -localX;
      worldY = localY;
      worldZ = -halfSize;
      break;
    case CubeFace.RIGHT:
      worldX = halfSize;
      worldY = localY;
      worldZ = -localX;
      break;
    case CubeFace.LEFT:
      worldX = -halfSize;
      worldY = localY;
      worldZ = localX;
      break;
    case CubeFace.TOP:
      worldX = localX;
      worldY = halfSize;
      worldZ = -localY;
      break;
    case CubeFace.BOTTOM:
      worldX = localX;
      worldY = -halfSize;
      worldZ = localY;
      break;
  }

  return {
    x: worldX,
    y: worldY,
    z: worldZ,
    normalX: normal.x,
    normalY: normal.y,
    normalZ: normal.z,
  };
}

/**
 * Convert world coordinates to the nearest cube grid position
 */
export function worldToCube(
  worldPos: THREE.Vector3,
  config: CubeConfig
): CubePosition | null {
  const { size, gridSize } = config;
  const halfSize = size / 2;
  const cellSize = size / gridSize;
  const tolerance = 0.1;

  // Determine which face based on position
  let face: CubeFace | null = null;
  let localX = 0, localY = 0;

  if (Math.abs(worldPos.z - halfSize) < tolerance) {
    face = CubeFace.FRONT;
    localX = worldPos.x;
    localY = worldPos.y;
  } else if (Math.abs(worldPos.z + halfSize) < tolerance) {
    face = CubeFace.BACK;
    localX = -worldPos.x;
    localY = worldPos.y;
  } else if (Math.abs(worldPos.x - halfSize) < tolerance) {
    face = CubeFace.RIGHT;
    localX = -worldPos.z;
    localY = worldPos.y;
  } else if (Math.abs(worldPos.x + halfSize) < tolerance) {
    face = CubeFace.LEFT;
    localX = worldPos.z;
    localY = worldPos.y;
  } else if (Math.abs(worldPos.y - halfSize) < tolerance) {
    face = CubeFace.TOP;
    localX = worldPos.x;
    localY = -worldPos.z;
  } else if (Math.abs(worldPos.y + halfSize) < tolerance) {
    face = CubeFace.BOTTOM;
    localX = worldPos.x;
    localY = worldPos.z;
  }

  if (!face) return null;

  // Convert local position to grid coordinates
  const gridX = Math.floor((localX + halfSize) / cellSize);
  const gridY = Math.floor((localY + halfSize) / cellSize);

  // Clamp to valid range
  const x = Math.max(0, Math.min(gridSize - 1, gridX));
  const y = Math.max(0, Math.min(gridSize - 1, gridY));

  return { face, x, y };
}

/**
 * Get rotation euler angles to orient an object on a cube face
 */
export function getFaceRotation(face: CubeFace): THREE.Euler {
  switch (face) {
    case CubeFace.FRONT:
      return new THREE.Euler(0, 0, 0);
    case CubeFace.BACK:
      return new THREE.Euler(0, Math.PI, 0);
    case CubeFace.RIGHT:
      return new THREE.Euler(0, Math.PI / 2, 0);
    case CubeFace.LEFT:
      return new THREE.Euler(0, -Math.PI / 2, 0);
    case CubeFace.TOP:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case CubeFace.BOTTOM:
      return new THREE.Euler(Math.PI / 2, 0, 0);
  }
}

/**
 * Get all faces as an array
 */
export function getAllFaces(): CubeFace[] {
  return [
    CubeFace.FRONT,
    CubeFace.BACK,
    CubeFace.LEFT,
    CubeFace.RIGHT,
    CubeFace.TOP,
    CubeFace.BOTTOM,
  ];
}

/**
 * Get the opposite face
 */
export function getOppositeFace(face: CubeFace): CubeFace {
  switch (face) {
    case CubeFace.FRONT: return CubeFace.BACK;
    case CubeFace.BACK: return CubeFace.FRONT;
    case CubeFace.LEFT: return CubeFace.RIGHT;
    case CubeFace.RIGHT: return CubeFace.LEFT;
    case CubeFace.TOP: return CubeFace.BOTTOM;
    case CubeFace.BOTTOM: return CubeFace.TOP;
  }
}

/**
 * Get adjacent faces for a given face
 */
export function getAdjacentFaces(face: CubeFace): CubeFace[] {
  switch (face) {
    case CubeFace.FRONT:
      return [CubeFace.TOP, CubeFace.BOTTOM, CubeFace.LEFT, CubeFace.RIGHT];
    case CubeFace.BACK:
      return [CubeFace.TOP, CubeFace.BOTTOM, CubeFace.RIGHT, CubeFace.LEFT];
    case CubeFace.LEFT:
      return [CubeFace.TOP, CubeFace.BOTTOM, CubeFace.BACK, CubeFace.FRONT];
    case CubeFace.RIGHT:
      return [CubeFace.TOP, CubeFace.BOTTOM, CubeFace.FRONT, CubeFace.BACK];
    case CubeFace.TOP:
      return [CubeFace.BACK, CubeFace.FRONT, CubeFace.LEFT, CubeFace.RIGHT];
    case CubeFace.BOTTOM:
      return [CubeFace.FRONT, CubeFace.BACK, CubeFace.LEFT, CubeFace.RIGHT];
  }
}
