/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { CrowdState, GameMode, PlayerState, ShuttleState, TeamColor } from '../types/game';
import { COURT } from '../utils/physics';

interface BadmintonCourtProps {
  mode: GameMode;
  players: Record<string, PlayerState | null>;
  shuttle: ShuttleState;
  crowd: CrowdState;
  canServe: boolean;
  servingTeam?: TeamColor;
  scoreNear?: number;
  scoreFar?: number;
  targetPoints?: number;
  timedMatch?: boolean;
  timeRemainingSeconds?: number;
  matchElapsedSeconds?: number;
  rallyElapsedSeconds?: number;
  rallyCount?: number;
  touchpadTarget?: { x: number; y: number } | null;
  onServe: () => void;
  onPointerTrack?: (x: number, y: number) => void;
  announcement?: string | null;
  announcementSub?: string | null;
}

interface SideSpectator {
  side: 'left' | 'right' | 'top';
  row: number;
  col: number;
  t: number; // 0 to 1 along court length
  shirtColor: string;
  accentColor: string;
  skinColor: string;
  hairColor: string;
  hairStyle: 'short' | 'cap' | 'ponytail' | 'headband';
  propType: 'none' | 'glowstick' | 'flag' | 'thundersticks' | 'camera';
  propColor: string;
  phase: number;
  cheerCry?: string;
}

export const BadmintonCourt: React.FC<BadmintonCourtProps> = ({
  mode,
  players,
  shuttle,
  crowd,
  canServe,
  servingTeam,
  scoreNear = 0,
  scoreFar = 0,
  targetPoints = 11,
  timedMatch = false,
  timeRemainingSeconds = 180,
  matchElapsedSeconds = 0,
  rallyElapsedSeconds = 0,
  rallyCount = 0,
  touchpadTarget,
  onServe,
  onPointerTrack,
  announcement,
  announcementSub,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live state ref so the requestAnimationFrame render loop never tears down / restarts mid-rally
  const livePropsRef = useRef({
    mode,
    players,
    shuttle,
    crowd,
    servingTeam,
    scoreNear,
    scoreFar,
    targetPoints,
    timedMatch,
    timeRemainingSeconds,
    matchElapsedSeconds,
    rallyElapsedSeconds,
    rallyCount,
    touchpadTarget,
    announcementSub,
  });
  livePropsRef.current = {
    mode,
    players,
    shuttle,
    crowd,
    servingTeam,
    scoreNear,
    scoreFar,
    targetPoints,
    timedMatch,
    timeRemainingSeconds,
    matchElapsedSeconds,
    rallyElapsedSeconds,
    rallyCount,
    touchpadTarget,
    announcementSub,
  };

  // Sub-frame visual kinematic interpolation state for silky-smooth character motion
  const visualPoseRef = useRef<
    Record<
      string,
      {
        x: number;
        y: number;
        z: number;
        lean: number;
        strideSin: number;
        strideCos: number;
      }
    >
  >({});

  // Pre-generate realistic articulated spectators in tiered Left, Right, and Top VIP grandstands
  const spectators = useMemo(() => {
    const list: SideSpectator[] = [];
    const shirts = [
      '#ef4444', // red jersey
      '#3b82f6', // royal blue jersey
      '#f97316', // orange kit
      '#10b981', // emerald kit
      '#facc15', // gold jersey
      '#a855f7', // purple hoodie
      '#ec4899', // pink jersey
      '#f8fafc', // white national kit
      '#06b6d4', // cyan pro top
      '#1e293b', // dark navy jacket
    ];
    const accents = ['#ffffff', '#fde047', '#38bdf8', '#f43f5e', '#34d399', '#cbd5e1'];
    const skins = ['#fed7aa', '#fcd34d', '#f59e0b', '#d97706', '#b45309', '#fde68a'];
    const hairs = ['#0f172a', '#1c1917', '#451a03', '#78350f', '#92400e', '#d97706', '#334155'];
    const hairStyles: SideSpectator['hairStyle'][] = ['short', 'cap', 'ponytail', 'headband'];
    const props: SideSpectator['propType'][] = [
      'none',
      'none',
      'glowstick',
      'thundersticks',
      'flag',
      'camera',
      'none',
    ];
    const cries = ['WHAT A SMASH!', 'LET’S GO!', 'DEFENSE!', 'UNBELIEVABLE!', '🔥 BOOM!', '👏 BRAVO!'];

    for (const side of ['left', 'right'] as const) {
      for (let col = 0; col < 4; col++) {
        const count = 16;
        for (let r = 0; r < count; r++) {
          // On the left side, reserve rows 4..10 as a dedicated Courtside Stand Projector Bay (zero audience overlap)
          if (side === 'left' && r >= 4 && r <= 10) continue;
          // On the right side, leave a central staircase aisle at r === 8
          if (side === 'right' && r === 8) continue;
          const seed = r * 7 + col * 13 + (side === 'left' ? 3 : 11);
          const propType = props[seed % props.length];
          list.push({
            side,
            row: r,
            col,
            t: r / (count - 1),
            shirtColor: shirts[seed % shirts.length],
            accentColor: accents[(seed * 3) % accents.length],
            skinColor: skins[(seed * 5) % skins.length],
            hairColor: hairs[(seed * 2) % hairs.length],
            hairStyle: hairStyles[seed % hairStyles.length],
            propType,
            propColor: accents[(seed * 4) % accents.length],
            phase: (r * 0.45 + col * 0.85 + (side === 'left' ? 0 : 1.2)) % (Math.PI * 2),
            cheerCry: seed % 19 === 0 ? cries[seed % cries.length] : undefined,
          });
        }
      }
    }

    for (let row = 0; row < 3; row++) {
      const count = 20;
      for (let c = 0; c < count; c++) {
        if (c === 10) continue; // VIP central aisle
        const seed = c * 5 + row * 17 + 9;
        list.push({
          side: 'top',
          row,
          col: c,
          t: c / (count - 1),
          shirtColor: shirts[seed % shirts.length],
          accentColor: accents[(seed * 2) % accents.length],
          skinColor: skins[(seed * 3) % skins.length],
          hairColor: hairs[(seed * 4) % hairs.length],
          hairStyle: hairStyles[seed % hairStyles.length],
          propType: props[(seed + 1) % props.length],
          propColor: accents[(seed * 5) % accents.length],
          phase: (c * 0.35 + row * 0.9) % (Math.PI * 2),
        });
      }
    }

    return list;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const {
        players,
        shuttle,
        crowd,
        servingTeam,
        scoreNear,
        scoreFar,
        targetPoints,
        timedMatch,
        timeRemainingSeconds,
        matchElapsedSeconds,
        rallyElapsedSeconds,
        rallyCount,
        touchpadTarget,
        announcementSub,
      } = livePropsRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();

      // 1. Deep Stadium Navy Background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.42,
        60,
        width * 0.5,
        height * 0.5,
        width * 0.7
      );
      bgGrad.addColorStop(0, '#0c213b');
      bgGrad.addColorStop(0.55, '#071120');
      bgGrad.addColorStop(1, '#040811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Twin Overhead Stadium Floodlights & Volumetric Cones
      const drawFloodlight = (lx: number, ly: number) => {
        ctx.save();
        const coneGrad = ctx.createRadialGradient(lx, ly, 5, lx, ly + 160, 320);
        coneGrad.addColorStop(0, 'rgba(186, 230, 253, 0.25)');
        coneGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.08)');
        coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.arc(lx, ly + 80, 300, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#e0f2fe';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(lx - 26, ly - 8, 52, 16);
        ctx.restore();
      };

      drawFloodlight(width * 0.16, 68);
      drawFloodlight(width * 0.84, 68);

      // Perspective Projection Math for the Portrait Court inside the Widescreen Arena
      const courtBottomY = height * 0.89;
      const courtTopY = height * 0.21;
      const courtSpanY = courtBottomY - courtTopY;
      const centerX = width * 0.5;

      const getScale = (y: number) => 1.0 - (y / COURT.LENGTH) * 0.44;

      const toScreenX = (x: number, y: number) => {
        const scale = getScale(y);
        const halfWidthAtNear = width * 0.215;
        const halfSpan = halfWidthAtNear * scale;
        return centerX + ((x - COURT.CENTER_X) / (COURT.WIDTH / 2)) * halfSpan;
      };

      const toFloorY = (y: number) => {
        const normY = y / COURT.LENGTH;
        const curvedY = Math.pow(Math.max(0, normY), 0.92);
        return courtBottomY - curvedY * courtSpanY;
      };

      const toScreenY = (y: number, z: number) => {
        const floorY = toFloorY(y);
        const scale = getScale(y);
        return floorY - z * scale * 1.15;
      };

      const shuttleScreenX = toScreenX(shuttle.x, shuttle.y);
      const shuttleScreenY = toScreenY(shuttle.y, shuttle.z);
      const isCheering =
        crowd.reaction === 'cheer' || crowd.hype > 78 || shuttle.isSmash || shuttle.state === 'grounded';

      // Helper to render an articulated human spectator with seat, torso, head tracking, arms, and props
      const drawArticulatedSpectator = (
        s: SideSpectator,
        sx: number,
        sy: number,
        personScale: number
      ) => {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(personScale, personScale);

        // 1. Contoured Stadium Bucket Seat Backrest behind the person
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 13, 3);
        ctx.fill();
        ctx.stroke();

        // Wave & cheer vertical jump offset
        const wavePhase = now * 0.014 - s.t * 4.5 + s.phase;
        const standBounce = isCheering
          ? Math.max(0, Math.sin(wavePhase)) * -5.5 - 2
          : Math.sin(now * 0.004 + s.phase) * -0.7;

        // Subtle lean toward the court / shuttlecock
        const dxToShuttle = shuttleScreenX - sx;
        const dyToShuttle = shuttleScreenY - sy;
        const lookDirX = Math.max(-2.2, Math.min(2.2, dxToShuttle / 180));
        const lookDirY = Math.max(-1.5, Math.min(1.5, dyToShuttle / 220));

        ctx.translate(0, standBounce);

        // 2. Torso / Jersey / Jacket with shoulder contours
        ctx.fillStyle = s.shirtColor;
        ctx.beginPath();
        ctx.roundRect(-7.5, -6, 15, 11, 4);
        ctx.fill();

        // Jersey collar / chest stripe
        ctx.fillStyle = s.accentColor;
        ctx.beginPath();
        ctx.roundRect(-4, -5.5, 8, 2.2, 1);
        ctx.fill();

        // 3. Articulated Left & Right Arms
        const clapWave = Math.sin(now * 0.022 + s.phase);
        ctx.strokeStyle = s.shirtColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        if (isCheering) {
          // Raised cheering arms in V-pose waving rhythmically
          const armSwing = Math.sin(now * 0.018 + s.phase) * 3;
          ctx.beginPath();
          ctx.moveTo(-6.5, -3.5);
          ctx.lineTo(-11 + armSwing * 0.5, -14);
          ctx.moveTo(6.5, -3.5);
          ctx.lineTo(11 + armSwing * 0.5, -14);
          ctx.stroke();

          // Hands
          ctx.fillStyle = s.skinColor;
          ctx.beginPath();
          ctx.arc(-11 + armSwing * 0.5, -14.5, 1.8, 0, Math.PI * 2);
          ctx.arc(11 + armSwing * 0.5, -14.5, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Fan Props during cheer (Glowsticks, Flags, Thundersticks)
          if (s.propType === 'glowstick' || s.propType === 'thundersticks') {
            ctx.save();
            ctx.strokeStyle = s.propColor;
            ctx.shadowColor = s.propColor;
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(11 + armSwing * 0.5, -15);
            ctx.lineTo(14 + armSwing, -23);
            if (s.propType === 'thundersticks') {
              ctx.moveTo(-11 + armSwing * 0.5, -15);
              ctx.lineTo(-14 + armSwing, -23);
            }
            ctx.stroke();
            ctx.restore();
          } else if (s.propType === 'flag') {
            ctx.save();
            ctx.fillStyle = s.propColor;
            ctx.fillRect(11 + armSwing * 0.5, -24, 9, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(11 + armSwing * 0.5, -22, 9, 2);
            ctx.restore();
          }
        } else {
          // Seated posture: arms resting or clapping in front of torso
          const isClapping = shuttle.state === 'in_play' && (s.row + s.col) % 3 === 0;
          const handSpread = isClapping ? 2 + Math.abs(clapWave) * 3.5 : 5.5;
          ctx.beginPath();
          ctx.moveTo(-6.5, -3);
          ctx.lineTo(-handSpread, 2);
          ctx.moveTo(6.5, -3);
          ctx.lineTo(handSpread, 2);
          ctx.stroke();

          ctx.fillStyle = s.skinColor;
          ctx.beginPath();
          ctx.arc(-handSpread, 2, 1.6, 0, Math.PI * 2);
          ctx.arc(handSpread, 2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Neck & Head (Pans smoothly to follow the shuttlecock!)
        ctx.fillStyle = s.skinColor;
        ctx.beginPath();
        ctx.arc(lookDirX * 0.6, -11.5 + lookDirY * 0.3, 4.6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes looking toward the court/shuttle
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(lookDirX * 1.1 - 1.5, -11.5 + lookDirY * 0.5, 0.75, 0, Math.PI * 2);
        ctx.arc(lookDirX * 1.1 + 1.5, -11.5 + lookDirY * 0.5, 0.75, 0, Math.PI * 2);
        ctx.fill();

        // 5. Hair / Cap / Headband
        ctx.fillStyle = s.hairColor;
        ctx.beginPath();
        ctx.arc(lookDirX * 0.5, -12.8 + lookDirY * 0.2, 4.7, Math.PI, Math.PI * 2);
        ctx.fill();

        if (s.hairStyle === 'cap') {
          ctx.fillStyle = s.accentColor;
          ctx.beginPath();
          ctx.arc(lookDirX * 0.5, -13 + lookDirY * 0.2, 4.8, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(lookDirX * 0.5 - 4.5, -13.5, 9, 1.8);
        } else if (s.hairStyle === 'headband') {
          ctx.fillStyle = s.accentColor;
          ctx.fillRect(lookDirX * 0.5 - 4.4, -13.8, 8.8, 1.6);
        } else if (s.hairStyle === 'ponytail') {
          ctx.fillStyle = s.hairColor;
          ctx.beginPath();
          ctx.arc(lookDirX * 0.5 - (s.side === 'left' ? 4.5 : -4.5), -12, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Smartphone / Camera Strobe Flash Effect
        if (
          s.propType === 'camera' &&
          (isCheering || shuttle.isSmash) &&
          Math.sin(now * 0.035 + s.phase * 5) > 0.92
        ) {
          ctx.save();
          const flashGrad = ctx.createRadialGradient(0, -14, 1, 0, -14, 24);
          flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          flashGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.55)');
          flashGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(0, -14, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 7. Occasional Live Fan Cheer Callout Bubble during Big Moments
        if (isCheering && s.cheerCry && Math.sin(now * 0.006 + s.phase) > 0.65) {
          ctx.save();
          ctx.font = '800 8px Plus Jakarta Sans, sans-serif';
          const tw = ctx.measureText(s.cheerCry).width;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = s.accentColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-tw / 2 - 5, -31, tw + 10, 12, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(s.cheerCry, 0, -22.5);
          ctx.restore();
        }

        ctx.restore();
      };

      // 3. Draw Top VIP Grandstand Tiers, Spectators & "BWF WORLD CHAMPIONSHIP - ARENA" Banner
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
      ctx.lineWidth = 1;
      for (let tier = 0; tier < 3; tier++) {
        const ty = 26 + tier * 20;
        const tw = 380 + tier * 28;
        ctx.fillRect(centerX - tw / 2, ty, tw, 18);
        ctx.strokeRect(centerX - tw / 2, ty, tw, 18);
      }
      ctx.restore();

      spectators.forEach((s) => {
        if (s.side === 'top') {
          const arcX = centerX + (s.t - 0.5) * 340;
          const arcY = 36 + s.row * 20 - Math.sin(s.t * Math.PI) * 5;
          drawArticulatedSpectator(s, arcX, arcY, 0.78 + s.row * 0.05);
        }
      });

      // Format Match Timing & Rally Timing strings (MM:SS)
      const fmtClock = (secs: number) => {
        const s = Math.max(0, Math.floor(secs));
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
      };
      const primaryTimeStr = fmtClock(timedMatch ? timeRemainingSeconds : matchElapsedSeconds);
      const primaryTimeLabel = timedMatch ? 'TIME LEFT' : 'MATCH TIME';
      const rallyTimeStr = fmtClock(rallyElapsedSeconds);
      const scoreLeftStr = String(scoreNear).padStart(2, '0');
      const scoreRightStr = String(scoreFar).padStart(2, '0');

      // 3b. Clean Top VIP Balcony LED Fascia Banner (below Top VIP spectators, keeping faces 100% clear)
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = isCheering ? '#38bdf8' : '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(centerX - 180, courtTopY - 36, 360, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isCheering ? '#38bdf8' : '#34d399';
      ctx.font = '800 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isCheering
          ? '★ CROWD ROARING - WORLD TOUR ARENA ★'
          : 'BWF WORLD CHAMPIONSHIP - VIP ARENA',
        centerX,
        courtTopY - 21
      );
      ctx.restore();

      // 4. Draw Tiered Left & Right Grandstand Bleachers + Dedicated Left Courtside Projector Bay
      for (const side of ['left', 'right'] as const) {
        const dir = side === 'left' ? -1 : 1;

        // On the left side, split the bleachers into Near/Lower (15..180) and Far/Upper (555..785)
        // so the central section (195..540) forms a dedicated, unobstructed Courtside Projector Bay
        const segments =
          side === 'left'
            ? [
                { yStart: 15, yEnd: 180 },
                { yStart: 555, yEnd: 785 },
              ]
            : [{ yStart: 15, yEnd: 785 }];

        for (const seg of segments) {
          const nearEdgeX = toScreenX(
            side === 'left' ? COURT.OUT_X_MIN - 28 : COURT.OUT_X_MAX + 28,
            seg.yStart
          );
          const farEdgeX = toScreenX(
            side === 'left' ? COURT.OUT_X_MIN - 28 : COURT.OUT_X_MAX + 28,
            seg.yEnd
          );

          // Draw 4 stepped stadium bleacher tiers for each segment
          for (let col = 3; col >= 0; col--) {
            const spreadStart = 26 - (seg.yStart / 800) * 7;
            const spreadEnd = 26 - (seg.yEnd / 800) * 7;
            const offsetNear = (col + 0.4) * spreadStart * dir;
            const offsetFar = (col + 0.4) * spreadEnd * dir;
            const offsetNearOuter = (col + 1.5) * spreadStart * dir;
            const offsetFarOuter = (col + 1.5) * spreadEnd * dir;

            ctx.save();
            ctx.fillStyle = col % 2 === 0 ? 'rgba(15, 23, 42, 0.82)' : 'rgba(30, 41, 59, 0.75)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nearEdgeX + offsetNear, toFloorY(seg.yStart) - col * 5);
            ctx.lineTo(nearEdgeX + offsetNearOuter, toFloorY(seg.yStart) - col * 5);
            ctx.lineTo(farEdgeX + offsetFarOuter, toFloorY(seg.yEnd) - col * 5);
            ctx.lineTo(farEdgeX + offsetFar, toFloorY(seg.yEnd) - col * 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Illuminated LED A-Frame Advertising Barrier along the bleacher segment edge
          ctx.save();
          ctx.strokeStyle = isCheering ? '#38bdf8' : '#10b981';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(nearEdgeX + 6 * dir, toFloorY(seg.yStart + 5));
          ctx.lineTo(farEdgeX + 6 * dir, toFloorY(seg.yEnd - 5));
          ctx.stroke();
          ctx.restore();
        }
      }

      // Dedicated Recessed Courtside Projector Bay Deck (Left Side, between Lower & Upper Bleachers)
      ctx.save();
      const bayNearInnerX = toScreenX(COURT.OUT_X_MIN - 26, 200);
      const bayFarInnerX = toScreenX(COURT.OUT_X_MIN - 26, 535);
      const bayNearOuterX = 186;
      const bayFarOuterX = 186;
      const bayNearY = toFloorY(200);
      const bayFarY = toFloorY(535);

      const bayGrad = ctx.createLinearGradient(bayNearOuterX, bayFarY, bayNearInnerX, bayNearY);
      bayGrad.addColorStop(0, 'rgba(6, 12, 24, 0.96)');
      bayGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
      ctx.fillStyle = bayGrad;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bayNearInnerX, bayNearY);
      ctx.lineTo(bayNearOuterX, bayNearY);
      ctx.lineTo(bayFarOuterX, bayFarY);
      ctx.lineTo(bayFarInnerX, bayFarY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle technical grid lines on the recessed projector bay floor
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gy = bayFarY + 24; gy < bayNearY - 12; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(bayNearOuterX + 8, gy);
        ctx.lineTo(bayFarInnerX - 10, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Render Left & Right spectators from back row to front row for natural depth layering
      const sideSpecs = spectators
        .filter((s) => s.side === 'left' || s.side === 'right')
        .sort((a, b) => b.col - a.col || b.row - a.row);

      sideSpecs.forEach((s) => {
        const yCoord = 35 + s.t * 730;
        const baseEdgeX =
          s.side === 'left'
            ? toScreenX(COURT.OUT_X_MIN - 34, yCoord)
            : toScreenX(COURT.OUT_X_MAX + 34, yCoord);
        const perspectiveRowSpread = 19 + (1 - s.t) * 7;
        const colOffset = (s.col + 0.85) * perspectiveRowSpread * (s.side === 'left' ? -1 : 1);
        const sx = baseEdgeX + colOffset;
        const sy = toFloorY(yCoord) - s.col * 5.5;
        const personScale = 0.72 + (1 - s.t) * 0.34;

        drawArticulatedSpectator(s, sx, sy, personScale);
      });

      // 5. Outer Dark Emerald Court Apron (Trapezoid) + On-Floor Laser Score/Timing Projection
      ctx.save();
      const apronGrad = ctx.createLinearGradient(0, courtBottomY, 0, courtTopY);
      apronGrad.addColorStop(0, '#095c43');
      apronGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = apronGrad;

      ctx.beginPath();
      ctx.moveTo(toScreenX(-22, -10), toFloorY(-10));
      ctx.lineTo(toScreenX(422, -10), toFloorY(-10));
      ctx.lineTo(toScreenX(422, 810), toFloorY(810));
      ctx.lineTo(toScreenX(-22, 810), toFloorY(810));
      ctx.closePath();
      ctx.fill();

      // On-Court Floor Laser Hologram Projected onto Top Court Apron (between Far Baseline and Top Edge)
      const apronProjY = toFloorY(774);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(centerX - 125, apronProjY - 11, 250, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.font = '800 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `SCORE ${scoreLeftStr}-${scoreRightStr}  |  ${primaryTimeLabel} ${primaryTimeStr}  |  RALLY ${rallyTimeStr}`,
        centerX,
        apronProjY + 1.5
      );
      ctx.restore();

      // 6. Inner BWF Tournament Green Court Surface
      ctx.save();
      const matGrad = ctx.createLinearGradient(0, courtBottomY, 0, courtTopY);
      matGrad.addColorStop(0, '#108963');
      matGrad.addColorStop(0.5, '#0d7a58');
      matGrad.addColorStop(1, '#0c6f50');
      ctx.fillStyle = matGrad;

      ctx.beginPath();
      ctx.moveTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.RED_BASELINE), toFloorY(COURT.RED_BASELINE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.RED_BASELINE), toFloorY(COURT.RED_BASELINE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.BLUE_BASELINE), toFloorY(COURT.BLUE_BASELINE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.BLUE_BASELINE), toFloorY(COURT.BLUE_BASELINE));
      ctx.closePath();
      ctx.fill();

      // Crisp White Regulation Boundary Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.beginPath();
      // Singles Inner Sidelines
      ctx.moveTo(toScreenX(COURT.SINGLES_X_MIN, COURT.RED_BASELINE), toFloorY(COURT.RED_BASELINE));
      ctx.lineTo(toScreenX(COURT.SINGLES_X_MIN, COURT.BLUE_BASELINE), toFloorY(COURT.BLUE_BASELINE));
      ctx.moveTo(toScreenX(COURT.SINGLES_X_MAX, COURT.RED_BASELINE), toFloorY(COURT.RED_BASELINE));
      ctx.lineTo(toScreenX(COURT.SINGLES_X_MAX, COURT.BLUE_BASELINE), toFloorY(COURT.BLUE_BASELINE));

      // Short Service Lines
      ctx.moveTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.RED_SHORT_SERVICE), toFloorY(COURT.RED_SHORT_SERVICE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.RED_SHORT_SERVICE), toFloorY(COURT.RED_SHORT_SERVICE));
      ctx.moveTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.BLUE_SHORT_SERVICE), toFloorY(COURT.BLUE_SHORT_SERVICE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.BLUE_SHORT_SERVICE), toFloorY(COURT.BLUE_SHORT_SERVICE));

      // Long Service Lines for Doubles
      ctx.moveTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.RED_DOUBLES_SERVICE), toFloorY(COURT.RED_DOUBLES_SERVICE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.RED_DOUBLES_SERVICE), toFloorY(COURT.RED_DOUBLES_SERVICE));
      ctx.moveTo(toScreenX(COURT.DOUBLES_X_MIN, COURT.BLUE_DOUBLES_SERVICE), toFloorY(COURT.BLUE_DOUBLES_SERVICE));
      ctx.lineTo(toScreenX(COURT.DOUBLES_X_MAX, COURT.BLUE_DOUBLES_SERVICE), toFloorY(COURT.BLUE_DOUBLES_SERVICE));

      // Center Line dividing Left/Right Service Courts
      ctx.moveTo(toScreenX(COURT.CENTER_X, COURT.RED_BASELINE), toFloorY(COURT.RED_BASELINE));
      ctx.lineTo(toScreenX(COURT.CENTER_X, COURT.RED_SHORT_SERVICE), toFloorY(COURT.RED_SHORT_SERVICE));
      ctx.moveTo(toScreenX(COURT.CENTER_X, COURT.BLUE_SHORT_SERVICE), toFloorY(COURT.BLUE_SHORT_SERVICE));
      ctx.lineTo(toScreenX(COURT.CENTER_X, COURT.BLUE_BASELINE), toFloorY(COURT.BLUE_BASELINE));
      ctx.stroke();
      ctx.restore();

      // 6b. Fingertip / Touchpad Target Ring on Near Court
      if (touchpadTarget) {
        const tx = toScreenX(touchpadTarget.x, touchpadTarget.y);
        const ty = toFloorY(touchpadTarget.y);
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.ellipse(tx, ty + 10, 16, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Umpire High Chair, Service Judge, 4 Official Line Judges & Courtside Press Photographers
      const umpireX = toScreenX(COURT.DOUBLES_X_MAX + 30, COURT.NET_Y);
      const umpireBaseY = toFloorY(COURT.NET_Y) + 18;
      ctx.save();
      // High Chair Ladder Frame
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(umpireX - 8, umpireBaseY);
      ctx.lineTo(umpireX - 5, umpireBaseY - 68);
      ctx.moveTo(umpireX + 8, umpireBaseY);
      ctx.lineTo(umpireX + 5, umpireBaseY - 68);
      for (let rung = 14; rung < 62; rung += 14) {
        ctx.moveTo(umpireX - 6, umpireBaseY - rung);
        ctx.lineTo(umpireX + 6, umpireBaseY - rung);
      }
      ctx.stroke();

      // Umpire Seat & Score Tablet
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(umpireX - 9, umpireBaseY - 72, 18, 6);
      // Umpire Blazer & Tie
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(umpireX - 8, umpireBaseY - 85, 16, 15, 3);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(umpireX - 1, umpireBaseY - 83, 2, 8);
      // Umpire Head tracking the shuttle
      const umpLookY = shuttle.y > COURT.NET_Y ? -1.5 : 1.5;
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(umpireX - 1, umpireBaseY - 91 + umpLookY * 0.4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(umpireX - 1, umpireBaseY - 92.5 + umpLookY * 0.4, 5.1, Math.PI, Math.PI * 2);
      ctx.fill();
      // Scorepad tablet in front of Umpire
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(umpireX - 13, umpireBaseY - 78, 6, 4);
      ctx.restore();

      // Service Judge seated at Left Net Post
      const sjX = toScreenX(COURT.DOUBLES_X_MIN - 24, COURT.NET_Y);
      const sjY = toFloorY(COURT.NET_Y) + 4;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sjX - 6, sjY - 8, 12, 10);
      ctx.fillStyle = '#0f766e'; // Official teal polo
      ctx.beginPath();
      ctx.roundRect(sjX - 6.5, sjY - 14, 13, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(sjX + 1, sjY - 19, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7b. Dedicated Courtside Stand-Mounted Projector Inside the Left Broadcast Bay
      // Positioned cleanly in the recessed bay (screenY 282..474) with zero spectator overlap
      const standX = 286;
      const standFloorY = 468;
      const standHeadY = 432;

      const holoW = 176;
      const holoH = 134;
      const holoX = 198;
      const holoY = 282;

      ctx.save();
      // 1. Tripod Stand Base & Glowing LED Stabilizer Platform on the Broadcast Bay Floor
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.ellipse(standX, standFloorY + 2, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(standX, standFloorY + 1, 21, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3 Articulated Heavy-Duty Tripod Legs + Telescopic Center Column
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Left tripod leg
      ctx.moveTo(standX, standFloorY - 18);
      ctx.lineTo(standX - 17, standFloorY + 1);
      // Right tripod leg
      ctx.moveTo(standX, standFloorY - 18);
      ctx.lineTo(standX + 17, standFloorY + 1);
      // Front center tripod leg
      ctx.moveTo(standX, standFloorY - 18);
      ctx.lineTo(standX, standFloorY + 5);
      // Center vertical telescopic mast
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.moveTo(standX, standFloorY - 10);
      ctx.lineTo(standX, standHeadY + 6);
      ctx.stroke();

      // Tripod collar clamps
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(standX - 4, standFloorY - 21, 8, 4.5);
      ctx.fillRect(standX - 3.5, standFloorY - 30, 7, 4);

      // 2. Stand-Mounted Laser Projector Head Unit & Glowing Optical Lens
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(standX - 16, standHeadY - 6, 32, 13, 4);
      ctx.fill();
      ctx.stroke();

      // Projector side cooling vents & power status LED
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(standX - 10, standHeadY + 0.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(standX - 4, standHeadY - 1, 12, 2);

      // Glowing Upward Optical Projection Lens
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.ellipse(standX, standHeadY - 6, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Volumetric Laser Projection Cone from Stand Lens to Holographic Board
      const standBeamGrad = ctx.createLinearGradient(standX, standHeadY - 6, standX, holoY + holoH);
      standBeamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.52)');
      standBeamGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.22)');
      standBeamGrad.addColorStop(1, 'rgba(6, 182, 212, 0.06)');
      ctx.fillStyle = standBeamGrad;
      ctx.beginPath();
      ctx.moveTo(standX - 5, standHeadY - 6);
      ctx.lineTo(standX + 5, standHeadY - 6);
      ctx.lineTo(holoX + holoW - 8, holoY + holoH);
      ctx.lineTo(holoX + 8, holoY + holoH);
      ctx.closePath();
      ctx.fill();

      // Internal laser scan rays inside the projection cone
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(standX, standHeadY - 6);
      ctx.lineTo(holoX + holoW * 0.28, holoY + holoH);
      ctx.moveTo(standX, standHeadY - 6);
      ctx.lineTo(holoX + holoW * 0.5, holoY + holoH);
      ctx.moveTo(standX, standHeadY - 6);
      ctx.lineTo(holoX + holoW * 0.72, holoY + holoH);
      ctx.stroke();

      // 4. Projected Courtside Holographic Board Beside the Court
      const holoCenterX = holoX + holoW / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(6, 15, 28, 0.95)';
      ctx.strokeStyle = isCheering ? '#38bdf8' : 'rgba(16, 185, 129, 0.88)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = isCheering ? 'rgba(56, 189, 248, 0.45)' : 'rgba(16, 185, 129, 0.3)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(holoX, holoY, holoW, holoH, 9);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Holographic scanline texture
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let sy = holoY + 5; sy < holoY + holoH - 4; sy += 4) {
        ctx.beginPath();
        ctx.moveTo(holoX + 5, sy);
        ctx.lineTo(holoX + holoW - 5, sy);
        ctx.stroke();
      }

      // Header Strip: COURTSIDE STAND PROJECTOR
      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.beginPath();
      ctx.roundRect(holoX + 6, holoY + 5, holoW - 12, 15, 4);
      ctx.fill();

      // Pulsing green live dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(holoX + 14, holoY + 12.5, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '800 8px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('STAND PROJECTOR · LIVE', holoX + 21, holoY + 15.5);

      // Section A: Projected Match Score (YOU vs AI)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(holoX + 7, holoY + 24, holoW - 14, 42, 6);
      ctx.fill();
      ctx.stroke();

      // Left Team (YOU)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 8px Outfit, sans-serif';
      ctx.fillText(servingTeam === 'red' ? '🏸 YOU' : 'YOU', holoX + 40, holoY + 35);
      ctx.font = '900 20px JetBrains Mono, monospace';
      ctx.fillText(scoreLeftStr, holoX + 40, holoY + 58);

      // Center Divider & Target Points
      ctx.fillStyle = '#64748b';
      ctx.font = '800 12px JetBrains Mono, monospace';
      ctx.fillText(':', holoCenterX, holoY + 50);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 7px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`${mode.toUpperCase()} · ${targetPoints}PT`, holoCenterX, holoY + 61);

      // Right Team (AI)
      ctx.fillStyle = '#f87171';
      ctx.font = '800 8px Outfit, sans-serif';
      ctx.fillText(servingTeam === 'blue' ? 'AI 🏸' : 'AI', holoX + holoW - 40, holoY + 35);
      ctx.font = '900 20px JetBrains Mono, monospace';
      ctx.fillText(scoreRightStr, holoX + holoW - 40, holoY + 58);

      // Section B: Timing #1 (Match Time / Time Left) & Timing #2 (Rally Time)
      const boxY = holoY + 70;
      const halfBoxW = (holoW - 18) / 2;

      // Timing Box 1: Match Clock
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.42)';
      ctx.beginPath();
      ctx.roundRect(holoX + 7, boxY, halfBoxW, 32, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = '800 7px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`⏱ ${primaryTimeLabel}`, holoX + 7 + halfBoxW / 2, boxY + 11);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12.5px JetBrains Mono, monospace';
      ctx.fillText(primaryTimeStr, holoX + 7 + halfBoxW / 2, boxY + 26);

      // Timing Box 2: Rally Clock
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.beginPath();
      ctx.roundRect(holoX + 11 + halfBoxW, boxY, halfBoxW, 32, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 7px Plus Jakarta Sans, sans-serif';
      ctx.fillText('⏱ RALLY TIME', holoX + 11 + halfBoxW * 1.5, boxY + 11);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12.5px JetBrains Mono, monospace';
      ctx.fillText(rallyTimeStr, holoX + 11 + halfBoxW * 1.5, boxY + 26);

      // Section C: Projected Live Shot Speed & Rally Telemetry Strip
      const teleY = holoY + 106;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      ctx.roundRect(holoX + 7, teleY, holoW - 14, 21, 4);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 8px JetBrains Mono, monospace';
      const curSpeed = shuttle.speedKmH > 0 ? Math.round(shuttle.speedKmH) : 0;
      ctx.fillText(`⚡ ${curSpeed} KM/H`, holoX + 13, teleY + 13.5);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 8px JetBrains Mono, monospace';
      ctx.fillText(`RALLY: ${rallyCount} SHOTS`, holoX + holoW - 13, teleY + 13.5);

      ctx.restore(); // End Holographic Board
      ctx.restore(); // End Stand Projector

      // 4 Official BWF Line Judges (2 Near Baseline/Sideline, 2 Far Baseline/Sideline)
      const lineJudges = [
        { x: COURT.DOUBLES_X_MIN - 22, y: 95, scale: 0.92 },
        { x: COURT.DOUBLES_X_MAX + 22, y: 75, scale: 0.94 },
        { x: COURT.DOUBLES_X_MIN - 22, y: 715, scale: 0.65 },
        { x: COURT.DOUBLES_X_MAX + 22, y: 730, scale: 0.64 },
      ];
      const isOutCall =
        announcementSub && announcementSub.toLowerCase().includes('out');
      const isInCall =
        announcementSub && announcementSub.toLowerCase().includes('in');

      lineJudges.forEach((lj, idx) => {
        const lx = toScreenX(lj.x, lj.y);
        const ly = toFloorY(lj.y);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(lj.scale, lj.scale);

        // White Folding Official Chair
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-6, -12, 12, 12);
        // Official Navy Polo Torso
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-6.5, -16, 13, 11, 3);
        ctx.fill();

        // Line Judge Arms: Signal WIDE for OUT, or POINT DOWN for IN
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (isOutCall) {
          // Both arms extended horizontally ("OUT!")
          ctx.moveTo(-6, -13);
          ctx.lineTo(-16, -13);
          ctx.moveTo(6, -13);
          ctx.lineTo(16, -13);
        } else if (isInCall) {
          // Both arms pointing down toward the court line ("IN!")
          ctx.moveTo(-6, -13);
          ctx.lineTo(-3, -4);
          ctx.moveTo(6, -13);
          ctx.lineTo(3, -4);
        } else {
          // Hands resting on knees watching the line intently
          ctx.moveTo(-6, -13);
          ctx.lineTo(-4, -6);
          ctx.moveTo(6, -13);
          ctx.lineTo(4, -6);
        }
        ctx.stroke();

        // Line Judge Head
        ctx.fillStyle = idx % 2 === 0 ? '#fcd34d' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -21, 4.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -22.2, 4.4, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2 Courtside Sports Photographers with Telephoto Lenses & DSLR Flashes
      const photographers = [
        { x: COURT.DOUBLES_X_MIN - 15, y: 780, side: 'left' as const },
        { x: COURT.DOUBLES_X_MAX + 15, y: 780, side: 'right' as const },
      ];
      photographers.forEach((ph, idx) => {
        const px = toScreenX(ph.x, ph.y);
        const py = toFloorY(ph.y);
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(0.68, 0.68);
        // Photographer Media Vest (Neon Yellow/Orange Press Vest)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(-6, -13, 12, 10, 3);
        ctx.fill();
        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, -17, 4, 0, Math.PI * 2);
        ctx.fill();
        // White Pro Telephoto Camera Lens pointed toward court center
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(ph.side === 'left' ? 9 : -9, -7);
        ctx.stroke();

        // DSLR Strobe Flash on Smash or Point
        if ((isCheering || shuttle.isSmash) && Math.sin(now * 0.04 + idx * 2.5) > 0.85) {
          const lensX = ph.side === 'left' ? 9 : -9;
          const flashG = ctx.createRadialGradient(lensX, -7, 1, lensX, -7, 28);
          flashG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          flashG.addColorStop(0.4, 'rgba(186, 230, 253, 0.6)');
          flashG.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = flashG;
          ctx.beginPath();
          ctx.arc(lensX, -7, 28, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 8. Shuttle Landing Target Reticle & Ground Shadow
      if (shuttle.state === 'in_play' || shuttle.state === 'service') {
        const sFloorX = toScreenX(shuttle.x, shuttle.y);
        const sFloorY = toFloorY(shuttle.y);
        const shadowScale = Math.max(4, 14 - shuttle.z * 0.05);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(sFloorX, sFloorY, shadowScale * 1.3, shadowScale * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        if (shuttle.z > 20) {
          ctx.strokeStyle = shuttle.isSmash ? 'rgba(244, 63, 94, 0.65)' : 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(sFloorX, sFloorY, shadowScale * 1.8, shadowScale * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 9. Strict Depth Order:
      // Layer A: Far Court Players (team === 'blue') ALWAYS drawn behind the net
      // Layer B: The 3D Net at Y = 400
      // Layer C: Near Court Players (team === 'red') ALWAYS drawn in front of the net
      const farPlayers = Object.values(players)
        .filter((p): p is PlayerState => !!p && p.team === 'blue')
        .sort((a, b) => b.y - a.y);

      const nearPlayers = Object.values(players)
        .filter((p): p is PlayerState => !!p && p.team === 'red')
        .sort((a, b) => b.y - a.y);

      const drawPlayer = (p: PlayerState) => {
        const isNear = p.team === 'red';
        // Clamp target Y strictly to half-court so opponent NEVER crosses the net
        const targetSafeY = isNear
          ? Math.max(COURT.NEAR_MIN_Y, Math.min(COURT.NEAR_MAX_Y, p.y))
          : Math.max(COURT.FAR_MIN_Y, Math.min(COURT.FAR_MAX_Y, p.y));

        // Sub-frame visual pose interpolation for butter-smooth 60/120Hz character motion
        const prevPose = visualPoseRef.current[p.slot] || {
          x: p.x,
          y: targetSafeY,
          z: p.z,
          lean: p.torsoLean || 0,
          strideSin: Math.sin(p.stridePhase || 0),
          strideCos: Math.cos(p.stridePhase || 0),
        };

        const posLerp = p.isAi ? 0.65 : 0.92;
        const visX = prevPose.x + (p.x - prevPose.x) * posLerp;
        const visY = prevPose.y + (targetSafeY - prevPose.y) * posLerp;
        const visZ = prevPose.z + (p.z - prevPose.z) * 0.58;
        const visLean = prevPose.lean + ((p.torsoLean || 0) - prevPose.lean) * 0.35;
        const targetSin = Math.sin(p.stridePhase || 0);
        const targetCos = Math.cos(p.stridePhase || 0);
        const visStrideSin = prevPose.strideSin + (targetSin - prevPose.strideSin) * 0.38;
        const visStrideCos = prevPose.strideCos + (targetCos - prevPose.strideCos) * 0.38;

        visualPoseRef.current[p.slot] = {
          x: visX,
          y: visY,
          z: visZ,
          lean: visLean,
          strideSin: visStrideSin,
          strideCos: visStrideCos,
        };

        const px = toScreenX(visX, visY);
        const py = toScreenY(visY, visZ);
        const floorY = toFloorY(visY);
        const scale = getScale(visY);

        // Ground Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        const shRadius = Math.max(8, 17 * scale - visZ * 0.06);
        ctx.ellipse(px, floorY + 12 * scale, shRadius, shRadius * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        if (p.activeSkill) {
          const auraColor =
            p.activeSkill === 'thunder_smash'
              ? '#f59e0b'
              : p.activeSkill === 'deceptive_slice'
              ? '#06b6d4'
              : p.activeSkill === 'iron_defense'
              ? '#10b981'
              : '#f43f5e';
          ctx.strokeStyle = auraColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = auraColor;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.ellipse(px, floorY + 12 * scale, shRadius * 1.45, shRadius * 0.65, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // Athlete Body Transform
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(scale, scale);
        ctx.rotate(visLean);

        const moveSpeed = Math.hypot(p.vx, p.vy);
        const moveBlend = Math.min(1, moveSpeed / 2.2);
        // Smooth athletic split-step rhythm when idle + dynamic stride bounce when running
        const idleSplitStep = Math.sin(now * 0.0065 + (isNear ? 0 : 1.8)) * -1.1 * (1 - moveBlend);
        const stride = visStrideSin * 6.8 * moveBlend;
        const runBounceY = (1 - Math.abs(visStrideCos)) * -2.8 * moveBlend;
        ctx.translate(0, runBounceY + idleSplitStep);

        // Smooth cubic-eased swing curve: fast whip through impact, smooth follow-through
        const rawSwing = p.state === 'swinging' ? p.swingProgress : 0;
        const easedSwing =
          rawSwing > 0 ? Math.sin(Math.pow(rawSwing, 0.82) * Math.PI) : 0;

        // Racket Swing Energy Arc Trail
        if (p.state === 'swinging' && p.swingProgress > 0) {
          ctx.save();
          const arcColor =
            p.swingType === 'smash'
              ? '#f97316'
              : p.swingType === 'drop'
              ? '#06b6d4'
              : p.swingType === 'clear'
              ? '#818cf8'
              : '#2dd4bf';
          ctx.strokeStyle = arcColor;
          ctx.lineWidth = 4;
          ctx.shadowColor = arcColor;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          const startAng = -Math.PI * 0.85;
          const endAng = startAng + p.swingProgress * Math.PI * 1.35;
          ctx.arc(10, -8, 34, startAng, endAng);
          ctx.stroke();
          ctx.restore();
        }

        // 2-Segment Articulated Legs (Hip -> Knee -> Ankle -> Sock -> Pro Court Shoe)
        const drawArticulatedLeg = (sideSign: -1 | 1, legStride: number) => {
          const hipX = sideSign * 4.2;
          const hipY = 5.5;
          const jumpTuck = visZ > 2 ? -3.2 : 0;
          const stepLift = Math.max(0, sideSign * visStrideCos) * -2.6 * moveBlend;

          const footX = hipX + sideSign * (1.2 + (1 - moveBlend) * 0.6) + legStride * 0.48;
          const footY = 15.2 + jumpTuck + stepLift + legStride * 0.42;

          // Knee bends naturally forward/outward during stride, split-step, or jump
          const kneeBendX = (hipX + footX) * 0.5 + sideSign * 1.1 + legStride * 0.18;
          const kneeBendY = (hipY + footY) * 0.5 - 1.2 + jumpTuck * 0.5;

          // Thigh & Calf
          ctx.strokeStyle = '#fcd34d';
          ctx.lineWidth = 3.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(hipX, hipY);
          ctx.lineTo(kneeBendX, kneeBendY);
          ctx.lineTo(footX, footY);
          ctx.stroke();

          // White Crew Athletic Sock at Ankle
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(
            kneeBendX + (footX - kneeBendX) * 0.68,
            kneeBendY + (footY - kneeBendY) * 0.68
          );
          ctx.lineTo(footX, footY);
          ctx.stroke();

          // Pro Badminton Court Shoe with Gum-Rubber Outsole & Tilt
          ctx.save();
          ctx.translate(footX, footY + 0.8);
          ctx.rotate(legStride * 0.035);
          // Gum-rubber non-marking sole
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.roundRect(-3.8, 1.2, 7.6, 2.2, 1);
          ctx.fill();
          // White upper with team accent stripe
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(-3.6, -1.2, 7.2, 3, 1.5);
          ctx.fill();
          ctx.fillStyle = isNear ? '#2563eb' : '#dc2626';
          ctx.fillRect(-1.8, -0.6, 3.6, 1.2);
          ctx.restore();
        };

        drawArticulatedLeg(-1, stride);
        drawArticulatedLeg(1, -stride);

        // Shorts with Side Trim
        ctx.fillStyle = isNear ? '#1e293b' : '#450a0a';
        ctx.beginPath();
        ctx.roundRect(-8.5, 1.8, 17, 7.2, 2.2);
        ctx.fill();

        // Jersey Torso (with subtle upper-body counter-rotation during swings)
        ctx.save();
        ctx.translate(easedSwing * 1.2, 0);
        ctx.fillStyle = isNear ? '#2563eb' : '#dc2626';
        ctx.beginPath();
        ctx.roundRect(-9, -12, 18, 16, 4);
        ctx.fill();

        // Jersey Number
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isNear ? '1' : '2', 0, -1);
        ctx.restore();

        // Head
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -20, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Visor / Headband
        ctx.fillStyle = isNear ? '#f8fafc' : '#fde047';
        ctx.beginPath();
        ctx.roundRect(-7.5, -24, 15, 3.5, 1.5);
        ctx.fill();

        // Non-Racket Left Balance Arm (gives natural athletic posture)
        ctx.save();
        ctx.translate(-9, -9);
        const idleArmSway = Math.sin(now * 0.0065 + 1.2) * 0.06 * (1 - moveBlend);
        const leftArmPose =
          p.state === 'swinging'
            ? 0.55 - easedSwing * 0.85
            : 0.35 + visStrideSin * 0.25 * moveBlend + idleArmSway;
        ctx.rotate(leftArmPose);
        // Jersey Sleeve
        ctx.strokeStyle = isNear ? '#1d4ed8' : '#b91c1c';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, 4);
        ctx.stroke();
        // Forearm & Hand
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-5, 4);
        ctx.lineTo(-10, 9);
        ctx.stroke();
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(-10.5, 9.5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Articulated Right Racket Arm & Realistic Isometric Pro Badminton Racket
        ctx.save();
        // Ready stance holds racket up in front with gentle athletic sway; swinging whips smoothly
        const racketReadySway = Math.cos(now * 0.0065) * 0.05 * (1 - moveBlend);
        const baseArmAngle =
          (isNear ? -0.28 : -0.35) - visStrideSin * 0.18 * moveBlend + racketReadySway;
        const swingDelta = easedSwing * 1.58;
        ctx.translate(8, -9);
        ctx.rotate(baseArmAngle - swingDelta);

        // 1. Right Shoulder Sleeve
        ctx.strokeStyle = isNear ? '#1d4ed8' : '#b91c1c';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(5, -3);
        ctx.stroke();

        // 2. Upper Arm & Bent Elbow to Forearm
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(5, -3);
        ctx.lineTo(10, -6); // elbow
        ctx.lineTo(15, -10); // wrist
        ctx.stroke();

        // White Athletic Wristband (Sweatband)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(12.5, -8);
        ctx.lineTo(14.2, -9.3);
        ctx.stroke();

        // 3. Pro Badminton Racket Assembly (originating at hand grip (15, -10))
        ctx.save();
        ctx.translate(15, -10);
        // Slight wrist cock angle for realistic badminton grip
        const wristCock = p.state === 'swinging' ? -0.52 + p.swingProgress * 0.35 : -0.48;
        ctx.rotate(wristCock);

        // A. Octagonal Butt Cap & Wrapped Overgrip Handle (y from +3 down to -8)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-1.8, 1.5, 3.6, 2.2); // butt cap
        ctx.fillStyle = '#10b981'; // Yonex-style green butt cap accent
        ctx.fillRect(-1.4, 2.8, 2.8, 0.9);

        // Grip body (white/yellow pro overgrip with diagonal spiral wrap lines)
        ctx.fillStyle = isNear ? '#f8fafc' : '#fde047';
        ctx.beginPath();
        ctx.roundRect(-1.5, -8.5, 3, 10, 1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let gy = -7; gy <= 0; gy += 2.2) {
          ctx.moveTo(-1.5, gy);
          ctx.lineTo(1.5, gy + 1.2);
        }
        ctx.stroke();

        // Athlete's Grip Hand & Fingers wrapped around handle
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(0, -2, 2.3, 0, Math.PI * 2);
        ctx.fill();

        // B. Tapered Ferrule Cone (y from -8.5 to -12.5)
        ctx.fillStyle = isNear ? '#2563eb' : '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-1.5, -8.5);
        ctx.lineTo(1.5, -8.5);
        ctx.lineTo(0.8, -12.5);
        ctx.lineTo(-0.8, -12.5);
        ctx.closePath();
        ctx.fill();

        // C. Ultra-Slim High-Modulus Graphite Shaft (y from -12.5 to -25.5)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -12.5);
        ctx.lineTo(0, -25.5);
        ctx.stroke();

        // Central carbon-graphite shaft highlight
        ctx.strokeStyle = isNear ? '#38bdf8' : '#fb923c';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(0, -22);
        ctx.stroke();

        // D. Built-in T-Joint & Triangular Throat Yoke (y from -25.5 to -28.5)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-3.2, -28.5);
        ctx.moveTo(0, -25);
        ctx.lineTo(3.2, -28.5);
        ctx.stroke();

        ctx.fillStyle = isNear ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -25.5, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // E. Isometric Oval Racket Head & Cross-Hatched String Bed (centered at (0, -39.5))
        const headCenterY = -39.5;
        const headRx = 8.2;
        const headRy = 11.4;

        // Clip inside head frame to draw crisp vertical main strings & horizontal cross strings
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, headCenterY, headRx - 0.8, headRy - 0.8, 0, 0, Math.PI * 2);
        ctx.clip();

        // Subtle translucent tension sheen on string bed
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(-headRx, headCenterY - headRy, headRx * 2, headRy * 2);

        // Vertical Main Strings & Horizontal Cross Strings
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        for (let sx = -6.5; sx <= 6.5; sx += 2.1) {
          ctx.moveTo(sx, headCenterY - headRy);
          ctx.lineTo(sx, headCenterY + headRy);
        }
        for (let sy = headCenterY - 9.5; sy <= headCenterY + 9.5; sy += 2.1) {
          ctx.moveTo(-headRx, sy);
          ctx.lineTo(headRx, sy);
        }
        ctx.stroke();

        // Pro Tournament Stencil Mark in the Center Sweet Spot
        ctx.strokeStyle = isNear ? 'rgba(56, 189, 248, 0.75)' : 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-2.8, headCenterY + 2);
        ctx.lineTo(0, headCenterY - 3);
        ctx.lineTo(2.8, headCenterY + 2);
        ctx.stroke();
        ctx.restore();

        // Outer Graphite Isometric Frame Rim
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, headCenterY, headRx, headRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Pro Astrox-style Asymmetric Frame Color Accents (Top Crown & 10/2 O'Clock)
        ctx.strokeStyle = isNear ? '#38bdf8' : '#f97316';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, headCenterY, headRx, headRy, 0, -Math.PI * 0.82, -Math.PI * 0.18);
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, headCenterY, headRx, headRy, 0, -Math.PI * 0.15, Math.PI * 0.22);
        ctx.ellipse(0, headCenterY, headRx, headRy, 0, Math.PI * 0.78, Math.PI * 1.15);
        ctx.stroke();

        ctx.restore(); // End Racket Assembly
        ctx.restore(); // End Right Arm

        // Floating Player Name Pill Label above Head
        ctx.font = '700 11px Plus Jakarta Sans, sans-serif';
        const labelText = isNear && p.slot === 'red_1' ? 'Player 1 (You)' : p.name;
        const textW = ctx.measureText(labelText).width;
        ctx.fillStyle = isNear ? 'rgba(6, 95, 70, 0.85)' : 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(-textW / 2 - 7, -45, textW + 14, 17, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, 0, -33);

        ctx.restore();
      };

      const drawNet = () => {
        const netLeftX = toScreenX(COURT.DOUBLES_X_MIN - 8, COURT.NET_Y);
        const netRightX = toScreenX(COURT.DOUBLES_X_MAX + 8, COURT.NET_Y);
        const netBottomY = toFloorY(COURT.NET_Y);
        const netTopY = toScreenY(COURT.NET_Y, COURT.NET_HEIGHT);
        const netMeshBottomY = netTopY + (netBottomY - netTopY) * 0.68;

        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(netLeftX, netBottomY);
        ctx.lineTo(netLeftX, netTopY);
        ctx.moveTo(netRightX, netBottomY);
        ctx.lineTo(netRightX, netTopY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(netLeftX, netTopY, netRightX - netLeftX, netMeshBottomY - netTopY);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 0.8;
        const cols = 28;
        for (let c = 0; c <= cols; c++) {
          const cx = netLeftX + ((netRightX - netLeftX) / cols) * c;
          ctx.beginPath();
          ctx.moveTo(cx, netTopY);
          ctx.lineTo(cx, netMeshBottomY);
          ctx.stroke();
        }
        const rows = 5;
        for (let r = 1; r <= rows; r++) {
          const ry = netTopY + ((netMeshBottomY - netTopY) / rows) * r;
          ctx.beginPath();
          ctx.moveTo(netLeftX, ry);
          ctx.lineTo(netRightX, ry);
          ctx.stroke();
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(netLeftX - 2, netTopY);
        ctx.lineTo(netRightX + 2, netTopY);
        ctx.stroke();
        ctx.restore();
      };

      // Render Layer A (Far Opponent) -> Layer B (Net) -> Layer C (Near Player)
      farPlayers.forEach(drawPlayer);
      drawNet();
      nearPlayers.forEach(drawPlayer);

      // 10. Draw Realistic Feathered BWF Shuttlecock & Motion Trail
      const sx = toScreenX(shuttle.x, shuttle.y);
      const sy = toScreenY(shuttle.y, shuttle.z);
      const sScale = getScale(shuttle.y);

      if (shuttle.trail && shuttle.trail.length > 0 && shuttle.state === 'in_play') {
        ctx.save();
        shuttle.trail.forEach((tr, idx) => {
          const tx = toScreenX(tr.x, tr.y);
          const ty = toScreenY(tr.y, tr.z);
          ctx.fillStyle = tr.color || '#38bdf8';
          ctx.globalAlpha = tr.alpha * 0.65;
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(1.5, (5.5 - idx * 0.35) * sScale), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(sScale, sScale);
      ctx.rotate(shuttle.rotation);

      if (shuttle.isSmash) {
        ctx.shadowColor = shuttle.isThunderSmash ? '#f59e0b' : '#f43f5e';
        ctx.shadowBlur = 16;
      }

      // Feathered Skirt (16-feather conical skirt with individual shafts & woven thread bands)
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.beginPath();
      ctx.moveTo(-11.5, -6.2);
      ctx.lineTo(2, -2.2);
      ctx.lineTo(2, 2.2);
      ctx.lineTo(-11.5, 6.2);
      ctx.closePath();
      ctx.fill();

      // Individual feather quill lines & binding rings
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let fy = -5; fy <= 5; fy += 2.5) {
        ctx.moveTo(-11.5, fy);
        ctx.lineTo(2, fy * 0.35);
      }
      // Woven thread binding rings across the feather skirt
      ctx.moveTo(-5.5, -4.4);
      ctx.lineTo(-5.5, 4.4);
      ctx.moveTo(-8.5, -5.3);
      ctx.lineTo(-8.5, 5.3);
      ctx.stroke();

      // Rounded White Cork Base with Tournament Color Band
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3.2, 0, 3.2, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.closePath();
      ctx.fill();

      // Tournament speed trim band between cork and feathers
      ctx.fillStyle = shuttle.isSmash ? '#f43f5e' : '#10b981';
      ctx.fillRect(1.2, -2.8, 1.4, 5.6);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [spectators]);

  // Convert pointer / fingertip position on canvas to Near-Court (x, y) coordinates
  const mapClientToCourt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !onPointerTrack) return;
    const rect = canvas.getBoundingClientRect();

    // Ignore pointer tracking only inside the far-left and far-right side margin docks
    if (clientX < rect.left + 190 || clientX > rect.right - 190) return;

    const clickX = ((clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((clientY - rect.top) / rect.height) * canvas.height;

    const courtBottomY = canvas.height * 0.89;
    const courtTopY = canvas.height * 0.21;
    const courtSpanY = courtBottomY - courtTopY;

    const rawNormY = Math.max(0, Math.min(1, (courtBottomY - clickY) / courtSpanY));
    // Map fingertip vertical sweep smoothly across Near Court [NEAR_MIN_Y, NEAR_MAX_Y]
    const gameY = Math.max(
      COURT.NEAR_MIN_Y,
      Math.min(COURT.NEAR_MAX_Y, rawNormY * COURT.LENGTH)
    );

    const scale = 1.0 - (gameY / COURT.LENGTH) * 0.44;
    const halfSpan = canvas.width * 0.215 * scale;
    const normX = (clickX - canvas.width * 0.5) / halfSpan;
    const gameX = Math.max(
      COURT.DOUBLES_X_MIN - 10,
      Math.min(COURT.DOUBLES_X_MAX + 10, COURT.CENTER_X + normX * (COURT.WIDTH / 2))
    );

    onPointerTrack(gameX, gameY);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onPointerMove={(e) => mapClientToCourt(e.clientX, e.clientY)}
        onPointerDown={(e) => mapClientToCourt(e.clientX, e.clientY)}
        onTouchMove={(e) => {
          if (e.touches[0]) {
            mapClientToCourt(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        className="w-full h-full object-cover cursor-crosshair touch-none"
      />

      {/* Top Translucent Green-Bordered Serve / Rally Callout Banner */}
      {(canServe || announcement) && (
        <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[62%] max-w-[560px] pointer-events-none z-20">
          <div className="w-full bg-[#09222c]/85 border border-emerald-400/70 rounded-xl py-2 px-5 text-center shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-sm">
            <div className="text-sm sm:text-base font-black font-['Outfit'] tracking-wide text-emerald-400 uppercase flex items-center justify-center gap-2">
              <span>🏸</span>
              <span>
                {canServe
                  ? servingTeam === 'red'
                    ? 'YOUR SERVE!'
                    : 'OPPONENT SERVING...'
                  : announcement}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-white mt-0.5">
              {canServe
                ? servingTeam === 'red'
                  ? 'Click SERVE or press SPACE to serve · Glide fingertip on court to move'
                  : 'Get ready to return the serve!'
                : announcementSub || 'Glide your fingertip on the touchpad to move across court'}
            </div>
          </div>
        </div>
      )}

      {/* On-Court Glowing Teal Pill Button Below Baseline During Serve */}
      {canServe && servingTeam === 'red' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20">
          <button
            onClick={onServe}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 border-2 border-emerald-200 text-slate-950 font-['Outfit'] font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>🏸</span>
            <span>CLICK TO SERVE (OR PRESS SPACE)</span>
          </button>
        </div>
      )}
    </div>
  );
};
