/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMode, PlayerState, ShotType, ShuttleState } from '../types/game';
import { COURT, predictShuttleLanding } from './physics';

export interface BotDecision {
  moveX: number;
  moveY: number;
  desiredPos: { x: number; y: number };
  jump: boolean;
  swing: ShotType | null;
  power: number;
  targetX: number;
  targetY: number;
}

/**
 * Smart Tactical AI Shot & Open-Court Target Selector:
 * Analyzes the human player's live (x, y, vx, vy) coordinates and the shuttle's height
 * to select the optimal shot type (Clear, Drop, Drive, Smash) and exact in-bounds
 * target (targetX, targetY) in the open space furthest from the player.
 */
export function selectTacticalAiTarget(
  bot: PlayerState,
  shuttle: ShuttleState,
  mode: GameMode,
  opponent?: PlayerState | null
): { shotType: ShotType; targetX: number; targetY: number; power: number } {
  const isRed = bot.team === 'red';
  const difficulty = bot.aiDifficulty || 'pro';

  // Safe lateral boundaries well inside singles/doubles lines
  const minSafeX = mode === '1v1' ? COURT.SINGLES_X_MIN + 24 : COURT.DOUBLES_X_MIN + 24;
  const maxSafeX = mode === '1v1' ? COURT.SINGLES_X_MAX - 24 : COURT.DOUBLES_X_MAX - 24;

  const oppX = opponent ? opponent.x : COURT.CENTER_X;
  const oppY = opponent ? opponent.y : isRed ? 600 : 195;
  const oppVx = opponent ? opponent.vx : 0;

  // 1. Lateral Open-Space Targeting (Cross-court away from opponent's X)
  let targetX: number;
  if (oppX < COURT.CENTER_X - 15) {
    // Opponent is on the left -> hit to the open right side
    targetX = maxSafeX - 8;
  } else if (oppX > COURT.CENTER_X + 15) {
    // Opponent is on the right -> hit to the open left side
    targetX = minSafeX + 8;
  } else {
    // Opponent is near center -> wrong-foot them opposite their movement vector
    targetX = oppVx > 0.5 ? minSafeX + 10 : oppVx < -0.5 ? maxSafeX - 10 : shuttle.x < 200 ? maxSafeX - 12 : minSafeX + 12;
  }

  // Clamp strictly inside safe lateral court margin
  targetX = Math.max(minSafeX, Math.min(maxSafeX, targetX));

  // 2. Depth Open-Space Targeting & Shot Type Selection
  let shotType: ShotType = 'clear';
  let targetY: number = isRed ? 695 : 105;
  let power = 0.92;

  if (!isRed) {
    // Blue AI targeting Red (Human) Near Court: valid Y is [60, 400], safe Y is [92, 338]
    const playerNearNet = oppY > 225;
    const playerDeepBack = oppY < 168;

    if (shuttle.z > 80) {
      // High overhead strike window
      if (playerDeepBack && difficulty !== 'novice') {
        // Player is camping deep at the baseline -> punish with a tight deceptive drop or steep angle smash
        if (shuttle.y < 570) {
          shotType = 'drop';
          targetY = 326;
          power = 0.78;
        } else {
          shotType = 'smash';
          targetY = 215;
          power = 0.98;
        }
      } else if (playerNearNet) {
        // Player rushed the net -> blast a fast passing drive or deep corner clear over them
        if (shuttle.z > 94 && shuttle.y < 590) {
          shotType = 'smash';
          targetY = 140;
          power = 1.0;
        } else {
          shotType = 'drive';
          targetY = 105;
          power = 0.94;
        }
      } else {
        // Standard high ball -> power smash into the open lateral channel
        shotType = 'smash';
        targetY = 185;
        power = 0.98;
      }
    } else if (shuttle.z >= 50) {
      // Mid-height rally exchange
      if (playerNearNet) {
        // Lob or drive deep past the net-rushing player
        shotType = shuttle.y > 620 ? 'clear' : 'drive';
        targetY = shotType === 'clear' ? 96 : 120;
        power = 0.92;
      } else if (playerDeepBack) {
        // Drop into the unguarded front court
        shotType = 'drop';
        targetY = 324;
        power = 0.76;
      } else {
        // Fast tactical cross-court drive
        shotType = 'drive';
        targetY = 148;
        power = 0.9;
      }
    } else {
      // Low shuttle defense (shuttle.z < 50)
      if (playerDeepBack && bot.y < 545) {
        // Net tumble drop into open front court
        shotType = 'drop';
        targetY = 330;
        power = 0.72;
      } else {
        // High defensive clear to the open back corner to reset the rally safely
        shotType = 'clear';
        targetY = 98;
        power = 0.92;
      }
    }

    targetY = Math.max(92, Math.min(338, targetY));
  } else {
    // Red AI partner in 2v2 targeting Far Court: safe Y is [462, 708]
    const oppNearNet = oppY < 575;
    const oppDeep = oppY > 635;

    if (shuttle.z > 80) {
      shotType = oppDeep ? 'drop' : 'smash';
      targetY = oppDeep ? 476 : 615;
      power = 0.96;
    } else if (shuttle.z >= 50) {
      shotType = oppNearNet ? 'clear' : 'drive';
      targetY = oppNearNet ? 702 : 650;
      power = 0.9;
    } else {
      shotType = 'clear';
      targetY = 700;
      power = 0.9;
    }

    targetY = Math.max(462, Math.min(708, targetY));
  }

  return { shotType, targetX, targetY, power };
}

export function updateAiBot(
  bot: PlayerState,
  shuttle: ShuttleState,
  mode: GameMode,
  teammate: PlayerState | null,
  opponent?: PlayerState | null
): BotDecision {
  const isRed = bot.team === 'red';
  const difficulty = bot.aiDifficulty || 'pro';

  // Home positioning strictly on the bot's own half of the court
  let homeX = COURT.CENTER_X;
  let homeY: number;

  if (mode === '1v1') {
    homeY = isRed ? 205 : 600;
  } else {
    // 2v2 Doubles formation
    const isFront = bot.slot === 'red_1' || bot.slot === 'blue_1';
    if (isFront) {
      homeY = isRed ? 295 : 510;
      homeX = teammate ? (teammate.x < 200 ? 265 : 135) : 200;
    } else {
      homeY = isRed ? 135 : 665;
      homeX = teammate ? (teammate.x < 200 ? 275 : 125) : 200;
    }
  }

  // Check if shuttlecock is heading towards bot's half
  const headingToMe = isRed ? shuttle.vy < 0 : shuttle.vy > 0;
  const shuttleOnMyHalf = isRed ? shuttle.y < COURT.NET_Y - 10 : shuttle.y > COURT.NET_Y + 10;

  let moveTargetX = homeX;
  let moveTargetY = homeY;
  let shouldJump = false;
  let shotToTake: ShotType | null = null;
  let shotPower = 0.9;
  let aimTargetX = COURT.CENTER_X;
  let aimTargetY = isRed ? 680 : 120;

  if (headingToMe || (shuttleOnMyHalf && shuttle.lastHitTeam !== bot.team)) {
    // Predict where the shuttle will land on the bot's half
    const predicted = predictShuttleLanding(shuttle);

    // Clamp target strictly inside bot's own half of the court so it NEVER runs into or across the net
    const minY = isRed ? COURT.NEAR_MIN_Y + 8 : COURT.FAR_MIN_Y + 8;
    const maxY = isRed ? COURT.NEAR_MAX_Y - 8 : COURT.FAR_MAX_Y - 8;

    let shouldIntercept = true;
    if (mode === '2v2' && teammate) {
      const myDist = Math.hypot(bot.x - predicted.x, bot.y - predicted.y);
      const teamDist = Math.hypot(teammate.x - predicted.x, teammate.y - predicted.y);
      if (teamDist < myDist - 35) {
        shouldIntercept = false;
      }
    }

    if (shouldIntercept) {
      // Blend current shuttle position and predicted landing when shuttle is close so bot tracks fast drives
      const distToShuttle = Math.hypot(bot.x - shuttle.x, bot.y - shuttle.y);
      const trackX = shuttleOnMyHalf && distToShuttle < 120 ? shuttle.x * 0.45 + predicted.x * 0.55 : predicted.x;
      const trackY = shuttleOnMyHalf && distToShuttle < 120 ? shuttle.y * 0.45 + predicted.y * 0.55 : predicted.y;

      moveTargetX = Math.max(COURT.DOUBLES_X_MIN, Math.min(COURT.DOUBLES_X_MAX, trackX));
      moveTargetY = Math.max(minY, Math.min(maxY, trackY));

      // Only swing once the shuttle has actually crossed onto the bot's side of the net!
      if (shuttleOnMyHalf && shuttle.lastHitTeam !== bot.team) {
        const dist = Math.hypot(bot.x - shuttle.x, bot.y - shuttle.y);

        if (dist < 68 && shuttle.z >= 14 && shuttle.z <= 165) {
          const tactical = selectTacticalAiTarget(bot, shuttle, mode, opponent);
          shotToTake = tactical.shotType;
          shotPower = tactical.power;
          aimTargetX = tactical.targetX;
          aimTargetY = tactical.targetY;

          if (shotToTake === 'smash' && bot.z === 0 && shuttle.z > 88) {
            shouldJump = true;
          }
        } else if (dist < 85 && shuttle.z > 90 && bot.z === 0) {
          if (difficulty !== 'novice') {
            shouldJump = true;
          }
        }
      }
    }
  }

  const dx = moveTargetX - bot.x;
  const dy = moveTargetY - bot.y;
  const distToTarget = Math.hypot(dx, dy);

  // Smooth proportional arrival steering instead of binary Math.sign step
  let moveX = 0;
  let moveY = 0;
  if (distToTarget > 1.5) {
    const arrivalScale = Math.min(1, distToTarget / 26);
    moveX = (dx / distToTarget) * arrivalScale;
    moveY = (dy / distToTarget) * arrivalScale;
  }

  return {
    moveX,
    moveY,
    desiredPos: { x: moveTargetX, y: moveTargetY },
    jump: shouldJump,
    swing: shotToTake,
    power: shotPower,
    targetX: aimTargetX,
    targetY: aimTargetY,
  };
}
