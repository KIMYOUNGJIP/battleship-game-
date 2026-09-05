import { TacticalBoard2D, SHIP_TYPES, GRID_SIZE } from './board2d.js';
import { sound } from './audio.js';
import { BattleshipAI } from './ai.js';
import { net } from './network.js';

class BattleshipApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.board3d = new TacticalBoard2D(this.container);
    this.ai = new BattleshipAI();

    // Game States
    this.mode = 'menu'; // 'menu' | 'placement' | 'battle' | 'gameover'
    this.subMode = 'ai'; // 'ai' | 'online' | 'pass'

    // Placement State
    this.placedShips = new Map(); // id -> { id, name, size, x, y, orientation, cells: [{x, y, hit}] }
    this.selectedShipIndex = 0;
    this.currentOrientation = 'H';

    // Battle State
    this.isYourTurn = false;
    this.playerShots = new Set(); // Set of "x,y"
    this.enemyShots = new Set();
    this.stats = { shots: 0, hits: 0 };

    this.initUI();
    this.initEvents();
    this.checkUrlRoomParam();
  }

  // -------------------------------------------------------------
  // UI Initialization
  // -------------------------------------------------------------
  initUI() {
    // Ship selection buttons in placement tray
    const tray = document.getElementById('placement-ship-buttons');
    tray.innerHTML = '';
    SHIP_TYPES.forEach((ship, idx) => {
      const btn = document.createElement('button');
      btn.className = `ship-select-btn ${idx === 0 ? 'selected' : ''}`;
      btn.id = `ship-btn-${ship.id}`;
      btn.innerHTML = `
        <span style="font-weight: 700;">${ship.name}</span>
        <span style="font-size: 11px; opacity: 0.7;">(${ship.size}칸)</span>
      `;
      btn.onclick = () => this.selectShipForPlacement(idx);
      tray.appendChild(btn);
    });

    // Camera preset buttons
    document.getElementById('btn-cam-overview').onclick = () => this.board3d.setCameraView('overview');
    document.getElementById('btn-cam-target').onclick = () => this.board3d.setCameraView('target');
    document.getElementById('btn-cam-fleet').onclick = () => this.board3d.setCameraView('fleet');

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    soundBtn.onclick = () => {
      const isMuted = sound.toggleMute();
      soundBtn.textContent = isMuted ? '🔇' : '🔊';
      this.showToast(isMuted ? '음소거 활성화' : '소리 활성화');
    };

    // Menu button
    document.getElementById('btn-menu').onclick = () => {
      document.getElementById('modal-menu').classList.remove('hidden');
    };

    // Mode Buttons
    document.getElementById('btn-mode-ai').onclick = () => this.startPlacement('ai');
    document.getElementById('btn-mode-online').onclick = () => this.openOnlineModal();

    // Placement Controls
    document.getElementById('btn-rotate').onclick = () => this.toggleOrientation();
    document.getElementById('btn-random-place').onclick = () => this.autoPlaceShips();
    document.getElementById('btn-reset-place').onclick = () => this.resetPlacement();
    document.getElementById('btn-ready-battle').onclick = () => this.onReadyBattle();

    // Online Modal Controls
    document.getElementById('btn-create-room').onclick = () => this.onlineCreateRoom();
    document.getElementById('btn-join-room').onclick = () => this.onlineJoinRoom();
    document.getElementById('btn-online-back').onclick = () => {
      document.getElementById('modal-online').classList.add('hidden');
      document.getElementById('modal-menu').classList.remove('hidden');
    };
    document.getElementById('btn-copy-link').onclick = () => this.copyInviteLink();
    document.getElementById('btn-cancel-waiting').onclick = () => {
      document.getElementById('online-waiting-view').classList.add('hidden');
      document.getElementById('online-choice-view').classList.remove('hidden');
    };

    // Game Over Buttons
    document.getElementById('btn-rematch').onclick = () => this.onRematch();
    document.getElementById('btn-gameover-menu').onclick = () => {
      document.getElementById('modal-gameover').classList.add('hidden');
      document.getElementById('modal-menu').classList.remove('hidden');
      this.resetToMenu();
    };

    // Emoji reaction buttons
    document.querySelectorAll('.emoji-btn').forEach((btn) => {
      btn.onclick = () => {
        const emoji = btn.getAttribute('data-emoji');
        this.showToast(emoji, false);
        if (this.subMode === 'online') {
          net.sendChat(emoji);
        }
      };
    });
  }

  initEvents() {
    // 3D Board Event Listeners
    this.board3d.onFriendlyCellClick = (cell) => this.handleFriendlyCellClick(cell);
    this.board3d.onEnemyCellClick = (cell) => this.handleEnemyCellClick(cell);
    this.board3d.onRotateRequest = () => this.toggleOrientation();
    this.board3d.onFriendlyHover = (cell) => this.handleFriendlyHover(cell);

    // Network Event Listeners
    net.on('room_created', (data) => {
      document.getElementById('online-choice-view').classList.add('hidden');
      document.getElementById('online-waiting-view').classList.remove('hidden');
      document.getElementById('display-room-code').textContent = data.roomCode;
      this.showToast(`방 개설 완료: [${data.roomCode}]`);
    });

    net.on('room_joined', (data) => {
      document.getElementById('modal-online').classList.add('hidden');
      this.showToast(`방 참가 완료: [${data.roomCode}]`);
      this.startPlacement('online');
    });

    net.on('opponent_joined', () => {
      document.getElementById('modal-online').classList.add('hidden');
      this.showToast('상대방이 참가했습니다! 함선을 배치하세요.');
      this.startPlacement('online');
    });

    net.on('opponent_ready', () => {
      this.showToast('상대방이 함선 배치를 완료하고 대기 중입니다.');
    });

    net.on('battle_start', (data) => {
      this.startOnlineBattle(data);
    });

    net.on('shot_result', (data) => {
      this.handleOnlineShotResult(data);
    });

    net.on('chat', (data) => {
      this.showToast(`상대방: ${data.text}`);
      sound.playSonar();
    });

    net.on('rematch_start', () => {
      document.getElementById('modal-gameover').classList.add('hidden');
      this.showToast('재경기가 시작됩니다! 함선을 다시 배치하세요.');
      this.startPlacement('online');
    });

    net.on('opponent_disconnected', () => {
      this.showToast('상대방과의 연결이 끊어졌습니다.', true);
      setTimeout(() => {
        this.resetToMenu();
        document.getElementById('modal-menu').classList.remove('hidden');
      }, 2500);
    });

    net.on('error', (data) => {
      this.showToast(data.message, true);
    });
  }

  checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      document.getElementById('modal-menu').classList.add('hidden');
      document.getElementById('modal-online').classList.remove('hidden');
      document.getElementById('input-room-code').value = room.toUpperCase();
      this.onlineJoinRoom();
    }
  }

  // -------------------------------------------------------------
  // Mode Selection & Placement Flow
  // -------------------------------------------------------------
  startPlacement(subMode) {
    this.subMode = subMode;
    this.mode = 'placement';

    // Hide modals
    document.getElementById('modal-menu').classList.add('hidden');
    document.getElementById('modal-online').classList.add('hidden');
    document.getElementById('modal-gameover').classList.add('hidden');
    document.getElementById('battle-fleets').classList.add('hidden');
    document.getElementById('turn-indicator').classList.add('hidden');
    document.getElementById('chat-bar').classList.add('hidden');

    // Show placement UI
    document.getElementById('placement-bar').classList.remove('hidden');

    // Reset boards and markers
    this.board3d.clearMarkers();
    this.board3d.clearFriendlyShips();
    this.placedShips.clear();
    this.selectedShipIndex = 0;
    this.currentOrientation = 'H';
    this.updatePlacementButtons();
    this.board3d.setCameraView('fleet');

    // Set 3D placement ghost
    const currentShip = SHIP_TYPES[this.selectedShipIndex];
    this.board3d.setPlacementMode(true, currentShip, this.currentOrientation);

    this.showToast('함선을 배치하세요 (R키 또는 우클릭으로 회전)');
  }

  selectShipForPlacement(index) {
    this.selectedShipIndex = index;
    const ship = SHIP_TYPES[index];
    this.updatePlacementButtons();
    this.board3d.setPlacementMode(true, ship, this.currentOrientation);
  }

  toggleOrientation() {
    this.currentOrientation = this.currentOrientation === 'H' ? 'V' : 'H';
    const btn = document.getElementById('btn-rotate');
    btn.textContent = `🔄 회전 (${this.currentOrientation === 'H' ? '가로' : '세로'})`;

    const ship = SHIP_TYPES[this.selectedShipIndex];
    this.board3d.setPlacementMode(true, ship, this.currentOrientation);
    if (this.board3d.hoverCell) {
      this.handleFriendlyHover(this.board3d.hoverCell);
    }
  }

  handleFriendlyHover(cell) {
    if (this.mode !== 'placement') return;
    const ship = SHIP_TYPES[this.selectedShipIndex];
    if (!ship || this.placedShips.has(ship.id)) return;

    const isValid = this.isValidPlacement(ship, cell.x, cell.y, this.currentOrientation);
    this.board3d.updateGhostPlacement(cell, isValid);
  }

  handleFriendlyCellClick(cell) {
    if (this.mode !== 'placement') return;
    const ship = SHIP_TYPES[this.selectedShipIndex];
    if (!ship) return;

    if (!this.isValidPlacement(ship, cell.x, cell.y, this.currentOrientation)) {
      this.showToast('이곳에는 배치할 수 없습니다 (충돌 또는 범위 초과)', true);
      return;
    }

    // Place ship
    const cells = [];
    const isH = this.currentOrientation === 'H';
    for (let i = 0; i < ship.size; i++) {
      cells.push({
        x: isH ? cell.x + i : cell.x,
        y: isH ? cell.y : cell.y + i,
        hit: false,
      });
    }

    const shipData = {
      id: ship.id,
      name: ship.name,
      size: ship.size,
      x: cell.x,
      y: cell.y,
      orientation: this.currentOrientation,
      cells,
    };

    this.placedShips.set(ship.id, shipData);
    this.board3d.placeFriendlyShip(shipData);

    // Select next unplaced ship
    const nextUnplaced = SHIP_TYPES.findIndex((s) => !this.placedShips.has(s.id));
    if (nextUnplaced !== -1) {
      this.selectShipForPlacement(nextUnplaced);
    } else {
      this.board3d.setPlacementMode(false);
    }

    this.updatePlacementButtons();
  }

  isValidPlacement(ship, x, y, orientation, currentMap = this.placedShips) {
    const isH = orientation === 'H';
    const size = ship.size;

    // Check bounds
    if (isH) {
      if (x < 0 || x + size > GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    } else {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y + size > GRID_SIZE) return false;
    }

    // Check overlaps with other ships
    for (const [existingId, placed] of currentMap.entries()) {
      if (existingId === ship.id) continue;
      for (let i = 0; i < size; i++) {
        const cx = isH ? x + i : x;
        const cy = isH ? y : y + i;
        if (placed.cells.some((c) => c.x === cx && c.y === cy)) {
          return false;
        }
      }
    }

    return true;
  }

  autoPlaceShips() {
    this.resetPlacement();
    const fleet = this.ai.generateFleet();

    fleet.forEach((shipData) => {
      this.placedShips.set(shipData.id, shipData);
      this.board3d.placeFriendlyShip(shipData);
    });

    this.board3d.setPlacementMode(false);
    this.updatePlacementButtons();
    this.showToast('함선이 무작위로 자동 배치되었습니다.');
  }

  resetPlacement() {
    this.placedShips.clear();
    this.board3d.clearFriendlyShips();
    this.selectShipForPlacement(0);
    this.updatePlacementButtons();
  }

  updatePlacementButtons() {
    SHIP_TYPES.forEach((ship, idx) => {
      const btn = document.getElementById(`ship-btn-${ship.id}`);
      if (!btn) return;

      const isPlaced = this.placedShips.has(ship.id);
      btn.classList.toggle('placed', isPlaced);
      btn.classList.toggle('selected', idx === this.selectedShipIndex && !isPlaced);
    });

    const readyBtn = document.getElementById('btn-ready-battle');
    const allPlaced = this.placedShips.size === SHIP_TYPES.length;
    readyBtn.disabled = !allPlaced;
  }

  onReadyBattle() {
    if (this.placedShips.size !== SHIP_TYPES.length) return;

    document.getElementById('placement-bar').classList.add('hidden');
    this.board3d.setPlacementMode(false);

    if (this.subMode === 'ai') {
      this.startAiBattle();
    } else if (this.subMode === 'online') {
      const fleetArray = Array.from(this.placedShips.values());
      net.sendFleetReady(fleetArray);
      this.showToast('배치 완료! 상대방의 준비를 기다립니다...');
    }
  }

  // -------------------------------------------------------------
  // AI Single Player Battle
  // -------------------------------------------------------------
  startAiBattle() {
    this.mode = 'battle';
    this.isYourTurn = true;
    this.playerShots.clear();
    this.enemyShots.clear();
    this.stats = { shots: 0, hits: 0 };

    // AI fleet generation
    this.ai.reset();
    this.aiFleet = this.ai.generateFleet();

    // Setup HUD
    this.setupBattleHUD();
    this.updateTurnHUD(true);
    this.board3d.isAttackEnabled = true;
    this.board3d.setCameraView('overview');

    sound.playSonar();
    this.showToast('전투 개시! 적 해역을 클릭하여 포격하세요.');
  }

  handleEnemyCellClick(cell) {
    if (this.mode !== 'battle' || !this.isYourTurn) return;

    const key = `${cell.x},${cell.y}`;
    if (this.playerShots.has(key)) {
      this.showToast('이미 포격한 좌표입니다.', true);
      return;
    }

    this.playerShots.add(key);
    this.stats.shots++;

    if (this.subMode === 'online') {
      // Fire via network
      this.isYourTurn = false;
      this.board3d.isAttackEnabled = false;
      net.fire(cell.x, cell.y);
      return;
    }

    if (this.subMode === 'ai') {
      this.executeAiPlayerShot(cell);
    }
  }

  executeAiPlayerShot(cell) {
    this.isYourTurn = false;
    this.board3d.isAttackEnabled = false;
    this.updateTurnHUD(false);

    // Animate projectile from friendly grid center to target enemy cell
    const startPos = this.board3d.gridToWorld('friendly', 4, 4);
    startPos.y += 1.5;
    const endPos = this.board3d.gridToWorld('enemy', cell.x, cell.y);

    sound.playFire();

    this.board3d.fx.launchProjectile(startPos, endPos, () => {
      // Check hit against AI Fleet
      let hit = false;
      let sunk = false;
      let sunkShip = null;

      for (const ship of this.aiFleet) {
        const matched = ship.cells.find((c) => c.x === cell.x && c.y === cell.y);
        if (matched) {
          hit = true;
          matched.hit = true;
          this.stats.hits++;

          if (ship.cells.every((c) => c.hit)) {
            sunk = true;
            sunkShip = ship;
          }
          break;
        }
      }

      // Add 3D peg and FX
      this.board3d.addMarker('enemy', cell.x, cell.y, hit);

      if (hit) {
        sound.playExplosion();
        this.board3d.fx.createExplosion(endPos);

        if (sunk) {
          sound.playSunk();
          this.board3d.revealEnemySunkShip(sunkShip);
          this.showToast(`적 ${sunkShip.name} 격침!`);
        } else {
          this.showToast('명중 (DIRECT HIT)!');
        }
      } else {
        sound.playSplash();
        this.board3d.fx.createSplash(endPos);
        this.showToast('빗맞힘 (SPLASH)');
      }

      this.updateBattleFleetUI();

      // Check Victory
      const allAiSunk = this.aiFleet.every((s) => s.cells.every((c) => c.hit));
      if (allAiSunk) {
        setTimeout(() => this.showGameOver(true), 1200);
        return;
      }

      // Trigger AI Turn after delay
      setTimeout(() => this.executeAiTurn(), 1100);
    });
  }

  executeAiTurn() {
    if (this.mode !== 'battle') return;

    sound.playSonar();
    this.showToast('적군이 목표를 조준하고 있습니다...');

    setTimeout(() => {
      const shot = this.ai.getNextShot();
      if (!shot) return;

      const startPos = this.board3d.gridToWorld('enemy', 4, 4);
      startPos.y += 1.5;
      const endPos = this.board3d.gridToWorld('friendly', shot.x, shot.y);

      sound.playFire();

      this.board3d.fx.launchProjectile(startPos, endPos, () => {
        let hit = false;
        let sunk = false;
        let sunkShip = null;

        for (const ship of this.placedShips.values()) {
          const matched = ship.cells.find((c) => c.x === shot.x && c.y === shot.y);
          if (matched) {
            hit = true;
            matched.hit = true;

            if (ship.cells.every((c) => c.hit)) {
              sunk = true;
              sunkShip = ship;
            }
            break;
          }
        }

        this.ai.registerShotResult(shot.x, shot.y, hit, sunk, sunkShip);
        this.board3d.addMarker('friendly', shot.x, shot.y, hit);

        if (hit) {
          sound.playExplosion();
          this.board3d.fx.createExplosion(endPos);

          if (sunk) {
            sound.playSunk();
            this.showToast(`아군 ${sunkShip.name} 격침!`, true);
          } else {
            this.showToast('아군 함선 피격!', true);
          }
        } else {
          sound.playSplash();
          this.board3d.fx.createSplash(endPos);
          this.showToast('적 포격 빗맞힘');
        }

        this.updateBattleFleetUI();

        // Check Defeat
        const allFriendlySunk = Array.from(this.placedShips.values()).every((s) =>
          s.cells.every((c) => c.hit)
        );

        if (allFriendlySunk) {
          setTimeout(() => this.showGameOver(false), 1200);
          return;
        }

        // Switch back to player's turn
        this.isYourTurn = true;
        this.board3d.isAttackEnabled = true;
        this.updateTurnHUD(true);
      });
    }, 900);
  }

  // -------------------------------------------------------------
  // Online Multiplayer Handlers
  // -------------------------------------------------------------
  openOnlineModal() {
    document.getElementById('modal-menu').classList.add('hidden');
    document.getElementById('modal-online').classList.remove('hidden');
    document.getElementById('online-choice-view').classList.remove('hidden');
    document.getElementById('online-waiting-view').classList.add('hidden');
  }

  async onlineCreateRoom() {
    try {
      await net.connect();
      net.createRoom();
    } catch (err) {
      this.showToast('서버 연결에 실패했습니다. server.js가 실행 중인지 확인하세요.', true);
    }
  }

  async onlineJoinRoom() {
    const code = document.getElementById('input-room-code').value.trim();
    if (!code) {
      this.showToast('방 코드를 입력해주세요.', true);
      return;
    }
    try {
      await net.connect();
      net.joinRoom(code);
    } catch (err) {
      this.showToast('서버 연결에 실패했습니다.', true);
    }
  }

  copyInviteLink() {
    const code = document.getElementById('display-room-code').textContent;
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('초대 링크가 클립보드에 복사되었습니다!');
    }).catch(() => {
      this.showToast(`초대 코드: ${code}`);
    });
  }

  startOnlineBattle(data) {
    this.mode = 'battle';
    this.isYourTurn = data.yourTurn;
    this.playerShots.clear();
    this.stats = { shots: 0, hits: 0 };

    this.setupBattleHUD();
    this.updateTurnHUD(this.isYourTurn);
    this.board3d.isAttackEnabled = this.isYourTurn;
    this.board3d.setCameraView('overview');

    document.getElementById('chat-bar').classList.remove('hidden');
    sound.playSonar();
    this.showToast(this.isYourTurn ? '전투 시작! 당신의 선공입니다.' : '전투 시작! 상대방의 선공입니다.');
  }

  handleOnlineShotResult(data) {
    const { x, y, hit, sunk, sunkShip, isYourShot, gameOver, winnerIndex, yourTurn } = data;

    const startPos = this.board3d.gridToWorld(isYourShot ? 'friendly' : 'enemy', 4, 4);
    startPos.y += 1.5;
    const endPos = this.board3d.gridToWorld(isYourShot ? 'enemy' : 'friendly', x, y);

    sound.playFire();

    this.board3d.fx.launchProjectile(startPos, endPos, () => {
      this.board3d.addMarker(isYourShot ? 'enemy' : 'friendly', x, y, hit);

      if (hit) {
        sound.playExplosion();
        this.board3d.fx.createExplosion(endPos);

        if (isYourShot) {
          this.stats.hits++;
          if (sunk) {
            sound.playSunk();
            this.board3d.revealEnemySunkShip(sunkShip);
            this.showToast(`적 ${sunkShip.name} 격침!`);
          } else {
            this.showToast('명중 (DIRECT HIT)!');
          }
        } else {
          // My ship hit
          if (sunk) {
            sound.playSunk();
            this.showToast(`아군 ${sunkShip.name} 격침!`, true);
          } else {
            this.showToast('아군 함선 피격!', true);
          }
          // Mark cell in placedShips
          for (const ship of this.placedShips.values()) {
            const c = ship.cells.find((cell) => cell.x === x && cell.y === y);
            if (c) c.hit = true;
          }
        }
      } else {
        sound.playSplash();
        this.board3d.fx.createSplash(endPos);
        this.showToast(isYourShot ? '빗맞힘 (SPLASH)' : '적 포격 빗맞힘');
      }

      this.updateBattleFleetUI();

      if (gameOver) {
        const isWinner = winnerIndex === net.playerIndex;
        setTimeout(() => this.showGameOver(isWinner), 1200);
        return;
      }

      // Update turn
      this.isYourTurn = yourTurn;
      this.board3d.isAttackEnabled = yourTurn;
      this.updateTurnHUD(yourTurn);
      if (yourTurn) {
        sound.playSonar();
      }
    });
  }

  // -------------------------------------------------------------
  // HUD & Stats
  // -------------------------------------------------------------
  setupBattleHUD() {
    document.getElementById('battle-fleets').classList.remove('hidden');
    document.getElementById('turn-indicator').classList.remove('hidden');

    this.updateBattleFleetUI();
  }

  updateTurnHUD(yourTurn) {
    const badge = document.getElementById('turn-indicator');
    const text = document.getElementById('turn-text');

    if (yourTurn) {
      badge.className = 'turn-badge your-turn';
      text.textContent = '당신의 차례 (YOUR TURN)';
    } else {
      badge.className = 'turn-badge enemy-turn';
      text.textContent = '상대방 차례 (ENEMY TURN)';
    }
  }

  updateBattleFleetUI() {
    const friendlyList = document.getElementById('friendly-ship-list');
    friendlyList.innerHTML = '';
    let friendlyAlive = 0;

    for (const ship of this.placedShips.values()) {
      const isSunk = ship.cells.every((c) => c.hit);
      if (!isSunk) friendlyAlive++;

      const item = document.createElement('div');
      item.className = `ship-item ${isSunk ? 'sunk' : ''}`;
      item.innerHTML = `
        <span>${ship.name}</span>
        <div class="ship-cells">
          ${ship.cells.map((c) => `<div class="cell-dot ${c.hit ? 'hit' : ''}"></div>`).join('')}
        </div>
      `;
      friendlyList.appendChild(item);
    }
    document.getElementById('friendly-alive-count').textContent = `${friendlyAlive} / 5 생존`;

    // Enemy fleet
    const enemyList = document.getElementById('enemy-ship-list');
    enemyList.innerHTML = '';
    let enemyAlive = 5;

    // In AI mode, use aiFleet, in online mode display confirmed sunk
    SHIP_TYPES.forEach((def) => {
      let isSunk = false;
      let hitCount = 0;

      if (this.subMode === 'ai' && this.aiFleet) {
        const found = this.aiFleet.find((s) => s.id === def.id);
        if (found) {
          isSunk = found.cells.every((c) => c.hit);
          hitCount = found.cells.filter((c) => c.hit).length;
        }
      }

      if (isSunk) enemyAlive--;

      const item = document.createElement('div');
      item.className = `ship-item enemy ${isSunk ? 'sunk' : ''}`;
      item.innerHTML = `
        <span>${def.name}</span>
        <div class="ship-cells">
          ${Array.from({ length: def.size })
            .map((_, i) => `<div class="cell-dot ${i < hitCount ? 'hit' : ''}"></div>`)
            .join('')}
        </div>
      `;
      enemyList.appendChild(item);
    });

    document.getElementById('enemy-alive-count').textContent = `${enemyAlive} / 5 생존`;
  }

  // -------------------------------------------------------------
  // Game Over & Results
  // -------------------------------------------------------------
  showGameOver(isWin) {
    this.mode = 'gameover';
    this.board3d.isAttackEnabled = false;

    const modal = document.getElementById('modal-gameover');
    const title = document.getElementById('gameover-title');
    const desc = document.getElementById('gameover-desc');

    if (isWin) {
      sound.playVictory();
      title.textContent = 'VICTORY';
      title.className = 'gameover-banner win';
      desc.textContent = '축하합니다! 적 함대를 전멸시키고 바다의 제해권을 장악했습니다!';
    } else {
      sound.playDefeat();
      title.textContent = 'DEFEAT';
      title.className = 'gameover-banner lose';
      desc.textContent = '아군 함대가 모두 격침되었습니다. 작전에 실패했습니다.';
    }

    document.getElementById('stat-shots').textContent = this.stats.shots;
    document.getElementById('stat-hits').textContent = this.stats.hits;
    const acc = this.stats.shots > 0 ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0;
    document.getElementById('stat-acc').textContent = `${acc}%`;

    modal.classList.remove('hidden');
  }

  onRematch() {
    document.getElementById('modal-gameover').classList.add('hidden');
    if (this.subMode === 'online') {
      net.sendRematch();
    } else {
      this.startPlacement(this.subMode);
    }
  }

  resetToMenu() {
    this.mode = 'menu';
    this.board3d.clearMarkers();
    this.board3d.clearFriendlyShips();
    this.board3d.setPlacementMode(false);
    this.board3d.isAttackEnabled = false;

    document.getElementById('placement-bar').classList.add('hidden');
    document.getElementById('battle-fleets').classList.add('hidden');
    document.getElementById('turn-indicator').classList.add('hidden');
    document.getElementById('chat-bar').classList.add('hidden');
    this.board3d.setCameraView('overview');
  }

  showToast(text, isAlert = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isAlert ? 'alert' : ''}`;
    toast.textContent = text;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }
}

function initApp() {
  console.log('initApp called! readyState:', document.readyState);
  try {
    if (!window.app) {
      window.app = new BattleshipApp();
      console.log('BattleshipApp instantiated successfully!');
    }
  } catch (err) {
    console.error('Error during BattleshipApp initialization:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
