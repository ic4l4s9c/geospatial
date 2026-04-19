import type { Point } from "../../validators.js";

export function validatePointBounds(points: Point[]): void {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.latitude < -90 || p.latitude > 90) {
      throw new Error(
        `Invalid latitude ${p.latitude} at point ${i}: must be between -90 and 90`,
      );
    }
    if (p.longitude < -180 || p.longitude > 180) {
      throw new Error(
        `Invalid longitude ${p.longitude} at point ${i}: must be between -180 and 180`,
      );
    }
  }
}
