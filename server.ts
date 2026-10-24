/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

// In-memory Game Rooms
interface ServerPlayer {
  id: string;
  ws?: WebSocket;
  slot: string;
  team: 'red' | 'blue';
  name: string;
  isAi: boolean;
  aiDifficulty?: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 'up' | 'down' | 'left' | 'right';
  state: string;
  swingType: string | null;
  swingProgress: number;
  stamina: number;
  stats: {
    smashes: number;
    drops: number;
    clears: number;
    saves: number;
    pointsWon: number;
    highestSmashSpeed: number;
  };
}

interface ServerRoom {
  code: string;
  mode: '1v1' | '2v2';
  targetPoints: number;
  timedMatch: boolean;
  timeRemainingSeconds: number;
  status: 'waiting' | 'ready' | 'serving' | 'rally' | 'point_scored' | 'deuce' | 'draw' | 'match_over';
  scoreRed: number;
  scoreBlue: number;
  servingSlot: string;
  servingTeam: 'red' | 'blue';
  rallyCount: number;
  winner: 'red' | 'blue' | 'draw' | null;
  isDraw: boolean;
  crowdHype: number;
  crowdReaction: string;
  players: Record<string, ServerPlayer>;
  spectators: WebSocket[];
  shuttle: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    speedKmH: number;
    rotation: number;
    lastHitBy: string | null;
    lastHitTeam: 'red' | 'blue' | null;
    isSmash: boolean;
    state: string;
  };
  intervalId?: NodeJS.Timeout;
}

const rooms = new Map<string, ServerRoom>();

function getOrCreateRoom(code: string, mode: '1v1' | '2v2' = '1v1'): ServerRoom {
  let room = rooms.get(code);
  if (!room) {
    room = {
      code,
      mode,
      targetPoints: 11,
      timedMatch: false,
      timeRemainingSeconds: 180,
      status: 'serving',
      scoreRed: 0,
      scoreBlue: 0,
      servingSlot: 'red_1',
      servingTeam: 'red',
      rallyCount: 0,
      winner: null,
      isDraw: false,
      crowdHype: 50,
      crowdReaction: 'idle',
      players: {},
      spectators: [],
      shuttle: {
        x: 200,
        y: 220,
        z: 35,
        vx: 0,
        vy: 0,
        vz: 0,
        speedKmH: 0,
        rotation: 0,
        lastHitBy: null,
        lastHitTeam: null,
        isSmash: false,
        state: 'service',
      },
    };
    rooms.set(code, room);
  }
  return room;
}

function broadcastRoom(room: ServerRoom, payload: object) {
  const msg = JSON.stringify(payload);
  Object.values(room.players).forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  });
  room.spectators.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: ServerRoom | null = null;
  let mySlot: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'join_room') {
        const code = (data.roomCode || 'GLOBAL').toUpperCase();
        const mode = data.mode || '1v1';
        currentRoom = getOrCreateRoom(code, mode);

        // Assign slot
        const requestedSlot = data.slot;
        const availableSlots = mode === '1v1' ? ['red_1', 'blue_1'] : ['red_1', 'red_2', 'blue_1', 'blue_2'];
        
        let assignedSlot = requestedSlot;
        if (!assignedSlot || currentRoom.players[assignedSlot]) {
          assignedSlot = availableSlots.find((s) => !currentRoom!.players[s]) || null;
        }

        if (assignedSlot) {
          mySlot = assignedSlot;
          const isRed = assignedSlot.startsWith('red');
          currentRoom.players[assignedSlot] = {
            id: `p_${Date.now()}`,
            ws,
            slot: assignedSlot,
            team: isRed ? 'red' : 'blue',
            name: data.playerName || `Player ${assignedSlot}`,
            isAi: false,
            x: isRed ? (assignedSlot === 'red_1' ? 240 : 160) : assignedSlot === 'blue_1' ? 160 : 240,
            y: isRed ? (assignedSlot === 'red_1' ? 240 : 120) : assignedSlot === 'blue_1' ? 560 : 680,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            facing: isRed ? 'up' : 'down',
            state: 'idle',
            swingType: null,
            swingProgress: 0,
            stamina: 100,
            stats: { smashes: 0, drops: 0, clears: 0, saves: 0, pointsWon: 0, highestSmashSpeed: 0 },
          };
        } else {
          // Join as spectator
          currentRoom.spectators.push(ws);
        }

        // Fill remaining empty slots with bots if in quick play
        availableSlots.forEach((slot) => {
          if (!currentRoom!.players[slot]) {
            const isRed = slot.startsWith('red');
            currentRoom!.players[slot] = {
              id: `bot_${slot}`,
              slot,
              team: isRed ? 'red' : 'blue',
              name: `Bot (${slot.toUpperCase()})`,
              isAi: true,
              aiDifficulty: 'pro',
              x: isRed ? (slot === 'red_1' ? 240 : 160) : slot === 'blue_1' ? 160 : 240,
              y: isRed ? (slot === 'red_1' ? 240 : 120) : slot === 'blue_1' ? 560 : 680,
              z: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              facing: isRed ? 'up' : 'down',
              state: 'idle',
              swingType: null,
              swingProgress: 0,
              stamina: 100,
              stats: { smashes: 0, drops: 0, clears: 0, saves: 0, pointsWon: 0, highestSmashSpeed: 0 },
            };
          }
        });

        // Broadcast updated room state
        broadcastRoom(currentRoom, {
          type: 'room_state',
          room: {
            ...currentRoom,
            spectatorsCount: currentRoom.spectators.length,
          },
        });
      }

      if (data.type === 'player_input' && currentRoom && mySlot) {
        const player = currentRoom.players[mySlot];
        if (player) {
          player.vx = data.moveX * 4.5;
          player.vy = data.moveY * 4.5;
          if (data.jump && player.z === 0) {
            player.vz = 8.5;
            player.state = 'jumping';
          }
          if (data.swing) {
            player.swingType = data.swing;
            player.swingProgress = 1;
            player.state = 'swinging';
          }
        }
      }

      if (data.type === 'service_start' && currentRoom) {
        currentRoom.status = 'rally';
        const isRed = currentRoom.servingTeam === 'red';
        currentRoom.shuttle = {
          x: 200,
          y: isRed ? 220 : 580,
          z: 35,
          vx: 0,
          vy: isRed ? 7.6 : -7.6,
          vz: 7.2,
          speedKmH: 160,
          rotation: isRed ? 0.3 : -0.3,
          lastHitBy: currentRoom.servingSlot,
          lastHitTeam: currentRoom.servingTeam,
          isSmash: false,
          state: 'in_play',
        };
        broadcastRoom(currentRoom, {
          type: 'service_started',
          shuttle: currentRoom.shuttle,
        });
      }

      if (data.type === 'reaction' && currentRoom) {
        broadcastRoom(currentRoom, {
          type: 'reaction_broadcast',
          sender: data.sender || 'Spectator',
          emoji: data.emoji || '👏',
        });
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      if (mySlot && currentRoom.players[mySlot]) {
        delete currentRoom.players[mySlot];
      }
      currentRoom.spectators = currentRoom.spectators.filter((s) => s !== ws);
      broadcastRoom(currentRoom, {
        type: 'room_state',
        room: currentRoom,
      });
    }
  });
});

// REST Health API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

// Full-stack Vite development middleware setup
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const PORT = process.env.PORT || 3000;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Badminton Arena Server listening on port ${PORT}`);
  });
}

startServer();
