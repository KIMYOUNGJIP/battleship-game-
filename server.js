import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// Create HTTP static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sendJson(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  let playerIndex = -1;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Invalid WS message:', e);
    }
  });

  function handleMessage(socket, msg) {
    switch (msg.type) {
      case 'create_room': {
        let code = generateRoomCode();
        while (rooms.has(code)) {
          code = generateRoomCode();
        }

        const room = {
          code,
          players: [
            { ws: socket, id: 'host', ready: false, ships: [], shots: [] },
          ],
          turn: 0,
          state: 'waiting',
          createdAt: Date.now(),
        };

        rooms.set(code, room);
        currentRoomCode = code;
        playerIndex = 0;

        sendJson(socket, {
          type: 'room_created',
          roomCode: code,
          playerIndex: 0,
        });
        break;
      }

      case 'join_room': {
        const targetCode = (msg.roomCode || '').toUpperCase().trim();
        const room = rooms.get(targetCode);

        if (!room) {
          sendJson(socket, { type: 'error', message: '존재하지 않는 방 코드입니다.' });
          return;
        }

        if (room.players.length >= 2) {
          sendJson(socket, { type: 'error', message: '방이 이미 가득 찼습니다.' });
          return;
        }

        room.players.push({
          ws: socket,
          id: 'guest',
          ready: false,
          ships: [],
          shots: [],
        });

        currentRoomCode = targetCode;
        playerIndex = 1;
        room.state = 'placement';

        sendJson(socket, {
          type: 'room_joined',
          roomCode: targetCode,
          playerIndex: 1,
        });

        // Notify both players that match has formed and placement phase begins
        sendJson(room.players[0].ws, {
          type: 'opponent_joined',
          roomCode: targetCode,
        });
        break;
      }

      case 'fleet_ready': {
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        const player = room.players[playerIndex];
        if (!player) return;

        player.ships = msg.ships || [];
        player.ready = true;

        const opponentIdx = 1 - playerIndex;
        const opponent = room.players[opponentIdx];

        // Notify opponent that other player is ready
        if (opponent) {
          sendJson(opponent.ws, {
            type: 'opponent_ready',
          });
        }

        // Check if both ready
        if (room.players.length === 2 && room.players[0].ready && room.players[1].ready) {
          room.state = 'battle';
          room.turn = Math.random() < 0.5 ? 0 : 1; // Random first turn

          room.players.forEach((p, idx) => {
            sendJson(p.ws, {
              type: 'battle_start',
              yourTurn: idx === room.turn,
              currentTurn: room.turn,
            });
          });
        }
        break;
      }

      case 'fire': {
        const room = rooms.get(currentRoomCode);
        if (!room || room.state !== 'battle') return;

        if (room.turn !== playerIndex) {
          sendJson(socket, { type: 'error', message: '당신의 차례가 아닙니다!' });
          return;
        }

        const { x, y } = msg;
        const shooter = room.players[playerIndex];
        const targetPlayer = room.players[1 - playerIndex];

        // Check already fired
        if (shooter.shots.some((s) => s.x === x && s.y === y)) {
          sendJson(socket, { type: 'error', message: '이미 포격한 좌표입니다.' });
          return;
        }

        shooter.shots.push({ x, y });

        // Check hit
        let hit = false;
        let sunk = false;
        let sunkShip = null;

        for (const ship of targetPlayer.ships) {
          const matchedCell = ship.cells.find((c) => c.x === x && c.y === y);
          if (matchedCell) {
            hit = true;
            matchedCell.hit = true;

            // Check if entire ship is sunk
            const isAllHit = ship.cells.every((c) => c.hit);
            if (isAllHit) {
              sunk = true;
              sunkShip = {
                name: ship.name,
                cells: ship.cells,
                size: ship.size,
              };
            }
            break;
          }
        }

        // Check if game won
        const allSunk = targetPlayer.ships.every((s) => s.cells.every((c) => c.hit));

        // Switch turn
        room.turn = 1 - room.turn;
        if (allSunk) {
          room.state = 'finished';
        }

        // Broadcast shot result to both players
        room.players.forEach((p, idx) => {
          sendJson(p.ws, {
            type: 'shot_result',
            x,
            y,
            hit,
            sunk,
            sunkShip,
            shooterIndex: playerIndex,
            isYourShot: idx === playerIndex,
            gameOver: allSunk,
            winnerIndex: allSunk ? playerIndex : null,
            nextTurn: room.turn,
            yourTurn: !allSunk && idx === room.turn,
          });
        });
        break;
      }

      case 'chat': {
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        const opponent = room.players[1 - playerIndex];
        if (opponent) {
          sendJson(opponent.ws, {
            type: 'chat',
            sender: playerIndex === 0 ? 'Host' : 'Guest',
            text: String(msg.text || '').slice(0, 100),
          });
        }
        break;
      }

      case 'rematch': {
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        // Reset player states
        room.players.forEach((p) => {
          p.ready = false;
          p.ships = [];
          p.shots = [];
        });
        room.state = 'placement';

        room.players.forEach((p) => {
          sendJson(p.ws, {
            type: 'rematch_start',
          });
        });
        break;
      }
    }
  }

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const opponent = room.players[1 - playerIndex];
        if (opponent) {
          sendJson(opponent.ws, {
            type: 'opponent_disconnected',
            message: '상대방의 연결이 끊어졌습니다.',
          });
        }
        rooms.delete(currentRoomCode);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚢 3D 배틀쉽 서버가 시작되었습니다!`);
  console.log(`🌐 접속 주소: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
