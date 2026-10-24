/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = '1v1' | '2v2';

export type PlayerSlot = 'red_1' | 'red_2' | 'blue_1' | 'blue_2';

export type TeamColor = 'red' | 'blue';

export type ShotType = 'smash' | 'drop' | 'clear' | 'drive';

export type ClearVariant = 'mid' | 'deep' | 'max';
export type DropVariant = 'tight' | 'push' | 'max';
export type DriveVariant = 'soft' | 'fast' | 'max';
export type SmashVariant = 75 | 90 | 100;

export type SignatureSkillId = 'thunder_smash' | 'deceptive_slice' | 'iron_defense' | 'stamina_surge';

export interface SignatureSkillState {
  id: SignatureSkillId;
  name: string;
  proName: string;
  hotkey: string;
  charge: number; // 0 to 100
  activeUntil: number; // timestamp
}

export interface ShotVariantsConfig {
  clear: ClearVariant;
  drop: DropVariant;
  drive: DriveVariant;
  smash: SmashVariant;
  safetyLock: boolean;
}

export type PlayerAnimationState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'swinging'
  | 'diving'
  | 'celebrating'
  | 'disappointed';

export interface PlayerStats {
  smashes: number;
  drops: number;
  clears: number;
  drives: number;
  saves: number;
  pointsWon: number;
  highestSmashSpeed: number;
}

export interface PlayerState {
  id: string;
  slot: PlayerSlot;
  team: TeamColor;
  name: string;
  countryCode: string;
  isAi: boolean;
  aiDifficulty?: 'novice' | 'pro' | 'legend';
  x: number;      // Lateral Court X (0 to 400, center is 200)
  y: number;      // Longitudinal Court Y (0 to 800; Near/Bottom: 40-380, Net: 400, Far/Top: 420-760)
  z: number;      // Height above ground (0 = floor, > 0 is jump height)
  vx: number;
  vy: number;
  vz: number;
  stridePhase: number;
  torsoLean: number;
  facing: 'up' | 'down' | 'left' | 'right';
  state: PlayerAnimationState;
  swingType: ShotType | null;
  swingProgress: number; // 0 to 1
  jumpCharge: number;
  stamina: number; // 0 to 100
  color: string;
  glowColor: string;
  jerseyNumber: number;
  cyberSuit: string;
  activeSkill: SignatureSkillId | null;
  stats: PlayerStats;
  trailPoints?: Array<{ x: number; y: number; z: number; alpha: number }>;
}

export interface ShuttleState {
  x: number;      // Lateral X (0 to 400)
  y: number;      // Longitudinal Y (0 to 800)
  z: number;      // Vertical Height Z (0 to 300)
  vx: number;
  vy: number;
  vz: number;
  curveX?: number; // Lateral slice curve acceleration
  speedKmH: number;
  rotation: number;
  lastHitBy: PlayerSlot | null;
  lastHitTeam: TeamColor | null;
  lastShotType: ShotType | null;
  isSmash: boolean;
  isThunderSmash?: boolean;
  trail: Array<{ x: number; y: number; z: number; alpha: number; color?: string }>;
  state: 'in_play' | 'grounded' | 'net_fault' | 'out_of_bounds' | 'service';
}

export type MatchStatus =
  | 'waiting'
  | 'ready'
  | 'serving'
  | 'rally'
  | 'point_scored'
  | 'deuce'
  | 'draw'
  | 'match_over';

export interface HawkEyeData {
  active: boolean;
  shuttleX: number;
  shuttleY: number;
  isInside: boolean;
  distanceFromLineMm: number;
  lineName: string;
  timestamp: number;
}

export interface CrowdState {
  hype: number; // 0 to 100
  reaction: 'idle' | 'cheer' | 'gasp' | 'applause' | 'wave' | 'match_point';
  flashTimer: number;
  chantText: string;
  cheerIntensity: number; // 0 to 1
}

export interface MatchRules {
  mode: GameMode;
  targetPoints: number; // 7, 11, or 21
  winByTwo: boolean;
  suddenDeathCap: number; // e.g. 30
  timedMatch: boolean;
  durationSeconds: number; // e.g. 180 seconds
  allowDraws: boolean;
}
