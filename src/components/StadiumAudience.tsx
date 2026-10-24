/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { CrowdState } from '../types/game';

interface StadiumAudienceProps {
  crowd: CrowdState;
  shuttleX: number; // 0 to 400
  shuttleY: number; // 0 to 800
  scoreRed: number;
  scoreBlue: number;
}

interface CyberSpectator {
  id: number;
  xPercent: number;
  yPercent: number;
  suitColor: string;
  glowColor: string;
  visorColor: string;
  hasLightstick: boolean;
  lightstickColor: string;
  reactionOffset: number;
}

export const StadiumAudience: React.FC<StadiumAudienceProps> = ({
  crowd,
  shuttleX,
  scoreRed,
  scoreBlue,
}) => {
  // Generate cyber spectators in the upper arena gallery
  const spectators = useMemo(() => {
    const list: CyberSpectator[] = [];
    const count = 48;
    const suitColors = ['#0f172a', '#1e1b4b', '#172554', '#022c22', '#2e1065'];
    const glowColors = ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
    const visorColors = ['#22d3ee', '#f43f5e', '#34d399', '#fbbf24', '#a855f7'];

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 16);
      const col = i % 16;
      const xPercent = (col / 15) * 92 + 4;
      const yPercent = 20 + row * 28 + (Math.random() * 4 - 2);

      const suitColor = suitColors[Math.floor(Math.random() * suitColors.length)];
      const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)];
      const visorColor = visorColors[Math.floor(Math.random() * visorColors.length)];
      const hasLightstick = Math.random() < 0.6;

      list.push({
        id: i,
        xPercent,
        yPercent,
        suitColor,
        glowColor,
        visorColor,
        hasLightstick,
        lightstickColor: glowColor,
        reactionOffset: (col * 0.2 + row * 0.4) % (Math.PI * 2),
      });
    }
    return list;
  }, []);

  // Compute angle of crowd looking at shuttle
  const lookAngle = Math.max(-20, Math.min(20, ((shuttleX - 200) / 200) * 18));

  return (
    <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-slate-950 border-b border-cyan-950/60 shadow-lg">
      {/* Cyberpunk arena neon aura & gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950/20 pointer-events-none" />

      {/* Holographic Arena LED Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-black/90 border-b border-cyan-500/30 flex items-center justify-between px-4 text-[9px] font-mono tracking-widest text-cyan-400 overflow-hidden">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <span className="font-black text-rose-400 tracking-wider">⚡ NEO-ARENA 2099</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 uppercase font-semibold">PORTRAIT CENTER COURT</span>
          <span className="text-slate-600">|</span>
          <span className="text-rose-400">RED: {scoreRed}</span>
          <span className="text-cyan-400">BLUE: {scoreBlue}</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 font-bold">HYPE: {Math.round(crowd.hype)}%</span>
        </div>
      </div>

      {/* Camera Flashes / Drone Lights */}
      {crowd.flashTimer > 0 && (
        <div className="absolute inset-0 bg-cyan-400/25 pointer-events-none transition-opacity duration-75 mix-blend-screen" />
      )}

      {/* Floating Broadcast Drones */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-6 h-6 rounded-full border border-cyan-400/60 bg-slate-900/80 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all duration-700 ease-out"
          style={{
            left: `${30 + ((shuttleX / 400) * 40)}%`,
            top: '35%',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <div
          className="absolute w-5 h-5 rounded-full border border-rose-500/60 bg-slate-900/80 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-500 ease-out"
          style={{
            right: `${20 + (((400 - shuttleX) / 400) * 35)}%`,
            top: '40%',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        </div>
      </div>

      {/* Animated Spectators SVG */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 400 90" preserveAspectRatio="none">
        {spectators.map((s) => {
          const isCheering = crowd.reaction === 'cheer' || crowd.hype > 80;
          const isGasping = crowd.reaction === 'gasp';
          const cheerJump = isCheering ? Math.sin(Date.now() * 0.018 + s.reactionOffset) * 5 - 3 : 0;
          const totalY = (s.yPercent / 100) * 90 + cheerJump;
          const totalX = (s.xPercent / 100) * 400;

          return (
            <g key={s.id} transform={`translate(${totalX}, ${totalY})`}>
              {/* Suit Torso */}
              <ellipse cx="0" cy="8" rx="4.5" ry="6" fill={s.suitColor} stroke={s.glowColor} strokeWidth="0.8" />

              {/* Head with Cyber Visor */}
              <circle cx={lookAngle * 0.06} cy="0" r="3.4" fill="#0f172a" />
              {/* Visor Glow */}
              <rect
                x={-3 + lookAngle * 0.06}
                y="-1.5"
                width="6"
                height="2.5"
                rx="1"
                fill={s.visorColor}
                opacity={0.9}
              />

              {/* Neon Glowstick Wave */}
              {s.hasLightstick && (
                <path
                  d={isCheering ? "M 3 6 L 8 -5" : "M 3 7 L 6 0"}
                  stroke={s.lightstickColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className={isCheering ? "animate-pulse" : ""}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Announcement / Chant Banner */}
      {crowd.chantText && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-cyan-400/60 px-3 py-0.5 rounded-full text-[10px] font-mono font-black text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] tracking-wider uppercase pointer-events-none animate-pulse">
          ⚡ {crowd.chantText}
        </div>
      )}
    </div>
  );
};
