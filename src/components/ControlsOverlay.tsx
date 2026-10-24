/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ClearVariant,
  DriveVariant,
  DropVariant,
  ShotType,
  ShotVariantsConfig,
  SignatureSkillId,
  SignatureSkillState,
  SmashVariant,
} from '../types/game';
import { COURT } from '../utils/physics';
import { Zap, Wind, Shield, Flame, ArrowUpCircle, Target, Activity, Hand } from 'lucide-react';

interface ControlsOverlayProps {
  variants: ShotVariantsConfig;
  skills: Record<SignatureSkillId, SignatureSkillState>;
  activeSkill: SignatureSkillId | null;
  selectedShotType: ShotType;
  touchpadEnabled: boolean;
  playerPos: { x: number; y: number };
  onToggleTouchpad: () => void;
  onTouchpadMove: (x: number, y: number) => void;
  onUpdateVariants: (next: Partial<ShotVariantsConfig>) => void;
  onTriggerShot: (shot: ShotType, powerMultiplier?: number) => void;
  onActivateSkill: (skillId: SignatureSkillId) => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  variants,
  activeSkill,
  selectedShotType,
  touchpadEnabled,
  playerPos,
  onToggleTouchpad,
  onTouchpadMove,
  onUpdateVariants,
  onTriggerShot,
  onActivateSkill,
}) => {
  const [chargingShot, setChargingShot] = useState<ShotType | null>(null);
  const [chargeLevel, setChargeLevel] = useState<number>(100);
  const chargeTimerRef = useRef<number | null>(null);
  const padRef = useRef<HTMLDivElement | null>(null);

  const startCharge = (shot: ShotType) => {
    setChargingShot(shot);
    setChargeLevel(60);
    if (chargeTimerRef.current) window.clearInterval(chargeTimerRef.current);
    chargeTimerRef.current = window.setInterval(() => {
      setChargeLevel((prev) => Math.min(100, prev + 8));
    }, 45);
  };

  const releaseCharge = (shot: ShotType) => {
    if (chargeTimerRef.current) {
      window.clearInterval(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    const mult = chargingShot === shot ? chargeLevel / 100 : 1.0;
    setChargingShot(null);
    setChargeLevel(100);
    onTriggerShot(shot, mult);
  };

  const handlePadPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));

    const gameX = COURT.DOUBLES_X_MIN + normX * (COURT.DOUBLES_X_MAX - COURT.DOUBLES_X_MIN);
    const gameY = COURT.NEAR_MIN_Y + normY * (COURT.NEAR_MAX_Y - COURT.NEAR_MIN_Y);
    onTouchpadMove(gameX, gameY);
  };

  // Normalized dot position for the mini touchpad visual
  const dotXPercent = Math.max(
    6,
    Math.min(
      94,
      ((playerPos.x - COURT.DOUBLES_X_MIN) / (COURT.DOUBLES_X_MAX - COURT.DOUBLES_X_MIN)) * 100
    )
  );
  const dotYPercent = Math.max(
    8,
    Math.min(
      92,
      (1 - (playerPos.y - COURT.NEAR_MIN_Y) / (COURT.NEAR_MAX_Y - COURT.NEAR_MIN_Y)) * 100
    )
  );

  const clearPct = variants.clear === 'mid' ? '80%' : variants.clear === 'deep' ? '92%' : '100%';
  const dropPct = variants.drop === 'tight' ? '65%' : variants.drop === 'push' ? '80%' : '100%';
  const drivePct = variants.drive === 'soft' ? '72%' : variants.drive === 'fast' ? '85%' : '100%';
  const smashPct = `${variants.smash}%`;

  return (
    <>
      {/* LEFT VERTICAL MARGIN DOCK: Fingertip Touchpad + 4 Signature Pro Skills (Keys 5-8) */}
      <aside className="pointer-events-auto fixed left-2.5 top-14 bottom-2.5 z-30 w-[166px] sm:w-[184px] flex flex-col justify-between gap-2">
        {/* Top of Left Dock: Interactive 1:1 Fingertip Touchpad */}
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[#071120]/90 border border-slate-800/90 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400">
            <span className="flex items-center gap-1">
              <Hand className="w-3 h-3" />
              <span>1:1 TOUCHPAD</span>
            </span>
            <button
              onClick={onToggleTouchpad}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer border transition-colors ${
                touchpadEnabled
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {touchpadEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div
            ref={padRef}
            onPointerMove={(e) => handlePadPointer(e.clientX, e.clientY)}
            onPointerDown={(e) => handlePadPointer(e.clientX, e.clientY)}
            onTouchMove={(e) => {
              if (e.touches[0]) {
                handlePadPointer(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            className="relative w-full h-24 rounded-lg bg-[#051221] border border-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.18)] overflow-hidden cursor-crosshair touch-none"
            title="Glide your fingertip here or directly on the court while pressing 1-4 to hit shots"
          >
            {/* Mini court reference lines */}
            <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400/75" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-500/25" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-cyan-500/25" />

            {/* Live Fingertip Position Dot */}
            <div
              className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_10px_rgba(34,211,238,0.95)] pointer-events-none transition-transform duration-75"
              style={{ left: `${dotXPercent}%`, top: `${dotYPercent}%` }}
            />

            <div className="absolute bottom-1 inset-x-0 text-center text-[8px] font-mono font-bold text-cyan-300/80 pointer-events-none uppercase tracking-wider">
              MOVE HERE + PRESS 1–4
            </div>
          </div>
        </div>

        {/* Bottom of Left Dock: 4 Signature Pro Skills Stacked Vertically (Keys 5, 6, 7, 8) */}
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[#071120]/90 border border-slate-800/90 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between text-[10px] font-['Outfit'] font-bold text-slate-400 uppercase tracking-wider px-0.5">
            <span>PRO SKILLS</span>
            <span className="font-mono text-[9px] text-cyan-400">KEYS 5–8</span>
          </div>

          {/* 5. Thunder Smash */}
          <button
            onClick={() => onActivateSkill('thunder_smash')}
            className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-[#090f1d]/95 border transition-all cursor-pointer text-left ${
              activeSkill === 'thunder_smash'
                ? 'border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                : 'border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">
                <div className="font-['Outfit'] font-black text-[11px] text-amber-400 tracking-wide uppercase truncate">
                  THUNDER SMASH
                </div>
                <div className="text-[9px] text-slate-300 truncate">Lin Dan (420 km/h)</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono text-amber-300 font-black shrink-0">
              5
            </span>
          </button>

          {/* 6. Deceptive Slice */}
          <button
            onClick={() => onActivateSkill('deceptive_slice')}
            className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-[#090f1d]/95 border transition-all cursor-pointer text-left ${
              activeSkill === 'deceptive_slice'
                ? 'border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.45)]'
                : 'border-cyan-500/40 hover:border-cyan-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <div className="font-['Outfit'] font-black text-[11px] text-cyan-400 tracking-wide uppercase truncate">
                  DECEPTIVE SLICE
                </div>
                <div className="text-[9px] text-slate-300 truncate">Tai Tzu-ying</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono text-cyan-300 font-black shrink-0">
              6
            </span>
          </button>

          {/* 7. Iron Defense */}
          <button
            onClick={() => onActivateSkill('iron_defense')}
            className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-[#090f1d]/95 border transition-all cursor-pointer text-left ${
              activeSkill === 'iron_defense'
                ? 'border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                : 'border-emerald-500/40 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <div className="font-['Outfit'] font-black text-[11px] text-emerald-400 tracking-wide uppercase truncate">
                  IRON DEFENSE
                </div>
                <div className="text-[9px] text-slate-300 truncate">Hendra Setiawan</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono text-emerald-300 font-black shrink-0">
              7
            </span>
          </button>

          {/* 8. Stamina Surge */}
          <button
            onClick={() => onActivateSkill('stamina_surge')}
            className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-[#090f1d]/95 border transition-all cursor-pointer text-left ${
              activeSkill === 'stamina_surge'
                ? 'border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
                : 'border-rose-500/40 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <div className="truncate">
                <div className="font-['Outfit'] font-black text-[11px] text-rose-400 tracking-wide uppercase truncate">
                  STAMINA SURGE
                </div>
                <div className="text-[9px] text-slate-300 truncate">Viktor Axelsen</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-400/50 text-[10px] font-mono text-rose-300 font-black shrink-0">
              8
            </span>
          </button>
        </div>
      </aside>

      {/* RIGHT VERTICAL MARGIN DOCK: Power Charge + Safety Lock + 4 Numbered Shot Power Cards (Keys 1-4) */}
      <aside className="pointer-events-auto fixed right-2.5 top-14 bottom-2.5 z-30 w-[166px] sm:w-[184px] flex flex-col justify-between gap-1.5">
        {/* Power Status & Safety Lock Header Card */}
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[#071120]/90 border border-slate-800/90 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/90 text-[10px] font-mono font-bold text-white tabular-nums">
            <span>SHOT KEYS</span>
            <span className="text-cyan-400">
              {chargingShot ? `${chargeLevel}%` : 'PRESS 1–4'}
            </span>
          </div>

          <button
            onClick={() => onUpdateVariants({ safetyLock: !variants.safetyLock })}
            className={`w-full px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              variants.safetyLock
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-amber-400'
            }`}
          >
            <span className="flex items-center gap-1">
              <span>🛡️</span>
              <span>Safety Lock: {variants.safetyLock ? 'ON' : 'OFF'}</span>
            </span>
            <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-300">
              0
            </span>
          </button>
        </div>

        {/* 4 Numbered Tactical Shot Power Options (1: CLEAR, 2: DROP, 3: DRIVE, 4: SMASH) */}
        <div className="flex flex-col gap-1.5 flex-1 justify-end">
          {/* Card 1: [1] CLEAR */}
          <div
            className={`flex flex-col justify-between p-2 rounded-xl bg-[#0c1224]/95 border transition-all shadow-lg ${
              selectedShotType === 'clear'
                ? 'border-indigo-400 ring-1 ring-indigo-400/50 shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                : 'border-indigo-500/45'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-500 text-white font-mono font-black text-[11px] flex items-center justify-center shadow">
                  1
                </span>
                <span className="font-['Outfit'] font-bold text-slate-100 uppercase">CLEAR</span>
              </span>
              <span className="font-mono font-bold text-indigo-400 tabular-nums">{clearPct}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg mb-1.5 text-[9px] font-semibold">
              {(['mid', 'deep', 'max'] as ClearVariant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => onUpdateVariants({ clear: v })}
                  className={`py-0.5 rounded transition-colors cursor-pointer ${
                    variants.clear === v
                      ? 'bg-indigo-600 text-white font-bold'
                      : v === 'max'
                      ? 'text-amber-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'mid' ? 'Mid' : v === 'deep' ? 'Deep' : '100%'}
                </button>
              ))}
            </div>

            <button
              onMouseDown={() => startCharge('clear')}
              onMouseUp={() => releaseCharge('clear')}
              onTouchStart={() => onTriggerShot('clear', 1.0)}
              className="w-full py-1.5 px-2 rounded-lg bg-indigo-950/85 hover:bg-indigo-900 border border-indigo-500/50 text-white font-['Outfit'] font-bold text-[11px] flex items-center justify-between transition-all active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>HIT CLEAR</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 border border-indigo-400/60 text-[10px] font-mono font-black text-indigo-200">
                KEY 1
              </span>
            </button>
          </div>

          {/* Card 2: [2] DROP */}
          <div
            className={`flex flex-col justify-between p-2 rounded-xl bg-[#081726]/95 border transition-all shadow-lg ${
              selectedShotType === 'drop'
                ? 'border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                : 'border-cyan-500/45'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-cyan-500 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center shadow">
                  2
                </span>
                <span className="font-['Outfit'] font-bold text-slate-100 uppercase">DROP</span>
              </span>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">{dropPct}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg mb-1.5 text-[9px] font-semibold">
              {(['tight', 'push', 'max'] as DropVariant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => onUpdateVariants({ drop: v })}
                  className={`py-0.5 rounded transition-colors cursor-pointer ${
                    variants.drop === v
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : v === 'max'
                      ? 'text-amber-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'tight' ? 'Tight' : v === 'push' ? 'Push' : '100%'}
                </button>
              ))}
            </div>

            <button
              onMouseDown={() => startCharge('drop')}
              onMouseUp={() => releaseCharge('drop')}
              onTouchStart={() => onTriggerShot('drop', 1.0)}
              className="w-full py-1.5 px-2 rounded-lg bg-cyan-950/85 hover:bg-cyan-900 border border-cyan-500/50 text-white font-['Outfit'] font-bold text-[11px] flex items-center justify-between transition-all active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>HIT DROP</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 border border-cyan-400/60 text-[10px] font-mono font-black text-cyan-200">
                KEY 2
              </span>
            </button>
          </div>

          {/* Card 3: [3] DRIVE */}
          <div
            className={`flex flex-col justify-between p-2 rounded-xl bg-[#071a24]/95 border transition-all shadow-lg ${
              selectedShotType === 'drive'
                ? 'border-teal-400 ring-1 ring-teal-400/50 shadow-[0_0_16px_rgba(20,184,166,0.3)]'
                : 'border-teal-500/45'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-teal-500 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center shadow">
                  3
                </span>
                <span className="font-['Outfit'] font-bold text-slate-100 uppercase">DRIVE</span>
              </span>
              <span className="font-mono font-bold text-teal-400 tabular-nums">{drivePct}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg mb-1.5 text-[9px] font-semibold">
              {(['soft', 'fast', 'max'] as DriveVariant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => onUpdateVariants({ drive: v })}
                  className={`py-0.5 rounded transition-colors cursor-pointer ${
                    variants.drive === v
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : v === 'max'
                      ? 'text-amber-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'soft' ? 'Soft' : v === 'fast' ? 'Fast' : '100%'}
                </button>
              ))}
            </div>

            <button
              onMouseDown={() => startCharge('drive')}
              onMouseUp={() => releaseCharge('drive')}
              onTouchStart={() => onTriggerShot('drive', 1.0)}
              className="w-full py-1.5 px-2 rounded-lg bg-teal-950/85 hover:bg-teal-900 border border-teal-500/50 text-white font-['Outfit'] font-bold text-[11px] flex items-center justify-between transition-all active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>HIT DRIVE</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/30 border border-teal-400/60 text-[10px] font-mono font-black text-teal-200">
                KEY 3
              </span>
            </button>
          </div>

          {/* Card 4: [4] SMASH */}
          <div
            className={`flex flex-col justify-between p-2 rounded-xl bg-[#221019]/95 border transition-all ${
              selectedShotType === 'smash'
                ? 'border-amber-400 ring-1 ring-amber-400/60 shadow-[0_0_22px_rgba(245,158,11,0.4)]'
                : 'border-amber-500/70 shadow-[0_0_18px_rgba(245,158,11,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-['Outfit'] font-black text-amber-400 uppercase flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-500 to-amber-500 text-white font-mono font-black text-[11px] flex items-center justify-center shadow">
                  4
                </span>
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>SMASH</span>
              </span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">{smashPct}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg mb-1.5 text-[9px] font-semibold">
              {([75, 90, 100] as SmashVariant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => onUpdateVariants({ smash: v })}
                  className={`py-0.5 rounded transition-colors cursor-pointer ${
                    variants.smash === v
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {v === 100 ? '🔥100%' : `${v}%`}
                </button>
              ))}
            </div>

            <button
              onMouseDown={() => startCharge('smash')}
              onMouseUp={() => releaseCharge('smash')}
              onTouchStart={() => onTriggerShot('smash', 1.0)}
              className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-['Outfit'] font-black text-[11px] flex items-center justify-between shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>SMASH</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black/35 border border-amber-200/60 text-[10px] font-mono font-black text-amber-100">
                KEY 4
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
