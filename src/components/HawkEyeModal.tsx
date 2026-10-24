/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HawkEyeData } from '../types/game';

interface HawkEyeModalProps {
  data: HawkEyeData | null;
  onClose: () => void;
}

export const HawkEyeModal: React.FC<HawkEyeModalProps> = ({ data, onClose }) => {
  if (!data || !data.active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.35)]">
        {/* Futuristic Cyber Top Bar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-cyan-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-['Outfit'] font-black text-cyan-400 tracking-wider text-xs uppercase">
              HAWK-EYE QUANTUM SCAN
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 tracking-widest">3D TELEMETRY</span>
        </div>

        {/* Wireframe Holographic Zoom View */}
        <div className="relative h-60 bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b border-cyan-900/50">
          {/* Neon grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d418_1px,transparent_1px),linear-gradient(to_bottom,#06b6d418_1px,transparent_1px)] bg-[size:14px_14px]" />

          {/* Court In-Bounds Half */}
          <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-cyan-950/25 border-l-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center pl-2">
            <span className="text-[9px] font-mono font-bold text-cyan-500/60 rotate-90 tracking-widest">
              IN BOUNDS
            </span>
          </div>

          {/* Out of Bounds Half */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-rose-950/15 flex items-center justify-end pr-2">
            <span className="text-[9px] font-mono font-bold text-rose-500/50 -rotate-90 tracking-widest">
              OUT OF BOUNDS
            </span>
          </div>

          {/* Boundary Line (Center vertical line) */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-white/95 shadow-[0_0_15px_rgba(255,255,255,0.7)] flex items-center justify-center">
            <span className="text-[8px] font-mono font-bold text-slate-800 rotate-90 tracking-wider">
              {data.lineName.toUpperCase()}
            </span>
          </div>

          {/* Impact Point */}
          <div
            className="absolute z-10 flex flex-col items-center transition-all duration-500"
            style={{
              left: data.isInside ? 'calc(50% + 12px)' : 'calc(50% - 36px)',
              top: '46%',
            }}
          >
            {/* Impact Ripple */}
            <div
              className={`w-12 h-12 rounded-full border-2 ${
                data.isInside
                  ? 'border-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'border-rose-500 bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
              } flex items-center justify-center animate-ping`}
            />
            {/* Core Impact Dot */}
            <div className="w-4 h-4 rounded-full bg-white border border-cyan-300 absolute top-4 shadow-lg" />
          </div>

          {/* Holographic Decision Stamp */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div
              className={`px-6 py-1.5 rounded-lg text-xl font-black font-['Outfit'] tracking-widest shadow-xl uppercase ${
                data.isInside
                  ? 'bg-cyan-500 text-slate-950 border border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                  : 'bg-rose-600 text-white border border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
              }`}
            >
              {data.isInside ? '✓ IN BOUNDS' : '✗ OUT'}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="p-4 flex items-center justify-between bg-slate-950 text-slate-300 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block">PRECISION DISTANCE</span>
            <span className="font-bold text-white tabular-nums">
              {data.distanceFromLineMm} mm {data.isInside ? 'inside line' : 'out'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-sans text-xs font-bold rounded-lg transition-colors"
          >
            Resume Play
          </button>
        </div>
      </div>
    </div>
  );
};
