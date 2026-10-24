/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode, MatchRules } from '../types/game';
import { Users, User, Clock, Flame, Globe, Monitor, Zap, Play } from 'lucide-react';

interface LobbyModalProps {
  currentRules: MatchRules;
  onStartMatch: (config: {
    mode: GameMode;
    rules: MatchRules;
    playMode: 'solo_ai' | 'local_multiplayer' | 'online_room';
    roomCode?: string;
    playerName: string;
    aiDifficulty: 'novice' | 'pro' | 'legend';
  }) => void;
  onlineConnected: boolean;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  currentRules,
  onStartMatch,
  onlineConnected,
}) => {
  const [mode, setMode] = useState<GameMode>(currentRules.mode || '1v1');
  const [playMode, setPlayMode] = useState<'solo_ai' | 'local_multiplayer' | 'online_room'>('solo_ai');
  const [targetPoints, setTargetPoints] = useState<number>(currentRules.targetPoints || 11);
  const [timedMatch, setTimedMatch] = useState<boolean>(currentRules.timedMatch || false);
  const [duration, setDuration] = useState<number>(currentRules.durationSeconds || 180);
  const [playerName, setPlayerName] = useState<string>('SmashAce');
  const [aiDifficulty, setAiDifficulty] = useState<'novice' | 'pro' | 'legend'>('pro');
  const [roomCode, setRoomCode] = useState<string>('');

  const handleLaunch = () => {
    onStartMatch({
      mode,
      rules: {
        mode,
        targetPoints,
        winByTwo: true,
        suddenDeathCap: 30,
        timedMatch,
        durationSeconds: duration,
        allowDraws: timedMatch,
      },
      playMode,
      roomCode: playMode === 'online_room' ? roomCode.trim().toUpperCase() : undefined,
      playerName: playerName.trim() || 'Player 1',
      aiDifficulty,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg">
              <span className="text-xl">🏸</span>
            </div>
            <div>
              <h2 className="text-xl font-black font-['Outfit'] text-white tracking-wide">
                SMASHZONE ARENA LOBBY
              </h2>
              <span className="text-xs text-slate-400">
                1vs1 & 2vs2 Tournament Experience
              </span>
            </div>
          </div>
          {onlineConnected ? (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online Server Ready
            </span>
          ) : (
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Local Engine
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selection: 1vs1 vs 2vs2 */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
              Select Match Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('1v1')}
                className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  mode === '1v1'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-lg'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-lg ${mode === '1v1' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-['Outfit'] font-bold text-sm text-white">1 VS 1 SINGLES</div>
                  <div className="text-[11px] text-slate-400">Head-to-head agility & court coverage</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('2v2')}
                className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  mode === '2v2'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-lg'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-lg ${mode === '2v2' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-['Outfit'] font-bold text-sm text-white">2 VS 2 DOUBLES</div>
                  <div className="text-[11px] text-slate-400">Front net attack & back smash rover</div>
                </div>
              </button>
            </div>
          </div>

          {/* Play Style: Solo vs Local vs Online Room */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
              Multiplayer & Opponent Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlayMode('solo_ai')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  playMode === 'solo_ai'
                    ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <div className="text-xs font-['Outfit']">Solo vs AI</div>
              </button>

              <button
                type="button"
                onClick={() => setPlayMode('local_multiplayer')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  playMode === 'local_multiplayer'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs font-['Outfit']">Local 2P / 4P</div>
              </button>

              <button
                type="button"
                onClick={() => setPlayMode('online_room')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  playMode === 'online_room'
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 font-bold'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                <div className="text-xs font-['Outfit']">Online Room</div>
              </button>
            </div>
          </div>

          {/* Online Room Code Input if selected */}
          {playMode === 'online_room' && (
            <div className="p-3 bg-sky-950/30 border border-sky-800/60 rounded-xl space-y-2">
              <label className="text-xs font-mono text-sky-300 block">
                Room Code (Leave blank to generate a new room):
              </label>
              <input
                type="text"
                placeholder="e.g. ARENA9"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full bg-slate-950 border border-sky-700/80 px-3 py-2 rounded-lg text-white font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          {/* AI Difficulty Selector if Solo */}
          {playMode === 'solo_ai' && (
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
                AI Bot Mastery Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['novice', 'pro', 'legend'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setAiDifficulty(tier)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                      aiDifficulty === tier
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier === 'legend' ? '👑 Legend' : tier === 'pro' ? '⚡ Pro' : '🌱 Novice'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Match Rules: Target Score or Timed Match (Win / Draw) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
                Point Target
              </label>
              <div className="flex gap-2">
                {[7, 11, 21].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setTargetPoints(pts)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                      targetPoints === pts
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pts} PTS
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
                Match Clock Mode
              </label>
              <button
                type="button"
                onClick={() => setTimedMatch(!timedMatch)}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                  timedMatch
                    ? 'border-amber-500 bg-amber-950/30 text-amber-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>3-Min Timed Match (Enables Draws)</span>
                </div>
                <span className="font-mono font-bold">{timedMatch ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Player Display Name */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
              Your Player Handle
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={14}
              className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-white font-medium text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Launch Match Button */}
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-['Outfit'] text-base tracking-widest uppercase rounded-xl shadow-xl transition-transform active:scale-98 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            ENTER CENTRE COURT & PLAY
          </button>
        </div>
      </div>
    </div>
  );
};
