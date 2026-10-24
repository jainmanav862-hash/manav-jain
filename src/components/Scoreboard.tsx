/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameMode, PlayerSlot, PlayerState, TeamColor } from '../types/game';
import { Volume2, VolumeX, Flame, Pause, Play } from 'lucide-react';

interface ScoreboardProps {
  mode: GameMode;
  scoreNear: number;
  scoreFar: number;
  targetPoints: number;
  timedMatch: boolean;
  allowDraws: boolean;
  timeRemainingSeconds: number;
  servingTeam: TeamColor;
  rallyCount: number;
  topSmashSpeed: number;
  players: Record<PlayerSlot, PlayerState | null>;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenSetup: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  mode,
  scoreNear,
  scoreFar,
  targetPoints,
  timedMatch,
  allowDraws,
  timeRemainingSeconds,
  servingTeam,
  rallyCount,
  topSmashSpeed,
  players,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onOpenSetup,
}) => {
  const nearP1 = players.red_1;
  const nearP2 = players.red_2;
  const farP1 = players.blue_1;
  const farP2 = players.blue_2;

  const nearLabel =
    mode === '2v2' && nearP2
      ? `${nearP1?.name || 'Player 1'} & ${nearP2.name}`
      : `${nearP1?.countryCode || 'USA'}  ${nearP1?.name || 'Player 1 (You)'}`;

  const farLabel =
    mode === '2v2' && farP2
      ? `${farP1?.name || 'Axelsen (AI)'} & ${farP2.name}`
      : `${farP1?.name || 'Axelsen (AI)'}  ${farP1?.countryCode || 'DEN'}`;

  const isMatchPoint =
    scoreNear >= targetPoints - 1 || scoreFar >= targetPoints - 1;
  const isDeuce =
    scoreNear >= targetPoints - 1 && scoreFar >= targetPoints - 1 && scoreNear === scoreFar;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="w-full bg-[#070b14]/95 border-b border-slate-800/80 px-4 py-2 z-30 shrink-0">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left Zone: Match Setup Button + Unboxed Metadata */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSetup}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Match Setup
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span className="font-bold text-white">
              {mode === '1v1' ? '1v1 Singles' : '2v2 Doubles'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Target {targetPoints} Pts</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-medium">
              {timedMatch ? `Clock ${formatTime(timeRemainingSeconds)}` : allowDraws ? 'Draw Allowed' : 'Win by 2'}
            </span>
          </div>
        </div>

        {/* Center Zone: Broadcast Scoreboard Box */}
        <div className="flex items-center gap-4 sm:gap-6 bg-[#0c1322] border border-slate-800/90 rounded-xl px-4 sm:px-6 py-1.5 shadow-lg">
          {/* Player 1 (You / Near Court) */}
          <div className="flex items-center gap-3">
            <span className="text-sm" title="Serving Indicator">
              {servingTeam === 'red' ? '🏸' : ''}
            </span>
            <div className="text-right">
              <div className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">
                {nearLabel}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Team Blue</div>
            </div>
            <div className="min-w-[36px] h-9 px-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center font-mono text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {scoreNear}
            </div>
          </div>

          {/* Center VS / Match Point Status */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              VS
            </span>
            {isDeuce ? (
              <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase whitespace-nowrap">
                DEUCE
              </span>
            ) : isMatchPoint ? (
              <span className="text-[10px] font-black text-rose-500 tracking-wider uppercase whitespace-nowrap animate-pulse">
                MATCH POINT
              </span>
            ) : (
              <span className="text-[9px] font-mono text-slate-500 uppercase whitespace-nowrap">
                SET 1
              </span>
            )}
          </div>

          {/* Opponent (AI / Far Court) */}
          <div className="flex items-center gap-3">
            <div className="min-w-[36px] h-9 px-2 rounded-lg bg-rose-950/50 border border-rose-500/30 flex items-center justify-center font-mono text-xl sm:text-2xl font-black text-rose-500 tabular-nums">
              {scoreFar}
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">
                {farLabel}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Team Red</div>
            </div>
            <span className="text-sm" title="Serving Indicator">
              {servingTeam === 'blue' ? '🏸' : ''}
            </span>
          </div>
        </div>

        {/* Right Zone: Rally Counter, Top Smash Speed, Audio & Pause Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Rally:</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">{rallyCount}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Top Smash:</span>
            <span className="font-mono font-bold text-rose-400 tabular-nums">
              {topSmashSpeed} km/h
            </span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onTogglePause}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isPaused ? 'Resume Match' : 'Pause Match'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
