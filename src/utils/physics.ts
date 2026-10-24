/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GameMode,
  PlayerState,
  ShotType,
  ShotVariantsConfig,
  ShuttleState,
  TeamColor,
} from '../types/game';

export const COURT = {
  // Lateral Court Width (X axis: 0 to 400)
  WIDTH: 400,
  CENTER_X: 200,
  SINGLES_X_MIN: 52,
  SINGLES_X_MAX: 348,
  DOUBLES_X_MIN: 30,
  DOUBLES_X_MAX: 370,

  // Longitudinal Court Length (Y axis: 0 to 800)
  LENGTH: 800,
  RED_BASELINE: 60,
  RED_DOUBLES_SERVICE: 96,
  RED_SHORT_SERVICE: 315,

  NET_Y: 400,
  NET_HEIGHT: 105, // Height Z

  BLUE_SHORT_SERVICE: 485,
  BLUE_DOUBLES_SERVICE: 704,
  BLUE_BASELINE: 740,

  // Strict Half-Court Movement Limits (Prevents crossing or clipping the net)
  NEAR_MIN_Y: 42,
  NEAR_MAX_Y: 358,
  FAR_MIN_Y: 462,
  FAR_MAX_Y: 758,

  // Out of bounds margin
  OUT_X_MIN: 10,
  OUT_X_MAX: 390,
  OUT_Y_MIN: 20,
  OUT_Y_MAX: 780,
};

export const GRAVITY = 0.34;
export const AIR_DRAG = 0.988;

export function checkShuttleInBounds(
  x: number,
  y: number,
  mode: GameMode,
  isService: boolean = false,
  targetTeam: TeamColor = 'blue'
): { inBounds: boolean; lineDistMm: number; lineName: string } {
  const xMin = mode === '1v1' ? COURT.SINGLES_X_MIN : COURT.DOUBLES_X_MIN;
  const xMax = mode === '1v1' ? COURT.SINGLES_X_MAX : COURT.DOUBLES_X_MAX;

  let yMin: number;
  let yMax: number;

  if (targetTeam === 'blue') {
    // Landing on Far/Top side
    yMin = isService ? COURT.BLUE_SHORT_SERVICE : COURT.NET_Y;
    yMax = isService && mode === '2v2' ? COURT.BLUE_DOUBLES_SERVICE : COURT.BLUE_BASELINE;
  } else {
    // Landing on Near/Bottom side
    yMax = isService ? COURT.RED_SHORT_SERVICE : COURT.NET_Y;
    yMin = isService && mode === '2v2' ? COURT.RED_DOUBLES_SERVICE : COURT.RED_BASELINE;
  }

  // Line width tolerance
  const insideX = x >= xMin - 6 && x <= xMax + 6;
  const insideY = y >= yMin - 6 && y <= yMax + 6;
  const inBounds = insideX && insideY;

  const distLeft = Math.abs(x - xMin);
  const distRight = Math.abs(x - xMax);
  const distBottom = Math.abs(y - yMin);
  const distTop = Math.abs(y - yMax);

  const minDistUnits = Math.min(distLeft, distRight, distBottom, distTop);
  const lineDistMm = Math.max(2, Math.round(minDistUnits * 14.5));

  let lineName = 'Sideline';
  if (minDistUnits === distBottom || minDistUnits === distTop) {
    lineName = 'Baseline';
  }

  return { inBounds, lineDistMm, lineName };
}

/**
 * Predicts where the shuttlecock will reach strike height (z = 38) or land (z = 0)
 * so AI bots stay on their own side and move to the true interception spot.
 */
export function predictShuttleLanding(shuttle: ShuttleState): { x: number; y: number } {
  let { x, y, z, vx, vy, vz, curveX = 0 } = shuttle;
  let steps = 0;
  while (z > 32 && steps < 160) {
    vx += curveX;
    x += vx;
    y += vy;
    vz -= GRAVITY;
    z += vz;
    vx *= AIR_DRAG;
    vy *= AIR_DRAG;
    curveX *= 0.96;
    steps++;
  }
  return { x, y };
}

export function updateShuttlePhysics(shuttle: ShuttleState): {
  shuttle: ShuttleState;
  netHit: boolean;
  groundHit: boolean;
} {
  let { x, y, z, vx, vy, vz, curveX = 0, rotation, trail, isThunderSmash } = shuttle;
  let netHit = false;
  let groundHit = false;

  const trailColor = isThunderSmash
    ? '#f59e0b'
    : shuttle.isSmash
    ? '#f43f5e'
    : shuttle.lastShotType === 'drop'
    ? '#06b6d4'
    : shuttle.lastShotType === 'clear'
    ? '#818cf8'
    : '#2dd4bf';

  const newTrail = [
    { x, y, z, alpha: 0.9, color: trailColor },
    ...trail
      .map((t) => ({ ...t, alpha: t.alpha * 0.84 }))
      .filter((t) => t.alpha > 0.04)
      .slice(0, 14),
  ];

  const prevY = y;
  vx += curveX;
  x += vx;
  y += vy;
  vz -= GRAVITY;
  z += vz;

  // Net collision check at Y = 400
  if ((prevY < COURT.NET_Y && y >= COURT.NET_Y) || (prevY > COURT.NET_Y && y <= COURT.NET_Y)) {
    if (z < COURT.NET_HEIGHT) {
      netHit = true;
      if (z >= COURT.NET_HEIGHT - 14 && Math.random() < 0.82) {
        // Net cord / lucky dribbler that climbs over the tape
        z = COURT.NET_HEIGHT + 3;
        vy = (vy > 0 ? 1 : -1) * 3.5;
        vz = 2.2;
      } else {
        // Blocked by net: drops down on the hitter's side
        y = prevY < COURT.NET_Y ? COURT.NET_Y - 6 : COURT.NET_Y + 6;
        vy = -vy * 0.15;
        vz = -3.0;
        vx = vx * 0.3;
      }
    }
  }

  // Floor contact
  if (z <= 0) {
    z = 0;
    groundHit = true;
    vx = 0;
    vy = 0;
    vz = 0;
    curveX = 0;
  }

  const currentSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const computedKmH = isThunderSmash
    ? 420
    : shuttle.isSmash
    ? Math.max(295, Math.min(395, Math.round(currentSpeed * 19.5)))
    : Math.round(currentSpeed * 16.5);

  if (z > 0) {
    vx *= AIR_DRAG;
    vy *= AIR_DRAG;
    curveX *= 0.96;
    rotation = Math.atan2(vz, vy);
  }

  return {
    shuttle: {
      ...shuttle,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      curveX,
      speedKmH: z > 0 ? computedKmH : shuttle.speedKmH,
      rotation,
      trail: newTrail,
    },
    netHit,
    groundHit,
  };
}

/**
 * Exact closed-form ballistic trajectory solver.
 * 1. Determines target (targetX, targetY) inside opponent court boundaries.
 * 2. Finds the exact integer flight duration `T` (in frames) and vertical velocity `vz`
 *    so that the shuttle clears the net (`z >= NET_HEIGHT + 18` at `y = 400`) and hits `z = 0` at frame `T`.
 * 3. Solves `vx` and `vy` from the exact discrete geometric drag sum `sum_{k=0}^{T-1} AIR_DRAG^k`
 *    so the shuttle lands on `(targetX, targetY)` with millimeter accuracy and zero unforced out-of-bounds errors.
 */
export function calculateShot(
  player: PlayerState,
  shotType: ShotType,
  power: number,
  targetX: number,
  variants?: ShotVariantsConfig,
  currentShuttleZ: number = 50,
  explicitTargetY?: number,
  mode: GameMode = '1v1'
): { vx: number; vy: number; vz: number; curveX: number; isSmash: boolean; isThunderSmash: boolean } {
  const isNearSide = player.team === 'red';
  const p = Math.max(0.65, Math.min(1.05, power));
  const safetyLock = variants ? variants.safetyLock : true;

  let isSmash = false;
  let isThunderSmash = false;
  let curveX = 0;

  // Choose base flight frames and default targetY if not explicitly provided by tactical AI
  let targetY: number;
  let flightFrames: number;

  switch (shotType) {
    case 'smash': {
      isSmash = true;
      const smashPct = variants ? variants.smash : 100;
      if (player.activeSkill === 'thunder_smash') {
        isThunderSmash = true;
        flightFrames = 26;
      } else {
        flightFrames = smashPct === 100 ? 30 : smashPct === 90 ? 34 : 38;
      }
      targetY =
        explicitTargetY !== undefined
          ? explicitTargetY
          : isNearSide
          ? 575 + (smashPct - 75) * 2.2
          : 225 - (smashPct - 75) * 2.2;
      break;
    }

    case 'drop': {
      const dropVar = variants ? variants.drop : 'tight';
      flightFrames = dropVar === 'tight' ? 44 : dropVar === 'push' ? 40 : 37;
      const netOffset = dropVar === 'tight' ? 75 : dropVar === 'push' ? 120 : 155;
      targetY =
        explicitTargetY !== undefined
          ? explicitTargetY
          : isNearSide
          ? COURT.NET_Y + netOffset
          : COURT.NET_Y - netOffset;
      if (player.activeSkill === 'deceptive_slice') {
        curveX = player.x < 200 ? 0.08 : -0.08;
      }
      break;
    }

    case 'drive': {
      const driveVar = variants ? variants.drive : 'fast';
      flightFrames = driveVar === 'soft' ? 40 : driveVar === 'fast' ? 34 : 31;
      const driveDepth = driveVar === 'soft' ? 185 : driveVar === 'fast' ? 245 : 285;
      targetY =
        explicitTargetY !== undefined
          ? explicitTargetY
          : isNearSide
          ? COURT.NET_Y + driveDepth
          : COURT.NET_Y - driveDepth;
      if (player.activeSkill === 'deceptive_slice') {
        curveX = player.x < 200 ? 0.06 : -0.06;
      }
      break;
    }

    case 'clear':
    default: {
      const clearVar = variants ? variants.clear : 'deep';
      flightFrames = clearVar === 'mid' ? 56 : clearVar === 'deep' ? 64 : 68;
      const clearDepth = clearVar === 'mid' ? 215 : clearVar === 'deep' ? 295 : 318;
      targetY =
        explicitTargetY !== undefined
          ? explicitTargetY
          : isNearSide
          ? COURT.NET_Y + clearDepth
          : COURT.NET_Y - clearDepth;
      break;
    }
  }

  const safeMinX = (mode === '1v1' ? COURT.SINGLES_X_MIN : COURT.DOUBLES_X_MIN) + 16;
  const safeMaxX = (mode === '1v1' ? COURT.SINGLES_X_MAX : COURT.DOUBLES_X_MAX) - 16;

  // Clamp target coordinates inside court boundaries for AI and Safety-Locked player shots
  if (safetyLock || player.isAi) {
    targetX = Math.max(safeMinX, Math.min(safeMaxX, targetX));
    if (isNearSide) {
      targetY = Math.max(COURT.NET_Y + 62, Math.min(COURT.BLUE_BASELINE - 20, targetY));
    } else {
      targetY = Math.max(COURT.RED_BASELINE + 20, Math.min(COURT.NET_Y - 62, targetY));
    }
  } else {
    targetX = Math.max(safeMinX - 8, Math.min(safeMaxX + 8, targetX));
    if (isNearSide) {
      targetY = Math.max(COURT.NET_Y + 55, Math.min(COURT.BLUE_BASELINE - 6, targetY + (p >= 1.0 ? 10 : 0)));
    } else {
      targetY = Math.max(COURT.RED_BASELINE + 6, Math.min(COURT.NET_Y - 55, targetY - (p >= 1.0 ? 10 : 0)));
    }
  }

  const startX = player.x;
  const startY = player.y;
  const startZ = Math.max(36, currentShuttleZ);

  const distToNet = Math.abs(COURT.NET_Y - startY);
  const totalDistY = Math.max(20, Math.abs(targetY - startY));
  const netFraction = Math.max(0.1, Math.min(0.9, distToNet / totalDistY));
  const minClearanceZ = COURT.NET_HEIGHT + 18;

  // Step `flightFrames` upward if needed until the arc at `netFraction` clears the net height!
  let T = flightFrames;
  let vz = 0;
  for (let attempt = 0; attempt < 35; attempt++) {
    // Exact discrete vertical velocity so z_T = 0 at frame T:
    // z_T = startZ + T * vz - GRAVITY * T * (T + 1) / 2 = 0
    vz = (GRAVITY * 0.5 * T * (T + 1) - startZ) / T;

    const tNet = Math.max(1, Math.round(T * netFraction));
    const zAtNet = startZ + tNet * vz - GRAVITY * 0.5 * tNet * (tNet + 1);
    if (zAtNet >= minClearanceZ) {
      break;
    }
    T += 2;
  }

  // Exact geometric series sum of AIR_DRAG over T frames: S = (1 - d^T) / (1 - d)
  const dragSum = (1 - Math.pow(AIR_DRAG, T)) / (1 - AIR_DRAG);

  // Account for lateral curveX displacement if deceptive_slice is active
  let curveDisplacementX = 0;
  if (curveX !== 0) {
    let simVx = 0;
    let simCurve = curveX;
    for (let k = 0; k < T; k++) {
      simVx += simCurve;
      curveDisplacementX += simVx;
      simVx *= AIR_DRAG;
      simCurve *= 0.96;
    }
  }

  const vy = (targetY - startY) / dragSum;
  const vx = (targetX - startX - curveDisplacementX) / dragSum;

  return { vx, vy, vz, curveX, isSmash, isThunderSmash };
}

export function updatePlayerMovement(
  player: PlayerState,
  moveX: number,
  moveY: number,
  jump: boolean,
  mode: GameMode,
  directTarget?: { x: number; y: number } | null
): PlayerState {
  // Always use team identity so players can NEVER cross the net!
  const isNearSide = player.team === 'red';
  const speedBoost = player.activeSkill === 'stamina_surge' ? 1.28 : 1.0;
  const maxSpeed = (player.isAi ? 5.6 : 6.4) * speedBoost;

  let { x, y, z, vx, vy, vz, stridePhase = 0, torsoLean = 0, stamina, state, facing } = player;

  const minX = mode === '1v1' ? COURT.SINGLES_X_MIN - 16 : COURT.DOUBLES_X_MIN - 16;
  const maxX = mode === '1v1' ? COURT.SINGLES_X_MAX + 16 : COURT.DOUBLES_X_MAX + 16;

  // Strict half-court longitudinal clamps:
  // Near side (Red): 42 to 358 (Net is at 400)
  // Far side (Blue): 462 to 758 (Net is at 400)
  const minY = isNearSide ? COURT.NEAR_MIN_Y : COURT.FAR_MIN_Y;
  const maxY = isNearSide ? COURT.NEAR_MAX_Y : COURT.FAR_MAX_Y;

  if (directTarget) {
    const clampedTargetX = Math.max(minX, Math.min(maxX, directTarget.x));
    const clampedTargetY = Math.max(minY, Math.min(maxY, directTarget.y));
    const dx = clampedTargetX - x;
    const dy = clampedTargetY - y;
    const dist = Math.hypot(dx, dy);

    if (!player.isAi) {
      // Instant 1:1 fingertip touchpad response for the human player
      if (dist > 0.2) {
        const step = Math.min(dist * 0.78, maxSpeed * 4.5);
        const desiredVx = (dx / dist) * step;
        const desiredVy = (dy / dist) * step;
        vx = vx * 0.15 + desiredVx * 0.85;
        vy = vy * 0.15 + desiredVy * 0.85;
      } else {
        vx = 0;
        vy = 0;
      }
    } else if (dist > 0.35) {
      // Smooth arrival speed curve for AI opponent
      const desiredSpeed = Math.min(dist * 0.22, maxSpeed * 1.1);
      const desiredVx = (dx / dist) * desiredSpeed;
      const desiredVy = (dy / dist) * desiredSpeed;
      vx = vx * 0.7 + desiredVx * 0.3;
      vy = vy * 0.7 + desiredVy * 0.3;
    } else {
      vx *= 0.55;
      vy *= 0.55;
    }
  } else {
    // Fast-response keyboard input
    const inputMag = Math.hypot(moveX, moveY);
    const normX = inputMag > 1 ? moveX / inputMag : moveX;
    const normY = inputMag > 1 ? moveY / inputMag : moveY;

    const targetVx = normX * maxSpeed;
    const targetVy = normY * maxSpeed;
    vx = vx * 0.35 + targetVx * 0.65;
    vy = vy * 0.35 + targetVy * 0.65;
  }

  if (Math.abs(vx) < 0.03) vx = 0;
  if (Math.abs(vy) < 0.03) vy = 0;

  x = Math.max(minX, Math.min(maxX, x + vx));
  y = Math.max(minY, Math.min(maxY, y + vy));

  const moveSpeed = Math.hypot(vx, vy);

  // Smooth continuous stride cycle without backward-unwinding glitch on stop
  if (moveSpeed > 0.18 && z === 0) {
    stridePhase = (stridePhase + moveSpeed * 0.072) % (Math.PI * 2);
  } else {
    // Wrap into [-PI, PI] so feet settle naturally along shortest angular distance to 0
    let wrapped = ((stridePhase + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (wrapped < -Math.PI) wrapped += Math.PI * 2;
    stridePhase = wrapped * 0.82;
  }

  const targetLean = Math.max(-0.24, Math.min(0.24, (vx / maxSpeed) * 0.2));
  torsoLean = torsoLean * 0.82 + targetLean * 0.18;

  if (Math.abs(vx) > Math.abs(vy) && moveSpeed > 0.45) {
    facing = vx > 0 ? 'right' : 'left';
  } else {
    facing = isNearSide ? 'up' : 'down';
  }

  // Jump physics
  if (jump && z === 0 && stamina > 12) {
    vz = 8.6;
    stamina = Math.max(0, stamina - (player.activeSkill === 'stamina_surge' ? 0 : 10));
    state = 'jumping';
  } else if (z > 0) {
    vz -= GRAVITY;
    z += vz;
    if (z <= 0) {
      z = 0;
      vz = 0;
      state = moveSpeed > 0.25 ? 'running' : 'idle';
    } else {
      state = 'jumping';
    }
  } else {
    stamina = Math.min(100, stamina + (player.activeSkill === 'stamina_surge' ? 1.5 : 0.45));
    if (state !== 'swinging' && state !== 'celebrating' && state !== 'disappointed') {
      state = moveSpeed > 0.25 ? 'running' : 'idle';
    }
  }

  return {
    ...player,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    stridePhase,
    torsoLean,
    stamina,
    state,
    facing,
  };
}
