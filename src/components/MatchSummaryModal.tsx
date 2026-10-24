/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameMode, PlayerSlot, PlayerState, TeamColor } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Zap, Feather, ShieldAlert, Award, Share2 } from 'lucide-react';

interface MatchSummaryModalProps {
  winner: TeamColor | 'draw' | null;
  isDraw: boolean;
  mode: GameMode;
  scoreRed: number;
  scoreBlue: number;
  players: Record<PlayerSlot, PlayerState | null>;
  rallyCount: number;
  onRematch: () => void;
  onReturnToLobby: () => void;
}

export const MatchSummaryModal: React.FC<MatchSummaryModalProps> = ({
  winner,
  isDraw,
  mode,
  scoreRed,
  scoreBlue,
  players,
  rallyCount,
  onRematch,
  onReturnToLobby,
}) => {
  useEffect(() => {
    if (winner && winner !== 'draw') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: winner === 'red' ? ['#ef4444', '#f87171', '#fbbf24'] : ['#3b82f6', '#60a5fa', '#fbbf24'],
      });
    }
  }, [winner]);

  // Aggregate team stats
  const redStats = {
    smashes: 0,
    drops: 0,
    clears: 0,
    topSpeed: 0,
  };
  const blueStats = {
    smashes: 0,
    drops: 0,
    clears: 0,
    topSpeed: 0,
  };

  Object.values(players).forEach((p) => {
    if (!p) return;
    const target = p.team === 'red' ? redStats : blueStats;
    target.smashes += p.stats?.smashes || 0;
    target.drops += p.stats?.drops || 0;
    target.clears += p.stats?.clears || 0;
    target.topSpeed = Math.max(target.topSpeed, p.stats?.highestSmashSpeed || 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div
          className={`py-8 px-6 text-center text-white relative overflow-hidden ${
            isDraw
              ? 'bg-gradient-to-b from-amber-700/80 to-slate-900'
              : winner === 'red'
              ? 'bg-gradient-to-b from-rose-700/90 to-slate-900'
              : 'bg-gradient-to-b from-sky-700/90 to-slate-900'
          }`}
        >
          <div className="flex justify-center mb-3">
            {isDraw ? (
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                <Award className="w-9 h-9 text-amber-300" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center animate-bounce">
                <Trophy className="w-9 h-9 text-amber-300" />
              </div>
            )}
          </div>

          <h2 className="text-3xl md:text-4xl font-black font-['Outfit'] tracking-wider uppercase">
            {isDraw ? 'MATCH DRAW' : winner === 'red' ? 'TEAM RED WINS!' : 'TEAM BLUE WINS!'}
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            {isDraw
              ? 'Spectacular balanced duel — both teams share the honours!'
              : `Champions of ${mode === '1v1' ? 'Singles 1vs1' : 'Doubles 2vs2'} Arena!`}
          </p>

          {/* Final Score Pill */}
          <div className="mt-4 inline-flex items-center gap-6 bg-slate-950/80 px-6 py-2 rounded-xl border border-white/10 shadow-lg">
            <div className="text-right">
              <span className="block text-[10px] text-rose-400 font-bold">TEAM RED</span>
              <span className="text-3xl font-mono font-black text-rose-400 tabular-nums">
                {scoreRed}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-500">VS</span>
            <div className="text-left">
              <span className="block text-[10px] text-sky-400 font-bold">TEAM BLUE</span>
              <span className="text-3xl font-mono font-black text-sky-400 tabular-nums">
                {scoreBlue}
              </span>
            </div>
          </div>
        </div>

        {/* Match Statistics Table */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">
            MATCH TELEMETRY BREAKDOWN
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <span className="text-rose-400 font-bold">TEAM RED</span>
            <span className="text-slate-400 font-semibold">METRIC</span>
            <span className="text-sky-400 font-bold">TEAM BLUE</span>

            {/* Smashes */}
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {redStats.smashes}
            </div>
            <div className="p-2 text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Smashes
            </div>
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {blueStats.smashes}
            </div>

            {/* Drop Shots */}
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {redStats.drops}
            </div>
            <div className="p-2 text-slate-400 flex items-center justify-center gap-1">
              <Feather className="w-3.5 h-3.5 text-emerald-400" /> Drops
            </div>
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {blueStats.drops}
            </div>

            {/* Clear Lobs */}
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {redStats.clears}
            </div>
            <div className="p-2 text-slate-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" /> Clears
            </div>
            <div className="p-2 bg-slate-800/40 rounded text-slate-200 tabular-nums font-bold">
              {blueStats.clears}
            </div>

            {/* Top Smash Speed */}
            <div className="p-2 bg-slate-800/40 rounded text-amber-300 tabular-nums font-bold">
              {redStats.topSpeed > 0 ? `${redStats.topSpeed} km/h` : '—'}
            </div>
            <div className="p-2 text-slate-400">Peak Smash</div>
            <div className="p-2 bg-slate-800/40 rounded text-amber-300 tabular-nums font-bold">
              {blueStats.topSpeed > 0 ? `${blueStats.topSpeed} km/h` : '—'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onRematch}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black font-['Outfit'] text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              PLAY AGAIN / REMATCH
            </button>
            <button
              onClick={onReturnToLobby}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors whitespace-nowrap"
            >
              Lobby & Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
