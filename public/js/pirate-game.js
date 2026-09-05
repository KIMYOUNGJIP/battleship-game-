// PIRATE MATH BATTLESHIP RPG CONTROLLER
// Includes Interactive Ship Placement (H/V rotation, Ghost preview, Auto-place, Reset)
// & 1v1 Educational Naval Combat vs Smart AI

import { MathQuizEngine } from './math-quiz.js';
import { sound } from './audio.js';

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8];
const GRID_SIZE = 8;

// Ship configurations: 4 ships, total 12 HP
const SHIP_CONFIGS = [
  { id: 'galleon', name: '해적 대형 갤리온', size: 4, icon: '🏴‍☠️' },
  { id: 'frigate', name: '붉은 돛 프리깃', size: 3, icon: '⛵' },
  { id: 'brig', name: '돌격 브리건틴', size: 3, icon: '🚢' },
  { id: 'sloop', name: '해적 쾌속 슬루프', size: 2, icon: '🚤' }
];

export class PirateBattleGame {
  constructor() {
    this.quizEngine = new MathQuizEngine();

    this.playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.enemyGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    this.playerShips = [];
    this.enemyShips = [];

    // Placement Mode State
    this.gamePhase = 'PLACEMENT'; // 'PLACEMENT' | 'BATTLE'
    this.selectedShipId = 'galleon';
    this.placementOrientation = 'H'; // 'H' (Horizontal) | 'V' (Vertical)
    this.placedPlayerShips = new Map(); // shipId -> shipData
    this.hoverCell = null;

    this.playerHp = 12;
    this.enemyHp = 12;
    this.maxHp = 12;

    this.coins = 0;
    this.stars = 0;
    this.combo = 0;
    this.stage = 0; // 0: 항구 외곽, 1: 산호 해협, 2: 폭풍 해역, 3: 검은 해골 요새
    this.enemyShipsSunk = 0;

    this.state = 'PLACEMENT'; // 'PLACEMENT', 'QUESTION', 'READY_TO_FIRE', 'ANIMATING', 'AI_TURN', 'GAME_OVER'
    this.currentQuestion = null;

    // AI targeting memory
    this.aiHits = [];
    this.aiTargetsQueue = [];
    this.aiFiredCells = new Set();

    this.initDOMElements();
    this.initProjectileCanvas();
    this.bindEvents();
    this.startNewGame();
  }

  initDOMElements() {
    this.el = {
      playerGrid: document.getElementById('player-grid'),
      enemyGrid: document.getElementById('enemy-grid'),
      playerHpFill: document.getElementById('player-hp-fill'),
      enemyHpFill: document.getElementById('enemy-hp-fill'),
      playerHpText: document.getElementById('player-hp-text'),
      enemyHpText: document.getElementById('enemy-hp-text'),
      coinsText: document.getElementById('coins-count'),
      starsText: document.getElementById('stars-count'),
      turnBadge: document.getElementById('turn-badge'),
      stageTabs: document.querySelectorAll('.stage-tab'),
      comboBadge: document.getElementById('combo-badge'),
      comboText: document.getElementById('combo-text'),
      quizCategory: document.getElementById('quiz-category'),
      quizQuestion: document.getElementById('quiz-question'),
      quizOptions: document.getElementById('quiz-options'),
      statusFeedback: document.getElementById('status-feedback'),
      btnHint: document.getElementById('btn-hint'),
      hintModal: document.getElementById('hint-modal'),
      hintModalBody: document.getElementById('hint-modal-body'),
      btnModalClose: document.getElementById('btn-modal-close'),
      toastBanner: document.getElementById('toast-banner'),
      projectileCanvas: document.getElementById('projectile-canvas'),
      btnFullscreen: document.getElementById('btn-fullscreen'),

      // Placement elements
      placementPanel: document.getElementById('placement-panel'),
      mathQuizPanel: document.getElementById('math-quiz-panel'),
      placementShipTray: document.getElementById('placement-ship-tray'),
      placementProgressText: document.getElementById('placement-progress-text'),
      btnRotateShip: document.getElementById('btn-rotate-ship'),
      orientationLabel: document.getElementById('orientation-label'),
      btnRandomPlacement: document.getElementById('btn-random-placement'),
      btnResetPlacement: document.getElementById('btn-reset-placement'),
      btnStartBattle: document.getElementById('btn-start-battle')
    };
  }

  initProjectileCanvas() {
    this.canvas = this.el.projectileCanvas;
    this.ctx = this.canvas.getContext('2d');
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  bindEvents() {
    // Hint Modal Events
    this.el.btnHint.addEventListener('click', () => this.showHintModal());
    this.el.btnModalClose.addEventListener('click', () => this.hideHintModal());

    // Fullscreen Event
    if (this.el.btnFullscreen) {
      this.el.btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Modal overlay click outside to close
    this.el.hintModal.addEventListener('click', (e) => {
      if (e.target === this.el.hintModal) {
        this.hideHintModal();
      }
    });

    // Placement UI Events
    this.el.btnRotateShip.addEventListener('click', () => this.toggleOrientation());
    this.el.btnRandomPlacement.addEventListener('click', () => this.autoPlacePlayerFleet());
    this.el.btnResetPlacement.addEventListener('click', () => this.resetPlayerFleet());
    this.el.btnStartBattle.addEventListener('click', () => this.startBattle());

    // Global Key Listener ('R' key to rotate during placement)
    window.addEventListener('keydown', (e) => {
      if (this.gamePhase === 'PLACEMENT' && (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ')) {
        this.toggleOrientation();
      }
    });

    // Prevent default context menu on player grid and use right click to rotate
    this.el.playerGrid.addEventListener('contextmenu', (e) => {
      if (this.gamePhase === 'PLACEMENT') {
        e.preventDefault();
        this.toggleOrientation();
      }
    });
  }

  startNewGame() {
    this.gamePhase = 'PLACEMENT';
    this.state = 'PLACEMENT';
    this.playerHp = this.maxHp;
    this.enemyHp = this.maxHp;
    this.stage = 0;
    this.enemyShipsSunk = 0;
    this.combo = 0;
    this.aiHits = [];
    this.aiTargetsQueue = [];
    this.aiFiredCells.clear();

    this.playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.enemyGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.playerShips = [];
    this.enemyShips = [];
    this.placedPlayerShips.clear();
    this.selectedShipId = 'galleon';
    this.placementOrientation = 'H';

    // Show Placement UI, Hide Math Quiz
    this.el.placementPanel.classList.remove('hidden');
    this.el.mathQuizPanel.classList.add('hidden');
    this.el.btnStartBattle.disabled = true;

    this.renderPlacementTray();
    this.renderGrids();
    this.updateStatsUI();
    this.updateStageUI();
    this.setTurnBadge('placement');

    this.showToast('⚓ 아군 함선 4척을 우리 해역에 배치하세요! (R키 또는 우클릭으로 회전)');
  }

  // =========================================================================
  // SHIP PLACEMENT SYSTEM
  // =========================================================================

  renderPlacementTray() {
    this.el.placementShipTray.innerHTML = '';
    SHIP_CONFIGS.forEach((conf) => {
      const isPlaced = this.placedPlayerShips.has(conf.id);
      const isSelected = this.selectedShipId === conf.id;

      const card = document.createElement('div');
      card.className = `ship-tray-card ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`;
      card.dataset.shipId = conf.id;

      // Dots visualization
      let dotsHtml = '';
      for (let i = 0; i < conf.size; i++) {
        dotsHtml += '<div class="ship-cell-dot"></div>';
      }

      card.innerHTML = `
        <div class="ship-card-left">
          <span class="ship-card-icon">${conf.icon}</span>
          <div>
            <div class="ship-card-title">${conf.name} (${conf.size}칸)</div>
            <div class="ship-card-cells">${dotsHtml}</div>
          </div>
        </div>
        <div class="ship-card-status">${isPlaced ? '✓ 배치 완료' : (isSelected ? '배치 중' : '선택')}</div>
      `;

      card.addEventListener('click', () => {
        this.selectShipForPlacement(conf.id);
      });

      this.el.placementShipTray.appendChild(card);
    });

    const placedCount = this.placedPlayerShips.size;
    this.el.placementProgressText.textContent = `함선 ${placedCount}/4 배치`;
    this.el.btnStartBattle.disabled = placedCount < 4;
  }

  selectShipForPlacement(shipId) {
    this.selectedShipId = shipId;
    this.renderPlacementTray();
    if (this.hoverCell) {
      this.handlePlayerCellHover(this.hoverCell.r, this.hoverCell.c);
    }
  }

  toggleOrientation() {
    this.placementOrientation = this.placementOrientation === 'H' ? 'V' : 'H';
    this.el.orientationLabel.textContent = this.placementOrientation === 'H' ? '가로 (H)' : '세로 (V)';
    sound.playClick();
    if (this.hoverCell) {
      this.handlePlayerCellHover(this.hoverCell.r, this.hoverCell.c);
    }
  }

  isValidPlacement(ship, r, c, orientation, grid = this.playerGrid) {
    const isH = orientation === 'H';
    // Boundary check
    if (isH && c + ship.size > GRID_SIZE) return false;
    if (!isH && r + ship.size > GRID_SIZE) return false;

    // Collision check
    for (let s = 0; s < ship.size; s++) {
      const curR = isH ? r : r + s;
      const curC = isH ? c + s : c;
      if (grid[curR][curC] !== null) {
        // If it's the current ship being moved, that's okay, but here we place fresh
        return false;
      }
    }
    return true;
  }

  handlePlayerCellHover(r, c) {
    if (this.gamePhase !== 'PLACEMENT') return;
    this.hoverCell = { r, c };
    this.clearGhostCells();

    const ship = SHIP_CONFIGS.find(s => s.id === this.selectedShipId);
    if (!ship || this.placedPlayerShips.has(ship.id)) return;

    const isValid = this.isValidPlacement(ship, r, c, this.placementOrientation);
    const isH = this.placementOrientation === 'H';

    for (let s = 0; s < ship.size; s++) {
      const curR = isH ? r : r + s;
      const curC = isH ? c + s : c;
      if (curR < GRID_SIZE && curC < GRID_SIZE) {
        const cellEl = document.getElementById(`player-cell-${curR}-${curC}`);
        if (cellEl) {
          cellEl.classList.add(isValid ? 'ghost-valid' : 'ghost-invalid');
        }
      }
    }
  }

  clearGhostCells() {
    const ghosts = this.el.playerGrid.querySelectorAll('.ghost-valid, .ghost-invalid');
    ghosts.forEach(el => el.classList.remove('ghost-valid', 'ghost-invalid'));
  }

  handlePlayerCellClick(r, c) {
    if (this.gamePhase !== 'PLACEMENT') return;

    const ship = SHIP_CONFIGS.find(s => s.id === this.selectedShipId);
    if (!ship) return;

    if (this.placedPlayerShips.has(ship.id)) {
      this.showToast(`[${ship.name}]은(는) 이미 배치되었습니다. 다른 함선을 선택하거나 초기화하세요.`);
      return;
    }

    const isValid = this.isValidPlacement(ship, r, c, this.placementOrientation);
    if (!isValid) {
      sound.playWrong();
      this.showToast('이곳에는 배치할 수 없습니다! (바다 경계 초과 또는 다른 함선과 겹침)');
      return;
    }

    // Place ship
    const isH = this.placementOrientation === 'H';
    const shipCoords = [];
    for (let s = 0; s < ship.size; s++) {
      const curR = isH ? r : r + s;
      const curC = isH ? c + s : c;
      this.playerGrid[curR][curC] = {
        shipId: ship.id,
        shipName: ship.name,
        index: s,
        size: ship.size,
        isHorizontal: isH
      };
      shipCoords.push({ x: curC, y: curR, hit: false });
    }

    const shipInstance = {
      ...ship,
      coords: shipCoords,
      hits: 0,
      sunk: false,
      isHorizontal: isH
    };

    this.playerShips.push(shipInstance);
    this.placedPlayerShips.set(ship.id, shipInstance);
    sound.playLoadCannon();

    // Re-render player grid
    this.renderGrids();

    // Pick next unplaced ship
    const nextShip = SHIP_CONFIGS.find(s => !this.placedPlayerShips.has(s.id));
    if (nextShip) {
      this.selectedShipId = nextShip.id;
    }

    this.renderPlacementTray();

    if (this.placedPlayerShips.size === 4) {
      sound.playCorrect();
      this.showToast('🎉 모든 함선 배치 완료! 이제 [함대 출격! 전투 시작] 버튼을 누르세요!');
    }
  }

  autoPlacePlayerFleet() {
    this.resetPlayerFleet(false);

    for (const conf of SHIP_CONFIGS) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 300) {
        attempts++;
        const isH = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (isH ? (GRID_SIZE - conf.size + 1) : GRID_SIZE));
        const y = Math.floor(Math.random() * (isH ? GRID_SIZE : (GRID_SIZE - conf.size + 1)));

        if (this.isValidPlacement(conf, y, x, isH ? 'H' : 'V')) {
          const shipCoords = [];
          for (let s = 0; s < conf.size; s++) {
            const cx = isH ? x + s : x;
            const cy = isH ? y : y + s;
            this.playerGrid[cy][cx] = {
              shipId: conf.id,
              shipName: conf.name,
              index: s,
              size: conf.size,
              isHorizontal: isH
            };
            shipCoords.push({ x: cx, y: cy, hit: false });
          }
          const instance = {
            ...conf,
            coords: shipCoords,
            hits: 0,
            sunk: false,
            isHorizontal: isH
          };
          this.playerShips.push(instance);
          this.placedPlayerShips.set(conf.id, instance);
          placed = true;
        }
      }
    }

    sound.playLoadCannon();
    this.renderGrids();
    this.renderPlacementTray();
    this.showToast('🎲 함선 4척 자동 배치 완료! [함대 출격! 전투 시작]을 누르세요.');
  }

  resetPlayerFleet(showFeedback = true) {
    this.playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.playerShips = [];
    this.placedPlayerShips.clear();
    this.selectedShipId = 'galleon';
    this.clearGhostCells();
    this.renderGrids();
    this.renderPlacementTray();
    if (showFeedback) {
      sound.playClick();
      this.showToast('함선 배치가 초기화되었습니다. 다시 원하는 위치에 배치하세요.');
    }
  }

  startBattle() {
    if (this.placedPlayerShips.size < 4) {
      this.showToast('모든 함선(4척)을 배치해야 전투를 시작할 수 있습니다!');
      return;
    }

    this.gamePhase = 'BATTLE';
    this.state = 'QUESTION';

    // Transition panels
    this.el.placementPanel.classList.add('hidden');
    this.el.mathQuizPanel.classList.remove('hidden');

    // Place hidden enemy fleet
    this.placeFleet('enemy');

    this.clearGhostCells();
    this.renderGrids();
    this.updateStatsUI();
    this.updateStageUI();

    sound.playVictory();
    this.showToast('⚓ 함대 출격! 수학 문제를 풀고 적 해역을 공격하세요!');
    this.nextQuestionTurn();
  }

  // =========================================================================
  // ENEMY FLEET PLACEMENT
  // =========================================================================
  placeFleet(owner) {
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    const ships = [];

    for (const conf of SHIP_CONFIGS) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 300) {
        attempts++;
        const isHorizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (isHorizontal ? (GRID_SIZE - conf.size + 1) : GRID_SIZE));
        const y = Math.floor(Math.random() * (isHorizontal ? GRID_SIZE : (GRID_SIZE - conf.size + 1)));

        let canPlace = true;
        for (let s = 0; s < conf.size; s++) {
          const cx = isHorizontal ? x + s : x;
          const cy = isHorizontal ? y : y + s;
          if (grid[cy][cx] !== null) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          const shipCoords = [];
          for (let s = 0; s < conf.size; s++) {
            const cx = isHorizontal ? x + s : x;
            const cy = isHorizontal ? y : y + s;
            grid[cy][cx] = {
              shipId: conf.id,
              shipName: conf.name,
              index: s,
              size: conf.size,
              isHorizontal
            };
            shipCoords.push({ x: cx, y: cy, hit: false });
          }
          ships.push({
            ...conf,
            coords: shipCoords,
            hits: 0,
            sunk: false,
            isHorizontal
          });
          placed = true;
        }
      }
    }

    if (owner === 'enemy') {
      this.enemyGrid = grid;
      this.enemyShips = ships;
    }
  }

  // =========================================================================
  // GRID RENDERING & INTERACTION
  // =========================================================================
  renderGrids() {
    // Render Player Grid
    this.el.playerGrid.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'sea-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `player-cell-${r}-${c}`;

        const coord = document.createElement('span');
        coord.className = 'coord-label';
        coord.textContent = `${COLS[c]}${ROWS[r]}`;
        cell.appendChild(coord);

        // 함선 위치 시각화 (목조 해적선)
        const shipInfo = this.playerGrid[r][c];
        if (shipInfo) {
          cell.classList.add('ship-cell');
          const isH = shipInfo.isHorizontal;
          if (shipInfo.index === 0) {
            cell.classList.add(isH ? 'ship-cap-bow-h' : 'ship-cap-bow-v');
          } else if (shipInfo.index === shipInfo.size - 1) {
            cell.classList.add(isH ? 'ship-cap-stern-h' : 'ship-cap-stern-v');
          }

          const segment = document.createElement('div');
          segment.className = 'ship-segment';
          if (shipInfo.index === 0) {
            segment.innerHTML = '<span class="ship-sail">🏴‍☠️</span>';
          } else if (shipInfo.index === 1) {
            segment.innerHTML = '<span class="ship-sail">⛵</span>';
          } else if (shipInfo.index === Math.floor(shipInfo.size / 2)) {
            segment.innerHTML = '<span class="ship-sail">⚓</span>';
          }
          cell.appendChild(segment);
        }

        // Placement interaction
        cell.addEventListener('mouseenter', () => this.handlePlayerCellHover(r, c));
        cell.addEventListener('mouseleave', () => this.clearGhostCells());
        cell.addEventListener('click', () => this.handlePlayerCellClick(r, c));

        this.el.playerGrid.appendChild(cell);
      }
    }

    // Render Enemy Grid
    this.el.enemyGrid.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'sea-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `enemy-cell-${r}-${c}`;

        const coord = document.createElement('span');
        coord.className = 'coord-label';
        coord.textContent = `${COLS[c]}${ROWS[r]}`;
        cell.appendChild(coord);

        cell.addEventListener('click', () => this.handleEnemyCellClick(r, c));

        this.el.enemyGrid.appendChild(cell);
      }
    }
  }

  // =========================================================================
  // MATH QUIZ & BATTLE LOOP
  // =========================================================================

  nextQuestionTurn() {
    this.state = 'QUESTION';
    this.el.enemyGrid.classList.remove('target-ready');
    this.setTurnBadge('student');

    this.currentQuestion = this.quizEngine.getNextQuestion();
    this.renderQuestionUI(this.currentQuestion);

    this.el.statusFeedback.className = 'status-feedback-box';
    this.el.statusFeedback.textContent = '문제를 맞히면 대포 발사 권한을 획득합니다!';
  }

  renderQuestionUI(q) {
    this.el.quizCategory.textContent = q.category;
    this.el.quizQuestion.textContent = q.question;
    this.el.quizOptions.innerHTML = '';

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.innerHTML = `<span style="opacity:0.75; font-size:0.85em; font-weight:700;">${idx + 1}.</span> ${optText}`;
      btn.addEventListener('click', () => this.handleOptionSelect(idx));
      this.el.quizOptions.appendChild(btn);
    });
  }

  handleOptionSelect(selectedIndex) {
    if (this.state !== 'QUESTION') return;

    const q = this.currentQuestion;
    const isCorrect = selectedIndex === q.correctIndex;
    const optionBtns = this.el.quizOptions.querySelectorAll('.quiz-option-btn');

    optionBtns.forEach(btn => btn.disabled = true);

    if (isCorrect) {
      // Correct answer!
      optionBtns[selectedIndex].classList.add('correct');
      sound.playCorrect();

      const stats = this.quizEngine.recordAnswer(true);
      this.combo = stats.combo;
      this.coins += 20 + this.combo * 5;
      this.stars += 1;
      sound.playCoin();
      if (this.combo >= 2) sound.playCombo(this.combo);

      this.updateStatsUI();

      this.state = 'READY_TO_FIRE';
      this.el.enemyGrid.classList.add('target-ready');
      sound.playLoadCannon();

      this.el.statusFeedback.className = 'status-feedback-box ready-to-fire';
      this.el.statusFeedback.innerHTML = '🔥 <strong>대포 장전 완료!</strong> 적 해역의 목표 칸(A1~H8)을 클릭하세요!';
      this.showToast(`🎯 정답입니다! (${q.category}) 대포를 발사하세요!`);
    } else {
      // Wrong answer
      optionBtns[selectedIndex].classList.add('wrong');
      optionBtns[q.correctIndex].classList.add('correct');
      sound.playWrong();

      this.combo = 0;
      this.quizEngine.recordAnswer(false);
      this.updateStatsUI();

      this.el.statusFeedback.className = 'status-feedback-box';
      this.el.statusFeedback.textContent = `❌ 아쉬워요! ${q.explanation}`;
      this.showToast(`⚠️ 오답입니다! 턴이 컴퓨터 해적으로 넘어갑니다.`);

      this.state = 'ANIMATING';
      setTimeout(() => {
        this.runComputerTurn();
      }, 1100);
    }
  }

  handleEnemyCellClick(r, c) {
    if (this.state !== 'READY_TO_FIRE') return;

    const cell = document.getElementById(`enemy-cell-${r}-${c}`);
    if (cell.classList.contains('fired')) {
      this.showToast('이미 공격한 구역입니다. 다른 칸을 조준하세요!');
      return;
    }

    this.state = 'ANIMATING';
    this.el.enemyGrid.classList.remove('target-ready');
    cell.classList.add('fired');

    // Cannonball animation from player to enemy
    const startRect = this.el.playerGrid.getBoundingClientRect();
    const endRect = cell.getBoundingClientRect();

    const startPos = {
      x: startRect.left + startRect.width * 0.7,
      y: startRect.top + startRect.height * 0.5
    };
    const endPos = {
      x: endRect.left + endRect.width / 2,
      y: endRect.top + endRect.height / 2
    };

    sound.playFire();
    this.animateCannonball(startPos, endPos, () => {
      const target = this.enemyGrid[r][c];
      if (target) {
        // HIT!
        cell.classList.add('hit');
        sound.playHit();
        this.enemyHp = Math.max(0, this.enemyHp - 1);
        this.coins += 50;
        this.updateStatsUI();

        const ship = this.enemyShips.find(s => s.id === target.shipId);
        if (ship) {
          ship.hits++;
          const coordObj = ship.coords.find(co => co.x === c && co.y === r);
          if (coordObj) coordObj.hit = true;

          if (ship.hits >= ship.size && !ship.sunk) {
            ship.sunk = true;
            this.enemyShipsSunk++;
            sound.playSunk();
            this.revealSunkEnemyShip(ship);
            this.showToast(`💥 격침! 적의 [${ship.name}]을 침몰시켰습니다!`);
            this.checkStageAdvancement();
          } else {
            this.showToast(`🎯 명중! 적 해적선에 타격을 입혔습니다! (${COLS[c]}${ROWS[r]})`);
          }
        }
      } else {
        // MISS
        cell.classList.add('miss');
        sound.playMiss();
        this.showToast(`🌊 빗맞힘! 빈 바다에 포탄이 떨어졌습니다. (${COLS[c]}${ROWS[r]})`);
      }

      if (this.enemyHp <= 0) {
        setTimeout(() => this.handleVictory(), 800);
        return;
      }

      setTimeout(() => {
        this.runComputerTurn();
      }, 700);
    });
  }

  revealSunkEnemyShip(ship) {
    ship.coords.forEach(co => {
      const el = document.getElementById(`enemy-cell-${co.y}-${co.x}`);
      if (el) {
        el.classList.add('sunk');
        el.innerHTML += `<span style="position:absolute;font-size:1.1rem;">💀</span>`;
      }
    });
  }

  checkStageAdvancement() {
    const newStage = Math.min(3, this.enemyShipsSunk);
    if (newStage > this.stage) {
      this.stage = newStage;
      this.updateStageUI();
      sound.playVictory();
      const stageNames = ['항구 외곽', '산호 해협', '폭풍 해역', '검은 해골 요새'];
      this.showToast(`🏴‍☠️ 해역 이동! 다음 해역 [${stageNames[this.stage]}]으로 진입합니다!`);
    }
  }

  runComputerTurn() {
    this.state = 'AI_TURN';
    this.setTurnBadge('enemy');
    this.el.statusFeedback.className = 'status-feedback-box';
    this.el.statusFeedback.textContent = '💀 컴퓨터 해적선이 조준 중입니다...';

    setTimeout(() => {
      const target = this.getComputerTarget();
      if (!target) {
        this.nextQuestionTurn();
        return;
      }

      const targetCell = document.getElementById(`player-cell-${target.r}-${target.c}`);
      if (targetCell) targetCell.classList.add('fired');

      const startRect = this.el.enemyGrid.getBoundingClientRect();
      const endRect = targetCell ? targetCell.getBoundingClientRect() : { left: 100, top: 200, width: 40, height: 40 };

      const startPos = {
        x: startRect.left + startRect.width * 0.3,
        y: startRect.top + startRect.height * 0.5
      };
      const endPos = {
        x: endRect.left + endRect.width / 2,
        y: endRect.top + endRect.height / 2
      };

      sound.playFire();
      this.animateCannonball(startPos, endPos, () => {
        const hitInfo = this.playerGrid[target.r][target.c];
        if (hitInfo) {
          if (targetCell) targetCell.classList.add('hit');
          sound.playHit();
          this.playerHp = Math.max(0, this.playerHp - 1);
          this.updateStatsUI();

          this.aiHits.push(target);
          this.addAdjacentTargets(target.r, target.c);

          const ship = this.playerShips.find(s => s.id === hitInfo.shipId);
          if (ship) {
            ship.hits++;
            if (ship.hits >= ship.size && !ship.sunk) {
              ship.sunk = true;
              sound.playSunk();
              this.showToast(`⚠️ 경보! 우리 함대의 [${ship.name}]이 침몰했습니다!`);
            } else {
              this.showToast(`💥 경보! 우리 함선이 적의 포격을 받았습니다! (${COLS[target.c]}${ROWS[target.r]})`);
            }
          }
        } else {
          if (targetCell) targetCell.classList.add('miss');
          sound.playMiss();
          this.showToast(`🛡️ 다행입니다! 적의 포격이 빗나갔습니다. (${COLS[target.c]}${ROWS[target.r]})`);
        }

        if (this.playerHp <= 0) {
          setTimeout(() => this.handleDefeat(), 600);
          return;
        }

        setTimeout(() => {
          this.nextQuestionTurn();
        }, 600);
      });
    }, 600);
  }

  getComputerTarget() {
    while (this.aiTargetsQueue.length > 0) {
      const candidate = this.aiTargetsQueue.shift();
      const key = `${candidate.r},${candidate.c}`;
      if (!this.aiFiredCells.has(key)) {
        this.aiFiredCells.add(key);
        return candidate;
      }
    }

    const candidates = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r},${c}`;
        if (!this.aiFiredCells.has(key) && (r + c) % 2 === 0) {
          candidates.push({ r, c });
        }
      }
    }

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.aiFiredCells.add(`${pick.r},${pick.c}`);
      return pick;
    }

    const allRemaining = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r},${c}`;
        if (!this.aiFiredCells.has(key)) {
          allRemaining.push({ r, c });
        }
      }
    }
    const pick = allRemaining[Math.floor(Math.random() * allRemaining.length)];
    this.aiFiredCells.add(`${pick.r},${pick.c}`);
    return pick;
  }

  addAdjacentTargets(r, c) {
    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const key = `${nr},${nc}`;
        if (!this.aiFiredCells.has(key)) {
          this.aiTargetsQueue.push({ r: nr, c: nc });
        }
      }
    }
  }

  animateCannonball(start, end, onComplete) {
    const duration = 650;
    const startTime = performance.now();
    const peakHeight = 120;

    const frame = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const curX = start.x + (end.x - start.x) * t;
      const arcY = Math.sin(t * Math.PI) * peakHeight;
      const curY = (start.y + (end.y - start.y) * t) - arcY;

      this.ctx.beginPath();
      this.ctx.ellipse(curX, start.y + (end.y - start.y) * t, 8 * (1 - t * 0.3), 4, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(curX - (end.x - start.x) * 0.05, curY + 2, 5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      const grad = this.ctx.createRadialGradient(curX - 2, curY - 2, 1, curX, curY, 8);
      grad.addColorStop(0, '#555');
      grad.addColorStop(0.7, '#111');
      grad.addColorStop(1, '#000');
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(frame);
  }

  updateStatsUI() {
    const playerPct = Math.max(0, (this.playerHp / this.maxHp) * 100);
    this.el.playerHpFill.style.width = `${playerPct}%`;
    this.el.playerHpText.textContent = `HP ${this.playerHp}/${this.maxHp} · 수학 문제를 풀고 대포를 발사하세요!`;

    const enemyPct = Math.max(0, (this.enemyHp / this.maxHp) * 100);
    this.el.enemyHpFill.style.width = `${enemyPct}%`;
    this.el.enemyHpText.textContent = `HP ${this.enemyHp}/${this.maxHp} · 함정과 반격에 주의하세요`;

    this.el.coinsText.textContent = `💰 ${this.coins}`;
    this.el.starsText.textContent = `⭐ ${this.stars}`;

    this.el.comboText.textContent = `🔥 COMBO ${this.combo}`;
    if (this.combo >= 2) {
      this.el.comboBadge.classList.add('streak');
    } else {
      this.el.comboBadge.classList.remove('streak');
    }
  }

  updateStageUI() {
    this.el.stageTabs.forEach((tab, idx) => {
      tab.classList.remove('active', 'cleared');
      if (idx < this.stage) {
        tab.classList.add('cleared');
      } else if (idx === this.stage) {
        tab.classList.add('active');
      }
    });
  }

  setTurnBadge(turn) {
    if (turn === 'placement') {
      this.el.turnBadge.textContent = '함선 배치';
      this.el.turnBadge.className = 'turn-pill';
    } else if (turn === 'student') {
      this.el.turnBadge.textContent = '학생 차례';
      this.el.turnBadge.className = 'turn-pill';
    } else {
      this.el.turnBadge.textContent = '컴퓨터 차례';
      this.el.turnBadge.className = 'turn-pill enemy-turn';
    }
  }

  showHintModal() {
    if (!this.currentQuestion) return;
    this.el.hintModalBody.innerHTML = `
      <div style="background: rgba(90, 50, 15, 0.08); padding: 14px; border-radius: 12px; margin-bottom: 12px;">
        <h4 style="color:#573b1d; font-size:1.1rem; margin-bottom:6px;">📘 [${this.currentQuestion.category}] 핵심 개념 힌트</h4>
        <p style="font-size:1.05rem; line-height:1.6;">${this.currentQuestion.hint}</p>
      </div>
      <div style="font-size:0.9rem; color:#77522d;">
        <strong>초등 5학년 2학기 1단원 꿀팁:</strong><br>
        • <strong>이상 / 이하</strong>: 경계가 되는 수를 <strong>포함</strong>해요 (● 채운 점)<br>
        • <strong>초과 / 미만</strong>: 경계가 되는 수를 <strong>포함하지 않아요</strong> (○ 빈 점)<br>
        • <strong>올림</strong>: 구하려는 자리 아래 수가 0이 아니면 올려줍니다.<br>
        • <strong>버림</strong>: 구하려는 자리 아래 수를 0으로 버립니다.<br>
        • <strong>반올림</strong>: 구하려는 자리 바로 아래 수가 0,1,2,3,4이면 버리고 5,6,7,8,9이면 올립니다.
      </div>
    `;
    this.el.hintModal.classList.add('show');
  }

  hideHintModal() {
    this.el.hintModal.classList.remove('show');
  }

  showToast(msg) {
    this.el.toastBanner.textContent = msg;
    this.el.toastBanner.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.el.toastBanner.classList.remove('show');
    }, 2800);
  }

  handleVictory() {
    this.state = 'GAME_OVER';
    sound.playVictory();
    this.el.hintModalBody.innerHTML = `
      <div style="text-align:center; padding: 10px 0;">
        <div style="font-size: 3.5rem; margin-bottom: 10px;">🏆👑🏴‍☠️</div>
        <h3 style="font-size:1.6rem; color:#27ae60; margin-bottom:10px;">위대한 대승리!</h3>
        <p style="font-size:1.05rem; line-height:1.6; color:#442a12;">
          초등 5학년 2학기 수학 1단원 지식을 발휘하여<br>
          악명 높은 검은 수염 해적단을 완전히 소탕했습니다!
        </p>
        <div style="display:flex; justify-content:center; gap:20px; margin:20px 0; font-weight:800;">
          <div style="background:#fff; padding:10px 20px; border-radius:12px; border:1px solid #d4be95;">💰 골드: ${this.coins}</div>
          <div style="background:#fff; padding:10px 20px; border-radius:12px; border:1px solid #d4be95;">⭐ 스타: ${this.stars}</div>
          <div style="background:#fff; padding:10px 20px; border-radius:12px; border:1px solid #d4be95;">🔥 최고 콤보: ${this.combo}</div>
        </div>
        <button id="btn-restart-game" style="background:#27ae60; color:#fff; border:none; padding:14px 28px; border-radius:14px; font-weight:900; font-size:1.1rem; cursor:pointer;">
          🔄 다시 플레이하기
        </button>
      </div>
    `;
    this.el.hintModal.classList.add('show');
    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.hideHintModal();
      this.startNewGame();
    });
  }

  handleDefeat() {
    this.state = 'GAME_OVER';
    sound.playDefeat();
    this.el.hintModalBody.innerHTML = `
      <div style="text-align:center; padding: 10px 0;">
        <div style="font-size: 3.5rem; margin-bottom: 10px;">🌊💀⚓</div>
        <h3 style="font-size:1.6rem; color:#c0392b; margin-bottom:10px;">함대 침몰!</h3>
        <p style="font-size:1.05rem; line-height:1.6; color:#442a12;">
          적 해적선의 반격으로 아군 함대가 모두 침몰했습니다.<br>
          수학 실력을 가다듬고 다시 복수에 나서세요!
        </p>
        <div style="margin: 20px 0;">
          <button id="btn-restart-game" style="background:#73491f; color:#fff; border:none; padding:14px 28px; border-radius:14px; font-weight:900; font-size:1.1rem; cursor:pointer;">
            🔄 다시 도전하기
          </button>
        </div>
      </div>
    `;
    this.el.hintModal.classList.add('show');
    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.hideHintModal();
      this.startNewGame();
    });
  }
}

// Start game safely
function initGame() {
  if (!window.pirateGame) {
    window.pirateGame = new PirateBattleGame();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
