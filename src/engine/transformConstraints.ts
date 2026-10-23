import { AxisLockMode, Vec3 } from '../types/studio';

/**
 * Constrains an absolute drag position against the immutable pointer-down origin.
 * `x`, `y`, `z` mean movement ONLY along that axis; `xz` means movement in the ground plane.
 * This function must receive the original drag origin on every update to prevent drift.
 */
export function constrainTranslationPosition(
  position: Vec3,
  dragOrigin: Vec3,
  mode: AxisLockMode
): Vec3 {
  if (mode === 'free') return { ...position };
  const result = { ...position };
  if (mode === 'x') {
    result.y = dragOrigin.y;
    result.z = dragOrigin.z;
  } else if (mode === 'y') {
    result.x = dragOrigin.x;
    result.z = dragOrigin.z;
  } else if (mode === 'z') {
    result.x = dragOrigin.x;
    result.y = dragOrigin.y;
  } else if (mode === 'xy') {
    result.z = dragOrigin.z;
  } else if (mode === 'xz') {
    result.y = dragOrigin.y;
  } else if (mode === 'yz') {
    result.x = dragOrigin.x;
  }
  return result;
}
