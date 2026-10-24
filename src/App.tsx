/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  MatchRules,
  MatchStatus,
  PlayerSlot,
  PlayerState,
  ShotType,
  ShotVariantsConfig,
  ShuttleState,
  SignatureSkillId,
  SignatureSkillState,
  TeamColor,
  HawkEyeData,
  CrowdState,
} from './types/game';
import {
  COURT,
  checkShuttleInBounds,
  updateShuttlePhysics,
  calculateShot,
  updatePlayerMovement,
} from './utils/physics';
import { updateAiBot, selectTacticalAiTarget } from './utils/aiBot';
import { soundFX } from './utils/audio';
import { BadmintonCourt } from './components/BadmintonCourt';
import { Scoreboard } from './components/Scoreboard';
import { ControlsOverlay } from './components/ControlsOverlay';
import { HawkEyeModal } from './components/HawkEyeModal';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { LobbyModal } from './components/LobbyModal';

export default function App() {
  // Game Setup & Rules
  const [rules, setRules] = useState<MatchRules>({
    mode: '1v1',
    targetPoints: 11,
    winByTwo: true,
    suddenDeathCap: 30,
    timedMatch: false,
    durationSeconds: 180,
    allowDraws: true,
  });

  const [playMode, setPlayMode] = useState<'solo_ai' | 'local_multiplayer' | 'online_room'>('solo_ai');
  const [showLobby, setShowLobby] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [onlineConnected, setOnlineConnected] = useState<boolean>(false);
  const [touchpadEnabled, setTouchpadEnabled] = useState<boolean>(true);
  const [touchpadTarget, setTouchpadTarget] = useState<{ x: number; y: number } | null>({
    x: 245,
    y: 195,
  });

  // Match State
  const [status, setStatus] = useState<MatchStatus>('serving');
  const [scoreRed, setScoreRed] = useState<number>(0); // Near Player (You)
  const [scoreBlue, setScoreBlue] = useState<number>(0); // Far Opponent (AI)
  const [servingSlot, setServingSlot] = useState<PlayerSlot>('red_1');
  const [servingTeam, setServingTeam] = useState<TeamColor>('red');
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [topSmashSpeed, setTopSmashSpeed] = useState<number>(351);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(180);
  const [matchElapsedSeconds, setMatchElapsedSeconds] = useState<number>(0);
  const [rallyElapsedSeconds, setRallyElapsedSeconds] = useState<number>(0);
  const [winner, setWinner] = useState<TeamColor | 'draw' | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string | null>('YOUR SERVE!');
  const [announcementSub, setAnnouncementSub] = useState<string | null>(
    'Click SERVE or press SPACE to serve'
  );
  const [hawkEye, setHawkEye] = useState<HawkEyeData | null>(null);

  // Tactical Shot Variants & Safety Lock
  const [variants, setVariants] = useState<ShotVariantsConfig>({
    clear: 'deep',
    drop: 'push',
    drive: 'fast',
    smash: 100,
    safetyLock: true,
  });

  // 4 Signature Pro Skills (Number Keys 5-8)
  const [skills] = useState<Record<SignatureSkillId, SignatureSkillState>>({
    thunder_smash: {
      id: 'thunder_smash',
      name: 'THUNDER SMASH',
      proName: 'Lin Dan (420 km/h)',
      hotkey: '5',
      charge: 100,
      activeUntil: 0,
    },
    deceptive_slice: {
      id: 'deceptive_slice',
      name: 'DECEPTIVE SLICE',
      proName: 'Tai Tzu-ying',
      hotkey: '6',
      charge: 100,
      activeUntil: 0,
    },
    iron_defense: {
      id: 'iron_defense',
      name: 'IRON DEFENSE',
      proName: 'Hendra Setiawan',
      hotkey: '7',
      charge: 100,
      activeUntil: 0,
    },
    stamina_surge: {
      id: 'stamina_surge',
      name: 'STAMINA SURGE',
      proName: 'Viktor Axelsen',
      hotkey: '8',
      charge: 100,
      activeUntil: 0,
    },
  });

  const [activeSkill, setActiveSkill] = useState<SignatureSkillId | null>(null);
  const [selectedShotType, setSelectedShotType] = useState<ShotType>('clear');

  // Audience & Stadium Hype
  const [crowd, setCrowd] = useState<CrowdState>({
    hype: 65,
    reaction: 'idle',
    flashTimer: 0,
    chantText: '',
    cheerIntensity: 0.6,
  });

  // Initial Players State (Portrait Coordinates: X: 0 to 400, Y: 0 to 800)
  const initialPlayers: Record<PlayerSlot, PlayerState | null> = {
    red_1: {
      id: 'p_red1',
      slot: 'red_1',
      team: 'red',
      name: 'Player 1 (You)',
      countryCode: 'USA',
      isAi: false,
      x: 245,
      y: 195,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      stridePhase: 0,
      torsoLean: 0,
      facing: 'up',
      state: 'idle',
      swingType: null,
      swingProgress: 0,
      jumpCharge: 0,
      stamina: 100,
      color: '#2563eb',
      glowColor: '#38bdf8',
      jerseyNumber: 1,
      cyberSuit: 'blue_pro',
      activeSkill: null,
      stats: {
        smashes: 0,
        drops: 0,
        clears: 0,
        drives: 0,
        saves: 0,
        pointsWon: 0,
        highestSmashSpeed: 351,
      },
    },
    red_2: null,
    blue_1: {
      id: 'p_blue1',
      slot: 'blue_1',
      team: 'blue',
      name: 'Axelsen (AI)',
      countryCode: 'DEN',
      isAi: true,
      aiDifficulty: 'pro',
      x: 190,
      y: 610,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      stridePhase: 0,
      torsoLean: 0,
      facing: 'down',
      state: 'idle',
      swingType: null,
      swingProgress: 0,
      jumpCharge: 0,
      stamina: 100,
      color: '#dc2626',
      glowColor: '#f87171',
      jerseyNumber: 2,
      cyberSuit: 'red_pro',
      activeSkill: null,
      stats: {
        smashes: 0,
        drops: 0,
        clears: 0,
        drives: 0,
        saves: 0,
        pointsWon: 0,
        highestSmashSpeed: 340,
      },
    },
    blue_2: null,
  };

  const [players, setPlayers] = useState<Record<PlayerSlot, PlayerState | null>>(initialPlayers);

  const initialShuttle: ShuttleState = {
    x: 245,
    y: 215,
    z: 35,
    vx: 0,
    vy: 0,
    vz: 0,
    speedKmH: 0,
    rotation: 0,
    lastHitBy: null,
    lastHitTeam: null,
    lastShotType: null,
    isSmash: false,
    trail: [],
    state: 'service',
  };

  const [shuttle, setShuttle] = useState<ShuttleState>(initialShuttle);

  // Authoritative simulation refs to eliminate stale closures inside the 60FPS loop
  const playersRef = useRef<Record<PlayerSlot, PlayerState | null>>(initialPlayers);
  const shuttleRef = useRef<ShuttleState>(initialShuttle);
  const variantsRef = useRef<ShotVariantsConfig>(variants);
  const rulesRef = useRef<MatchRules>(rules);
  const touchpadTargetRef = useRef<{ x: number; y: number } | null>({ x: 245, y: 195 });
  const touchpadEnabledRef = useRef<boolean>(true);
  const selectedShotTypeRef = useRef<ShotType>('clear');
  const wsRef = useRef<WebSocket | null>(null);
  const keysDown = useRef<Record<string, boolean>>({});

  useEffect(() => {
    variantsRef.current = variants;
  }, [variants]);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    touchpadEnabledRef.current = touchpadEnabled;
  }, [touchpadEnabled]);

  // Connect to WebSocket Server for Real-Time synchronization
  useEffect(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setOnlineConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reaction_broadcast') {
            soundFX.playCrowdCheer(0.9);
            setCrowd((c) => ({
              ...c,
              hype: Math.min(100, c.hype + 10),
              reaction: 'cheer',
              chantText: `${data.sender}: ${data.emoji}`,
            }));
          }
        } catch {
          // ignore
        }
      };
      ws.onclose = () => setOnlineConnected(false);
    } catch {
      setOnlineConnected(false);
    }

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Update fingertip / touchpad target coordinate
  const handleTouchpadMove = useCallback((gx: number, gy: number) => {
    if (!touchpadEnabledRef.current) return;
    const clampedX = Math.max(COURT.DOUBLES_X_MIN - 12, Math.min(COURT.DOUBLES_X_MAX + 12, gx));
    const clampedY = Math.max(COURT.NEAR_MIN_Y, Math.min(COURT.NEAR_MAX_Y, gy));
    const nextTarget = { x: clampedX, y: clampedY };
    touchpadTargetRef.current = nextTarget;
    setTouchpadTarget(nextTarget);
  }, []);

  // Activate one of the 4 Signature Pro Skills
  const handleActivateSkill = useCallback((skillId: SignatureSkillId) => {
    soundFX.playCameraFlash();
    setActiveSkill((prev) => {
      const next = prev === skillId ? null : skillId;
      const p1 = playersRef.current.red_1;
      if (p1) {
        const updatedP1: PlayerState = {
          ...p1,
          stamina: next === 'stamina_surge' ? 100 : p1.stamina,
          activeSkill: next,
        };
        playersRef.current = { ...playersRef.current, red_1: updatedP1 };
        setPlayers(playersRef.current);
      }
      return next;
    });
  }, []);

  // Start Service
  const startService = useCallback(() => {
    if (status !== 'serving' && status !== 'ready') return;
    soundFX.playClear();
    soundFX.playWhistle();

    const isRed = servingTeam === 'red';
    setStatus('rally');
    setRallyElapsedSeconds(0);
    setAnnouncement(null);
    setAnnouncementSub(null);

    const serverPlayer = isRed ? playersRef.current.red_1 : playersRef.current.blue_1;
    const startX = serverPlayer ? serverPlayer.x : 200;
    const startY = isRed
      ? serverPlayer
        ? serverPlayer.y + 18
        : 215
      : serverPlayer
      ? serverPlayer.y - 18
      : 585;

    // Calculate clean high service arc across the net into the opponent's service court
    const targetX = startX < 200 ? 255 : 145;
    const serviceTargetY = isRed ? 585 : 215;
    const serviceShot = calculateShot(
      serverPlayer || playersRef.current.red_1!,
      'clear',
      0.88,
      targetX,
      variantsRef.current,
      45,
      serviceTargetY,
      rulesRef.current.mode
    );

    const nextShuttle: ShuttleState = {
      x: startX,
      y: startY,
      z: 45,
      vx: serviceShot.vx,
      vy: serviceShot.vy,
      vz: serviceShot.vz,
      curveX: 0,
      speedKmH: 175,
      rotation: isRed ? 0.3 : -0.3,
      lastHitBy: servingSlot,
      lastHitTeam: servingTeam,
      lastShotType: 'clear',
      isSmash: false,
      trail: [],
      state: 'in_play',
    };

    shuttleRef.current = nextShuttle;
    setShuttle(nextShuttle);
  }, [status, servingTeam, servingSlot]);

  // Automatic AI Service when it is Opponent's turn to serve
  useEffect(() => {
    if (status === 'serving' && servingTeam === 'blue' && !isPaused) {
      const serverP = playersRef.current.blue_1;
      if (serverP && serverP.isAi) {
        const timer = setTimeout(() => {
          startService();
        }, 1150);
        return () => clearTimeout(timer);
      }
    }
  }, [status, servingTeam, isPaused, startService]);

  // Execute a swing by Player 1 (or Player 2) and lock in the chosen shot type
  const executePlayerSwing = useCallback(
    (slot: PlayerSlot, shotType: ShotType, powerMultiplier: number = 1.0) => {
      if (slot === 'red_1') {
        selectedShotTypeRef.current = shotType;
        setSelectedShotType(shotType);
      }

      if (status === 'serving' && slot === 'red_1' && servingTeam === 'red') {
        startService();
        return;
      }

      const p = playersRef.current[slot];
      if (!p) return;

      const curShuttle = shuttleRef.current;
      const shouldAutoJump =
        shotType === 'smash' && p.z === 0 && curShuttle.z > 65 && p.stamina > 12;

      const updatedP: PlayerState = {
        ...p,
        vz: shouldAutoJump ? 8.5 : p.vz,
        z: shouldAutoJump ? 2 : p.z,
        state: 'swinging',
        swingType: shotType,
        swingProgress: 0.08,
        jumpCharge: powerMultiplier,
      };

      playersRef.current = {
        ...playersRef.current,
        [slot]: updatedP,
      };
      setPlayers({ ...playersRef.current });
    },
    [status, servingTeam, startService]
  );

  // Keyboard Event Handlers (Simultaneous Movement + Numbered Power Buttons 1-4 & Skills 5-8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.current[e.code] = true;

      if ((e.code === 'Space' || e.code === 'Enter') && status === 'serving') {
        startService();
        return;
      }

      // Numbered Shot Power Buttons: [1] Clear, [2] Drop, [3] Drive, [4] Smash (plus J/L/U/K)
      const isSolo = playMode !== 'local_multiplayer';
      if (e.code === 'Digit1' || (isSolo && e.code === 'Numpad1') || e.code === 'KeyJ') {
        executePlayerSwing('red_1', 'clear', 1.0);
      }
      if (e.code === 'Digit2' || (isSolo && e.code === 'Numpad2') || e.code === 'KeyL') {
        executePlayerSwing('red_1', 'drop', 1.0);
      }
      if (e.code === 'Digit3' || (isSolo && e.code === 'Numpad3') || e.code === 'KeyU') {
        executePlayerSwing('red_1', 'drive', 1.0);
      }
      if (e.code === 'Digit4' || (isSolo && e.code === 'Numpad4') || e.code === 'KeyK') {
        executePlayerSwing('red_1', 'smash', 1.0);
      }

      // Numbered Pro Signature Skills: [5] Thunder Smash, [6] Deceptive Slice, [7] Iron Defense, [8] Stamina Surge
      if (e.code === 'Digit5' || (isSolo && e.code === 'Numpad5')) {
        handleActivateSkill('thunder_smash');
      }
      if (e.code === 'Digit6' || (isSolo && e.code === 'Numpad6')) {
        handleActivateSkill('deceptive_slice');
      }
      if (e.code === 'Digit7' || (isSolo && e.code === 'Numpad7')) {
        handleActivateSkill('iron_defense');
      }
      if (e.code === 'Digit8' || (isSolo && e.code === 'Numpad8')) {
        handleActivateSkill('stamina_surge');
      }

      // [0] Toggle Safety Lock
      if (e.code === 'Digit0' || (isSolo && e.code === 'Numpad0')) {
        setVariants((prev) => ({ ...prev, safetyLock: !prev.safetyLock }));
      }

      if (playMode === 'local_multiplayer') {
        if (e.code === 'Numpad1' || e.code === 'KeyZ') executePlayerSwing('blue_1', 'smash', 1.0);
        if (e.code === 'Numpad2' || e.code === 'KeyX') executePlayerSwing('blue_1', 'drop', 1.0);
        if (e.code === 'Numpad3' || e.code === 'KeyC') executePlayerSwing('blue_1', 'clear', 1.0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status, playMode, startService, executePlayerSwing, handleActivateSkill]);

  // Initialize or Reset Match
  const initMatch = useCallback(
    (config: {
      mode: GameMode;
      rules: MatchRules;
      playMode: 'solo_ai' | 'local_multiplayer' | 'online_room';
      roomCode?: string;
      playerName: string;
      aiDifficulty: 'novice' | 'pro' | 'legend';
    }) => {
      setRules(config.rules);
      rulesRef.current = config.rules;
      setPlayMode(config.playMode);
      setScoreRed(0);
      setScoreBlue(0);
      setServingSlot('red_1');
      setServingTeam('red');
      setRallyCount(0);
      setTimeRemainingSeconds(config.rules.durationSeconds || 180);
      setMatchElapsedSeconds(0);
      setRallyElapsedSeconds(0);
      setWinner(null);
      setIsDraw(false);
      setIsPaused(false);
      setStatus('serving');
      setAnnouncement('YOUR SERVE!');
      setAnnouncementSub('Click SERVE or press SPACE to serve');
      soundFX.speakUmpire('Love All. Play.');

      const is2v2 = config.mode === '2v2';

      const pRed1: PlayerState = {
        id: 'p_red1',
        slot: 'red_1',
        team: 'red',
        name: config.playerName || 'Player 1 (You)',
        countryCode: 'USA',
        isAi: false,
        x: is2v2 ? 255 : 245,
        y: is2v2 ? 275 : 195,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        stridePhase: 0,
        torsoLean: 0,
        facing: 'up',
        state: 'idle',
        swingType: null,
        swingProgress: 0,
        jumpCharge: 0,
        stamina: 100,
        color: '#2563eb',
        glowColor: '#38bdf8',
        jerseyNumber: 1,
        cyberSuit: 'blue_pro',
        activeSkill: null,
        stats: {
          smashes: 0,
          drops: 0,
          clears: 0,
          drives: 0,
          saves: 0,
          pointsWon: 0,
          highestSmashSpeed: 351,
        },
      };

      const pRed2: PlayerState | null = is2v2
        ? {
            id: 'p_red2',
            slot: 'red_2',
            team: 'red',
            name: 'Setiawan (AI)',
            countryCode: 'INA',
            isAi: config.playMode !== 'local_multiplayer',
            aiDifficulty: config.aiDifficulty,
            x: 145,
            y: 120,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            stridePhase: 0,
            torsoLean: 0,
            facing: 'up',
            state: 'idle',
            swingType: null,
            swingProgress: 0,
            jumpCharge: 0,
            stamina: 100,
            color: '#1d4ed8',
            glowColor: '#60a5fa',
            jerseyNumber: 3,
            cyberSuit: 'blue_partner',
            activeSkill: null,
            stats: {
              smashes: 0,
              drops: 0,
              clears: 0,
              drives: 0,
              saves: 0,
              pointsWon: 0,
              highestSmashSpeed: 335,
            },
          }
        : null;

      const pBlue1: PlayerState = {
        id: 'p_blue1',
        slot: 'blue_1',
        team: 'blue',
        name: config.playMode === 'local_multiplayer' ? 'Player 2' : 'Axelsen (AI)',
        countryCode: 'DEN',
        isAi: config.playMode !== 'local_multiplayer',
        aiDifficulty: config.aiDifficulty,
        x: is2v2 ? 145 : 190,
        y: is2v2 ? 520 : 610,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        stridePhase: 0,
        torsoLean: 0,
        facing: 'down',
        state: 'idle',
        swingType: null,
        swingProgress: 0,
        jumpCharge: 0,
        stamina: 100,
        color: '#dc2626',
        glowColor: '#f87171',
        jerseyNumber: 2,
        cyberSuit: 'red_pro',
        activeSkill: null,
        stats: {
          smashes: 0,
          drops: 0,
          clears: 0,
          drives: 0,
          saves: 0,
          pointsWon: 0,
          highestSmashSpeed: 345,
        },
      };

      const pBlue2: PlayerState | null = is2v2
        ? {
            id: 'p_blue2',
            slot: 'blue_2',
            team: 'blue',
            name: 'Lin Dan (AI)',
            countryCode: 'CHN',
            isAi: true,
            aiDifficulty: config.aiDifficulty,
            x: 255,
            y: 680,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            stridePhase: 0,
            torsoLean: 0,
            facing: 'down',
            state: 'idle',
            swingType: null,
            swingProgress: 0,
            jumpCharge: 0,
            stamina: 100,
            color: '#b91c1c',
            glowColor: '#fb7185',
            jerseyNumber: 4,
            cyberSuit: 'red_partner',
            activeSkill: null,
            stats: {
              smashes: 0,
              drops: 0,
              clears: 0,
              drives: 0,
              saves: 0,
              pointsWon: 0,
              highestSmashSpeed: 360,
            },
          }
        : null;

      const nextPlayers = {
        red_1: pRed1,
        red_2: pRed2,
        blue_1: pBlue1,
        blue_2: pBlue2,
      };
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);

      touchpadTargetRef.current = { x: pRed1.x, y: pRed1.y };
      setTouchpadTarget({ x: pRed1.x, y: pRed1.y });

      const nextShuttle: ShuttleState = {
        x: 245,
        y: 215,
        z: 35,
        vx: 0,
        vy: 0,
        vz: 0,
        speedKmH: 0,
        rotation: 0,
        lastHitBy: 'red_1',
        lastHitTeam: 'red',
        lastShotType: null,
        isSmash: false,
        trail: [],
        state: 'service',
      };
      shuttleRef.current = nextShuttle;
      setShuttle(nextShuttle);

      setShowLobby(false);
    },
    []
  );

  // Point Awarding & Win / Draw Evaluation
  const awardPoint = useCallback(
    (scoringTeam: TeamColor, reason: string, shuttleX: number, shuttleY: number) => {
      setStatus('point_scored');
      soundFX.playWhistle();

      const curRules = rulesRef.current;
      const targetTeam = scoringTeam === 'red' ? 'blue' : 'red';
      const check = checkShuttleInBounds(shuttleX, shuttleY, curRules.mode, false, targetTeam);
      if (check.lineDistMm < 30 && Math.random() < 0.55) {
        soundFX.playCrowdGasp();
        setHawkEye({
          active: true,
          shuttleX,
          shuttleY,
          isInside: check.inBounds,
          distanceFromLineMm: check.lineDistMm,
          lineName: check.lineName,
          timestamp: Date.now(),
        });
      }

      setScoreRed((prevRed) => {
        const newRed = scoringTeam === 'red' ? prevRed + 1 : prevRed;
        setScoreBlue((prevBlue) => {
          const newBlue = scoringTeam === 'blue' ? prevBlue + 1 : prevBlue;

          soundFX.playCrowdCheer(0.85);
          setCrowd((c) => ({
            ...c,
            hype: Math.min(100, c.hype + (scoringTeam === 'red' ? 7 : 3)),
            reaction: 'cheer',
            flashTimer: 3,
            chantText: scoringTeam === 'red' ? 'POINT TEAM BLUE!' : 'POINT TEAM RED!',
          }));

          setAnnouncement(
            scoringTeam === 'red' ? 'POINT FOR YOU!' : 'POINT FOR OPPONENT'
          );
          setAnnouncementSub(`${reason} · Score ${newRed} - ${newBlue}`);

          const target = curRules.targetPoints;
          const lead = Math.abs(newRed - newBlue);
          const reachedTarget = newRed >= target || newBlue >= target;

          if (curRules.allowDraws && newRed === target && newBlue === target) {
            setIsDraw(true);
            setWinner('draw');
            setStatus('match_over');
            soundFX.speakUmpire('Match tied at target points! Official Draw.');
            return newBlue;
          }

          if (reachedTarget && lead >= 2) {
            const champ: TeamColor = newRed > newBlue ? 'red' : 'blue';
            setWinner(champ);
            setIsDraw(false);
            setStatus('match_over');
            soundFX.playCrowdCheer(1.0);
            return newBlue;
          }

          if (newRed >= curRules.suddenDeathCap || newBlue >= curRules.suddenDeathCap) {
            const champ: TeamColor = newRed > newBlue ? 'red' : 'blue';
            setWinner(champ);
            setIsDraw(false);
            setStatus('match_over');
            return newBlue;
          }

          setTimeout(() => {
            setServingTeam(scoringTeam);
            setServingSlot(scoringTeam === 'red' ? 'red_1' : 'blue_1');
            setRallyCount(0);
            setStatus('serving');
            setAnnouncement(scoringTeam === 'red' ? 'YOUR SERVE!' : 'OPPONENT SERVING...');
            setAnnouncementSub('Click SERVE or press SPACE to serve');

            const isRedServ = scoringTeam === 'red';
            const p1 = playersRef.current.red_1;
            const nextShuttle: ShuttleState = {
              x: isRedServ ? (p1 ? p1.x : 245) : 190,
              y: isRedServ ? (p1 ? p1.y + 18 : 215) : 590,
              z: 35,
              vx: 0,
              vy: 0,
              vz: 0,
              speedKmH: 0,
              rotation: 0,
              lastHitBy: isRedServ ? 'red_1' : 'blue_1',
              lastHitTeam: scoringTeam,
              lastShotType: null,
              isSmash: false,
              trail: [],
              state: 'service',
            };
            shuttleRef.current = nextShuttle;
            setShuttle(nextShuttle);
          }, 1800);

          return newBlue;
        });
        return newRed;
      });
    },
    []
  );

  // Live Match Clock, Rally Clock & Timed Match Countdown Timer
  useEffect(() => {
    if (status === 'match_over' || status === 'waiting' || isPaused) return;

    const interval = setInterval(() => {
      setMatchElapsedSeconds((prev) => prev + 1);
      if (status === 'rally') {
        setRallyElapsedSeconds((prev) => prev + 1);
      }

      if (rules.timedMatch) {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStatus('match_over');
            if (scoreRed === scoreBlue) {
              setIsDraw(true);
              setWinner('draw');
              soundFX.playWhistle();
            } else {
              const champ: TeamColor = scoreRed > scoreBlue ? 'red' : 'blue';
              setWinner(champ);
              setIsDraw(false);
              soundFX.playCrowdCheer(1.0);
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rules.timedMatch, status, scoreRed, scoreBlue, isPaused]);

  // Continuous 60 FPS Movement & Physics Loop (Runs during both 'serving' and 'rally' so touchpad movement is always live!)
  useEffect(() => {
    if ((status !== 'rally' && status !== 'serving') || isPaused) return;

    let animId: number;

    const gameTick = () => {
      const curRules = rulesRef.current;
      const curPlayers = { ...playersRef.current };
      let curShuttle = { ...shuttleRef.current };

      // 1. Human Player 1 Movement (Keyboard OR 1:1 Fingertip Touchpad Tracking)
      let p1MoveX = 0;
      let p1MoveY = 0;
      if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) p1MoveX -= 1;
      if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) p1MoveX += 1;
      if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) p1MoveY += 1;
      if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) p1MoveY -= 1;

      const p1Jump = status === 'rally' && !!keysDown.current['Space'];

      if (curPlayers.red_1) {
        const hasKeyboardMove = p1MoveX !== 0 || p1MoveY !== 0;
        const directTarget =
          !hasKeyboardMove && touchpadEnabledRef.current ? touchpadTargetRef.current : null;

        const updatedP1 = updatePlayerMovement(
          curPlayers.red_1,
          p1MoveX,
          p1MoveY,
          p1Jump,
          curRules.mode,
          directTarget
        );

        if (hasKeyboardMove) {
          touchpadTargetRef.current = { x: updatedP1.x, y: updatedP1.y };
        }
        curPlayers.red_1 = updatedP1;
      }

      // If in 'serving' state, keep shuttle attached to server and smoothly glide AI to ready stance
      if (status === 'serving') {
        if (curPlayers.blue_1 && curPlayers.blue_1.isAi) {
          curPlayers.blue_1 = updatePlayerMovement(
            curPlayers.blue_1,
            0,
            0,
            false,
            curRules.mode,
            { x: curRules.mode === '2v2' ? 145 : 195, y: curRules.mode === '2v2' ? 520 : 605 }
          );
        }
        if (curPlayers.blue_2 && curRules.mode === '2v2') {
          curPlayers.blue_2 = updatePlayerMovement(
            curPlayers.blue_2,
            0,
            0,
            false,
            curRules.mode,
            { x: 255, y: 675 }
          );
        }
        if (curPlayers.red_2 && curRules.mode === '2v2' && curPlayers.red_2.isAi) {
          curPlayers.red_2 = updatePlayerMovement(
            curPlayers.red_2,
            0,
            0,
            false,
            curRules.mode,
            { x: 145, y: 130 }
          );
        }

        if (servingTeam === 'red' && curPlayers.red_1) {
          curShuttle = {
            ...curShuttle,
            x: curPlayers.red_1.x,
            y: curPlayers.red_1.y + 18,
            z: 38,
          };
          shuttleRef.current = curShuttle;
          setShuttle(curShuttle);
        }
        playersRef.current = curPlayers;
        setPlayers(curPlayers);
        animId = requestAnimationFrame(gameTick);
        return;
      }

      // 2. Update AI Bots & Partner during 'rally' with continuous target gliding
      if (curPlayers.red_2 && curRules.mode === '2v2') {
        const decision = updateAiBot(
          curPlayers.red_2,
          curShuttle,
          curRules.mode,
          curPlayers.red_1,
          curPlayers.blue_1
        );
        curPlayers.red_2 = updatePlayerMovement(
          curPlayers.red_2,
          decision.moveX,
          decision.moveY,
          decision.jump,
          curRules.mode,
          decision.desiredPos
        );
        if (decision.swing) {
          curPlayers.red_2.state = 'swinging';
          curPlayers.red_2.swingType = decision.swing;
          curPlayers.red_2.swingProgress = 0.06;
        }
      }

      if (curPlayers.blue_1) {
        if (curPlayers.blue_1.isAi) {
          const decision = updateAiBot(
            curPlayers.blue_1,
            curShuttle,
            curRules.mode,
            curPlayers.blue_2,
            curPlayers.red_1
          );
          curPlayers.blue_1 = updatePlayerMovement(
            curPlayers.blue_1,
            decision.moveX,
            decision.moveY,
            decision.jump,
            curRules.mode,
            decision.desiredPos
          );
          if (decision.swing) {
            curPlayers.blue_1.state = 'swinging';
            curPlayers.blue_1.swingType = decision.swing;
            curPlayers.blue_1.swingProgress = 0.06;
          }
        }
      }

      if (curPlayers.blue_2 && curRules.mode === '2v2') {
        const decision = updateAiBot(
          curPlayers.blue_2,
          curShuttle,
          curRules.mode,
          curPlayers.blue_1,
          curPlayers.red_1
        );
        curPlayers.blue_2 = updatePlayerMovement(
          curPlayers.blue_2,
          decision.moveX,
          decision.moveY,
          decision.jump,
          curRules.mode,
          decision.desiredPos
        );
        if (decision.swing) {
          curPlayers.blue_2.state = 'swinging';
          curPlayers.blue_2.swingType = decision.swing;
          curPlayers.blue_2.swingProgress = 0.06;
        }
      }

      // Advance swing animations smoothly
      (['red_1', 'red_2', 'blue_1', 'blue_2'] as PlayerSlot[]).forEach((slot) => {
        const pl = curPlayers[slot];
        if (pl && pl.state === 'swinging') {
          const nextProgress = pl.swingProgress + 0.095;
          if (nextProgress >= 1) {
            pl.state = pl.z > 0 ? 'jumping' : 'idle';
            pl.swingType = null;
            pl.swingProgress = 0;
          } else {
            pl.swingProgress = nextProgress;
          }
        }
      });

      // 3. Update Shuttlecock Aerodynamics & Racket Interceptions
      const { shuttle: nextShuttle, netHit, groundHit } = updateShuttlePhysics(curShuttle);

      if (netHit && nextShuttle.z <= 12) {
        soundFX.playNetHit();
        const faultWinner = nextShuttle.lastHitTeam === 'red' ? 'blue' : 'red';
        shuttleRef.current = nextShuttle;
        playersRef.current = curPlayers;
        setShuttle(nextShuttle);
        setPlayers(curPlayers);
        awardPoint(faultWinner, 'Net Fault', nextShuttle.x, nextShuttle.y);
        return;
      }

      if (groundHit) {
        soundFX.playFloorBounce();
        const landingSide: TeamColor = nextShuttle.y < COURT.NET_Y ? 'red' : 'blue';
        const hitterTeam: TeamColor =
          nextShuttle.lastHitTeam || (landingSide === 'red' ? 'blue' : 'red');

        const inBoundsCheck = checkShuttleInBounds(
          nextShuttle.x,
          nextShuttle.y,
          curRules.mode,
          false,
          landingSide
        );

        shuttleRef.current = nextShuttle;
        playersRef.current = curPlayers;
        setShuttle(nextShuttle);
        setPlayers(curPlayers);

        if (inBoundsCheck.inBounds) {
          awardPoint(hitterTeam, 'Shuttle Landed In', nextShuttle.x, nextShuttle.y);
        } else {
          const outScoringTeam = hitterTeam === 'red' ? 'blue' : 'red';
          awardPoint(outScoringTeam, 'Shuttle Out of Bounds', nextShuttle.x, nextShuttle.y);
        }
        return;
      }

      // Check Racket Strike Window (Only when shuttle is on the player's own half of the court!)
      let shuttleHit = false;
      let hittingPlayer: PlayerState | null = null;

      Object.values(curPlayers).forEach((player) => {
        if (!player || shuttleHit) return;
        if (player.team === nextShuttle.lastHitTeam && nextShuttle.state === 'in_play') {
          return;
        }

        // Player can only strike shuttle on their own side of the net
        const shuttleOnPlayerSide =
          player.team === 'red'
            ? nextShuttle.y <= COURT.NET_Y + 8
            : nextShuttle.y >= COURT.NET_Y - 8;
        if (!shuttleOnPlayerSide) return;

        const defenseBonus = player.activeSkill === 'iron_defense' ? 30 : 0;
        const distX = Math.abs(player.x - nextShuttle.x);
        const distY = Math.abs(player.y - nextShuttle.y);
        const heightDiff = Math.abs(player.z - nextShuttle.z);

        // Generous sweet-spot strike window when swinging or reflex defending
        const isHumanAutoReturn =
          !player.isAi && distX <= 54 + defenseBonus && distY <= 58 + defenseBonus && nextShuttle.z >= 18 && nextShuttle.z <= 125;

        if (
          distX <= 68 + defenseBonus &&
          distY <= 72 + defenseBonus &&
          heightDiff <= 95 + defenseBonus
        ) {
          if (
            player.state === 'swinging' ||
            player.isAi ||
            player.activeSkill === 'iron_defense' ||
            isHumanAutoReturn
          ) {
            shuttleHit = true;
            hittingPlayer = player;
          }
        }
      });

      if (shuttleHit && hittingPlayer) {
        const hp: PlayerState = hittingPlayer;
        let shotType: ShotType;
        let aimX: number;
        let aimY: number | undefined = undefined;
        let shotPower: number = hp.jumpCharge || 0.95;

        if (hp.isAi) {
          // Intelligent Tactical AI: read opponent's live position and aim into open court space
          const primaryOpponent = hp.team === 'blue' ? curPlayers.red_1 : curPlayers.blue_1;
          const aiTactical = selectTacticalAiTarget(hp, nextShuttle, curRules.mode, primaryOpponent);
          shotType = hp.swingType || aiTactical.shotType;
          aimX = aiTactical.targetX;
          aimY = aiTactical.targetY;
          shotPower = aiTactical.power;
        } else {
          // Human Player: use active swingType or armed numbered power shot (1=Clear, 2=Drop, 3=Drive, 4=Smash)
          shotType =
            hp.swingType ||
            selectedShotTypeRef.current ||
            (hp.z > 30 || nextShuttle.z > 90 ? 'smash' : 'clear');
          const opp = curPlayers.blue_1;
          if (opp) {
            aimX = opp.x < 200 ? 285 : 115;
          } else {
            aimX = hp.x < 200 ? 280 : 120;
          }
        }

        // Trigger visual swing animation
        hp.state = 'swinging';
        hp.swingType = shotType;
        hp.swingProgress = 0.15;

        const { vx, vy, vz, curveX, isSmash, isThunderSmash } = calculateShot(
          hp,
          shotType,
          shotPower,
          aimX,
          hp.team === 'red' && !hp.isAi ? variantsRef.current : undefined,
          nextShuttle.z,
          aimY,
          curRules.mode
        );

        const recordedSpeed = isThunderSmash ? 420 : isSmash ? 351 : 210;
        if (isSmash) {
          soundFX.playSmash();
          soundFX.playCrowdCheer(0.92);
          setTopSmashSpeed((prevMax) => Math.max(prevMax, recordedSpeed));
          setCrowd((c) => ({
            ...c,
            hype: Math.min(100, c.hype + 14),
            reaction: 'cheer',
            flashTimer: 3,
            chantText: isThunderSmash ? '⚡ 420 KM/H THUNDER SMASH!' : '⚡ POWER SMASH!',
          }));
        } else if (shotType === 'drop') {
          soundFX.playDrop();
        } else {
          soundFX.playClear();
        }

        setRallyCount((r) => r + 1);

        if (
          hp.slot === 'red_1' &&
          (hp.activeSkill === 'thunder_smash' || hp.activeSkill === 'deceptive_slice')
        ) {
          hp.activeSkill = null;
          setActiveSkill(null);
        }

        const struckShuttle: ShuttleState = {
          ...nextShuttle,
          vx,
          vy,
          vz,
          curveX,
          isSmash,
          isThunderSmash,
          speedKmH: recordedSpeed,
          lastHitBy: hp.slot,
          lastHitTeam: hp.team,
          lastShotType: shotType,
          state: 'in_play',
        };

        shuttleRef.current = struckShuttle;
        playersRef.current = curPlayers;
        setShuttle(struckShuttle);
        setPlayers(curPlayers);
      } else {
        shuttleRef.current = nextShuttle;
        playersRef.current = curPlayers;
        setShuttle(nextShuttle);
        setPlayers(curPlayers);
      }

      animId = requestAnimationFrame(gameTick);
    };

    animId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animId);
  }, [status, isPaused, servingTeam, awardPoint]);

  const handleUpdateVariants = (next: Partial<ShotVariantsConfig>) => {
    setVariants((prev) => ({ ...prev, ...next }));
  };

  const handleRematch = () => {
    initMatch({
      mode: rules.mode,
      rules,
      playMode,
      playerName: players.red_1?.name || 'Player 1 (You)',
      aiDifficulty: 'pro',
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#040811] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans'] select-none">
      {/* Top Broadcast Scoreboard Bar */}
      <Scoreboard
        mode={rules.mode}
        scoreNear={scoreRed}
        scoreFar={scoreBlue}
        targetPoints={rules.targetPoints}
        timedMatch={rules.timedMatch}
        allowDraws={rules.allowDraws}
        timeRemainingSeconds={timeRemainingSeconds}
        servingTeam={servingTeam}
        rallyCount={rallyCount}
        topSmashSpeed={topSmashSpeed}
        players={players}
        isMuted={isMuted}
        isPaused={isPaused}
        onToggleMute={() => setIsMuted(soundFX.toggleMute())}
        onTogglePause={() => setIsPaused((p) => !p)}
        onOpenSetup={() => setShowLobby(true)}
      />

      {/* Full-Viewport BWF World Championship Arena & 3D Perspective Green Court */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <BadmintonCourt
          mode={rules.mode}
          players={players}
          shuttle={shuttle}
          crowd={crowd}
          canServe={status === 'serving'}
          servingTeam={servingTeam}
          scoreNear={scoreRed}
          scoreFar={scoreBlue}
          targetPoints={rules.targetPoints}
          timedMatch={rules.timedMatch}
          timeRemainingSeconds={timeRemainingSeconds}
          matchElapsedSeconds={matchElapsedSeconds}
          rallyElapsedSeconds={rallyElapsedSeconds}
          rallyCount={rallyCount}
          touchpadTarget={touchpadEnabled ? touchpadTarget : null}
          onServe={startService}
          onPointerTrack={handleTouchpadMove}
          announcement={announcement}
          announcementSub={announcementSub}
        />

        {/* Bottom HUD: Fingertip Touchpad + 4 Pro Skills (Left) & 4 Numbered Shot Power Cards (Right) */}
        <ControlsOverlay
          variants={variants}
          skills={skills}
          activeSkill={activeSkill}
          selectedShotType={selectedShotType}
          touchpadEnabled={touchpadEnabled}
          playerPos={{
            x: players.red_1?.x ?? 245,
            y: players.red_1?.y ?? 195,
          }}
          onToggleTouchpad={() => setTouchpadEnabled((t) => !t)}
          onTouchpadMove={handleTouchpadMove}
          onUpdateVariants={handleUpdateVariants}
          onTriggerShot={(shot, mult) => executePlayerSwing('red_1', shot, mult)}
          onActivateSkill={handleActivateSkill}
        />
      </main>

      {/* Modals */}
      <HawkEyeModal data={hawkEye} onClose={() => setHawkEye(null)} />

      {status === 'match_over' && (
        <MatchSummaryModal
          winner={winner}
          isDraw={isDraw}
          mode={rules.mode}
          scoreRed={scoreRed}
          scoreBlue={scoreBlue}
          players={players}
          rallyCount={rallyCount}
          onRematch={handleRematch}
          onReturnToLobby={() => setShowLobby(true)}
        />
      )}

      {showLobby && (
        <LobbyModal
          currentRules={rules}
          onStartMatch={initMatch}
          onlineConnected={onlineConnected}
        />
      )}
    </div>
  );
}
