import { sound } from './audio.js';

export const SHIP_TYPES = [
  { id: 'carrier', name: '항공모함', nameEn: 'Carrier', size: 5, color: '#334155', accent: '#94a3b8' },
  { id: 'battleship', name: '전함', nameEn: 'Battleship', size: 4, color: '#1e293b', accent: '#cbd5e1' },
  { id: 'cruiser', name: '순양함', nameEn: 'Cruiser', size: 3, color: '#1e3a5f', accent: '#60a5fa' },
  { id: 'submarine', name: '잠수함', nameEn: 'Submarine', size: 3, color: '#0f172a', accent: '#38bdf8' },
  { id: 'destroyer', name: '구축함', nameEn: 'Destroyer', size: 2, color: '#134e4a', accent: '#2dd4bf' },
];

export const GRID_SIZE = 10;

export class TacticalBoard2D {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    this.width = container.clientWidth || window.innerWidth || 1000;
    this.height = container.clientHeight || window.innerHeight || 700;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // State
    this.placedFriendlyShips = new Map();
    this.sunkEnemyShips = [];
    this.markers = []; // Array of { gridType, x, y, hit }

    // Placement Mode
    this.isPlacementMode = false;
    this.currentPlacementShip = null;
    this.placementOrientation = 'H'; // 'H' | 'V'
    this.hoverCell = null;
    this.isGhostValid = true;

    // Attack Mode
    this.isAttackEnabled = false;
    this.hoverEnemyCell = null;

    // Visuals & Physics
    this.sonarAngle = 0;
    this.trauma = 0; // Screen shake trauma
    this.missiles = []; // Array of { startX, startY, endX, endY, curX, curY, progress, onHit, trail: [] }
    this.particles = []; // Array of { x, y, vx, vy, color, size, life, maxLife, type }
    this.smokeEmitters = []; // Array of { x, y }

    // Callbacks
    this.onFriendlyCellClick = null;
    this.onEnemyCellClick = null;
    this.onFriendlyHover = null;
    this.onRotateRequest = null;

    // Compatibility FX bridge
    this.fx = {
      launchProjectile: (start, end, onHit) => {
        const sx = typeof start.x === 'number' ? start.x : 200;
        const sy = typeof start.y === 'number' ? start.y : 300;
        const ex = typeof end.x === 'number' ? end.x : 600;
        const ey = typeof end.y === 'number' ? end.y : 300;

        this.missiles.push({
          startX: sx,
          startY: sy,
          endX: ex,
          endY: ey,
          curX: sx,
          curY: sy,
          angle: 0,
          progress: 0,
          duration: 0.72,
          trail: [],
          onHit: () => {
            if (onHit) onHit({ x: ex, y: ey });
          },
        });
      },
      createExplosion: (pos) => {
        this.createExplosion(pos.x, pos.y);
      },
      createSplash: (pos) => {
        this.createSplash(pos.x, pos.y);
      },
      sinkShip: (ship) => {},
      update: () => {},
      clear: () => {},
    };

    this.initEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.isPlacementMode && this.onRotateRequest) {
          this.onRotateRequest();
        }
      }
    });
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth || 1000;
    this.height = this.container.clientHeight || window.innerHeight || 700;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  shake(amount = 0.6) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  getBoardLayout() {
    const w = this.width;
    const h = this.height;

    const availableHeight = h - 130;
    const availableWidthPerBoard = (w - 110) / 2;
    const boardSize = Math.min(500, Math.min(availableHeight, availableWidthPerBoard));
    const cellSize = boardSize / GRID_SIZE;

    const centerY = (h + 40) / 2;
    const leftCenterX = w * 0.28;
    const rightCenterX = w * 0.72;

    const friendly = {
      x: Math.round(leftCenterX - boardSize / 2),
      y: Math.round(centerY - boardSize / 2),
      size: boardSize,
      cellSize,
    };

    const enemy = {
      x: Math.round(rightCenterX - boardSize / 2),
      y: Math.round(centerY - boardSize / 2),
      size: boardSize,
      cellSize,
    };

    return { friendly, enemy };
  }

  cellToScreen(gridType, x, y) {
    const { friendly, enemy } = this.getBoardLayout();
    const board = gridType === 'friendly' ? friendly : enemy;
    return {
      x: board.x + (x + 0.5) * board.cellSize,
      y: board.y + (y + 0.5) * board.cellSize,
    };
  }

  gridToWorld(gridType, x, y) {
    return this.cellToScreen(gridType, x, y);
  }

  screenToCell(screenX, screenY, board) {
    if (screenX >= board.x && screenX <= board.x + board.size &&
        screenY >= board.y && screenY <= board.y + board.size) {
      const cx = Math.floor((screenX - board.x) / board.cellSize);
      const cy = Math.floor((screenY - board.y) / board.cellSize);
      if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
        return { x: cx, y: cy };
      }
    }
    return null;
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { friendly, enemy } = this.getBoardLayout();

    if (this.isPlacementMode) {
      const cell = this.screenToCell(mx, my, friendly);
      this.hoverCell = cell;
      if (cell && this.onFriendlyHover) {
        this.onFriendlyHover(cell);
      }
      return;
    }

    if (this.isAttackEnabled) {
      const cell = this.screenToCell(mx, my, enemy);
      this.hoverEnemyCell = cell;
    }
  }

  onPointerDown(e) {
    if (e.button === 2) {
      e.preventDefault();
      if (this.isPlacementMode && this.onRotateRequest) {
        this.onRotateRequest();
      }
      return;
    }

    if (e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { friendly, enemy } = this.getBoardLayout();

    if (this.isPlacementMode) {
      const cell = this.screenToCell(mx, my, friendly);
      if (cell && this.onFriendlyCellClick) {
        this.onFriendlyCellClick(cell);
      }
    } else if (this.isAttackEnabled) {
      const cell = this.screenToCell(mx, my, enemy);
      if (cell && this.onEnemyCellClick) {
        this.onEnemyCellClick(cell);
      }
    }
  }

  setPlacementMode(active, shipDef = null, orientation = 'H') {
    this.isPlacementMode = active;
    this.currentPlacementShip = shipDef;
    this.placementOrientation = orientation;
    if (!active) this.hoverCell = null;
  }

  updateGhostPlacement(cell, isValid) {
    this.hoverCell = cell;
    this.isGhostValid = isValid;
  }

  placeFriendlyShip(shipData) {
    this.placedFriendlyShips.set(shipData.id, shipData);
    sound.playClick();
  }

  clearFriendlyShips() {
    this.placedFriendlyShips.clear();
  }

  revealEnemySunkShip(sunkShip) {
    if (sunkShip) {
      this.sunkEnemyShips.push(sunkShip);
      this.shake(0.7);
      sunkShip.cells.forEach((c) => {
        const pt = this.cellToScreen('enemy', c.x, c.y);
        this.smokeEmitters.push({ x: pt.x, y: pt.y, intense: true });
      });
    }
  }

  addMarker(gridType, x, y, hit) {
    this.markers.push({ gridType, x, y, hit });
    if (hit) {
      const pt = this.cellToScreen(gridType, x, y);
      this.smokeEmitters.push({ x: pt.x, y: pt.y, intense: false });
    }
  }

  clearMarkers() {
    this.markers = [];
    this.sunkEnemyShips = [];
    this.smokeEmitters = [];
    this.particles = [];
  }

  setCameraView(mode) {
    sound.playClick();
  }

  // -------------------------------------------------------------
  // High-Impact Explosions & Water Splashes
  // -------------------------------------------------------------
  createExplosion(x, y) {
    this.shake(0.85); // Intense camera shake

    // 1. Blinding White Flash Shockwave
    this.particles.push({
      x, y,
      radius: 8,
      maxRadius: 65,
      type: 'shockwave',
      color: '#fff5aa',
      life: 0.45,
      maxLife: 0.45,
    });
    this.particles.push({
      x, y,
      radius: 4,
      maxRadius: 85,
      type: 'shockwave',
      color: '#ff6600',
      life: 0.6,
      maxLife: 0.6,
    });

    // 2. Heavy Fiery Fireball Core (Multi-layered)
    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 110;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 14 + Math.random() * 18,
        color: Math.random() > 0.35 ? '#ff4500' : '#ffcc00',
        type: 'fire',
        life: 0.7 + Math.random() * 0.4,
        maxLife: 1.1,
      });
    }

    // 3. Hot Shrapnel Sparks with Trails
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 180;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 3.5,
        color: Math.random() > 0.5 ? '#fffb91' : '#ff7722',
        type: 'spark',
        gravity: 120,
        life: 0.9 + Math.random() * 0.5,
        maxLife: 1.4,
      });
    }
  }

  createSplash(x, y) {
    this.shake(0.3); // Subtle impact thud

    // 3 Expanding concentric ripple rings
    [1.0, 0.7, 0.4].forEach((delayScale, idx) => {
      this.particles.push({
        x, y,
        radius: 6 + idx * 4,
        maxRadius: 48 + idx * 8,
        type: 'ripple',
        life: 0.8 * delayScale,
        maxLife: 0.8 * delayScale,
      });
    });

    // Upward Erupting Water Geyser Column
    for (let i = 0; i < 35; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.7 - Math.PI / 2; // upward cone
      const speed = 70 + Math.random() * 110;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed,
        size: 3.5 + Math.random() * 4.5,
        color: Math.random() > 0.4 ? '#cceeff' : '#66ccff',
        type: 'water',
        gravity: 240,
        life: 0.75 + Math.random() * 0.4,
        maxLife: 1.15,
      });
    }
  }

  // -------------------------------------------------------------
  // Render Loop
  // -------------------------------------------------------------
  animate() {
    requestAnimationFrame(this.animate);
    const dt = 0.016;
    this.sonarAngle += 0.024;

    // Decay Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.0);
      const intensity = (this.trauma * this.trauma) * 14;
      shakeX = (Math.random() * 2 - 1) * intensity;
      shakeY = (Math.random() * 2 - 1) * intensity;
    }

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Deep Ocean Background with Vignette
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
    bgGrad.addColorStop(0, '#0a1626');
    bgGrad.addColorStop(1, '#030811');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    const { friendly, enemy } = this.getBoardLayout();

    // Draw Boards
    this.drawTacticalGrid(friendly, '아군 함대 해역 (FRIENDLY FLEET)', '#00e5ff', 'friendly');
    this.drawTacticalGrid(enemy, '적 함대 레이더 (ENEMY WATERS)', '#ff3366', 'enemy');

    // Draw Friendly Ships
    this.placedFriendlyShips.forEach((ship) => {
      this.drawRealisticShip(friendly, ship, false);
    });

    // Draw Ghost Ship Preview during placement
    if (this.isPlacementMode && this.currentPlacementShip && this.hoverCell) {
      const ghostData = {
        id: this.currentPlacementShip.id,
        size: this.currentPlacementShip.size,
        orientation: this.placementOrientation,
        x: this.hoverCell.x,
        y: this.hoverCell.y,
      };
      this.drawRealisticShip(friendly, ghostData, true, this.isGhostValid);
    }

    // Draw Sunk Enemy Ships
    this.sunkEnemyShips.forEach((ship) => {
      const isH = ship.cells.length > 1 && ship.cells[0].y === ship.cells[1].y;
      const minX = Math.min(...ship.cells.map((c) => c.x));
      const minY = Math.min(...ship.cells.map((c) => c.y));
      const shipDef = SHIP_TYPES.find((s) => s.size === ship.cells.length) || SHIP_TYPES[0];
      const sunkData = {
        id: shipDef.id,
        size: shipDef.size,
        orientation: isH ? 'H' : 'V',
        x: minX,
        y: minY,
      };
      this.drawRealisticShip(enemy, sunkData, false, false, true);
    });

    // Draw Peg Markers (Hits and Misses)
    this.drawMarkers(friendly, 'friendly');
    this.drawMarkers(enemy, 'enemy');

    // Draw Target Reticle
    if (this.isAttackEnabled && this.hoverEnemyCell) {
      this.drawTargetReticle(enemy, this.hoverEnemyCell);
    }

    // Spawn Smoke & Flame over burning tiles
    if (Math.random() < 0.45) {
      this.smokeEmitters.forEach((e) => {
        this.particles.push({
          x: e.x + (Math.random() - 0.5) * 12,
          y: e.y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 14,
          vy: -28 - Math.random() * 20,
          size: 8 + Math.random() * 8,
          color: Math.random() > 0.6 ? '#ff5500' : 'rgba(40, 40, 40, 0.75)',
          type: 'smoke',
          life: 1.0,
          maxLife: 1.0,
        });
      });
    }

    // Update & Render Missiles
    this.updateMissiles(dt);

    // Update & Render Particles
    this.updateParticles(dt);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Grid & Sonar Rendering
  // -------------------------------------------------------------
  drawTacticalGrid(board, title, accentColor, type) {
    const ctx = this.ctx;
    const { x, y, size, cellSize } = board;

    // Platform Base with metallic edge
    ctx.fillStyle = 'rgba(7, 18, 33, 0.94)';
    ctx.fillRect(x, y, size, size);

    // Glowing Board Border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, size, size);

    // Tactical Corner Brackets
    const bLen = 16;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x, y + bLen); ctx.lineTo(x, y); ctx.lineTo(x + bLen, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + size - bLen, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + bLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + size - bLen); ctx.lineTo(x, y + size); ctx.lineTo(x + bLen, y + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + size - bLen, y + size); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size, y + size - bLen); ctx.stroke();

    // Header Title
    ctx.fillStyle = 'rgba(2, 8, 16, 0.75)';
    ctx.fillRect(x, y - 30, size, 24);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - 30, size, 24);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`● ${title}`, x + size / 2, y - 14);

    // Sonar Beam & Range Rings
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
    ctx.lineWidth = 1;
    for (let r = size * 0.18; r <= size * 0.65; r += size * 0.18) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sweepAngle = type === 'friendly' ? this.sonarAngle : -this.sonarAngle;
    const beamGrad = ctx.createConicGradient(sweepAngle, cx, cy);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
    beamGrad.addColorStop(0.14, 'rgba(0, 229, 255, 0.0)');
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 10x10 Grid Lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * cellSize, y);
      ctx.lineTo(x + i * cellSize, y + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y + i * cellSize);
      ctx.lineTo(x + size, y + i * cellSize);
      ctx.stroke();
    }

    // Coordinates Labels
    ctx.fillStyle = '#789ab8';
    ctx.font = 'bold 11px monospace';
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = 0; i < GRID_SIZE; i++) {
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x + (i + 0.5) * cellSize, y + size + 16);
      ctx.textAlign = 'right';
      ctx.fillText(rows[i], x - 8, y + (i + 0.5) * cellSize + 4);
    }
  }

  // -------------------------------------------------------------
  // Photorealistic Detailed Warship Vector Renderer
  // -------------------------------------------------------------
  drawRealisticShip(board, ship, isGhost = false, isValid = true, isSunk = false) {
    const ctx = this.ctx;
    const isH = ship.orientation === 'H';
    const cellW = board.cellSize;
    const length = ship.size * cellW - 6;
    const width = cellW * 0.74;

    const startX = board.x + ship.x * cellW + 3;
    const startY = board.y + ship.y * cellW + 3;

    ctx.save();

    // 1. Realistic Hull Drop Shadow on Ocean Water
    if (!isGhost) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 6;
    }

    if (isGhost) {
      ctx.fillStyle = isValid ? 'rgba(0, 255, 136, 0.55)' : 'rgba(255, 40, 70, 0.55)';
      ctx.strokeStyle = isValid ? '#00ff88' : '#ff2846';
      ctx.lineWidth = 2;
    }

    if (isH) {
      const py = startY + (cellW - width) / 2;
      this.renderDetailedWarship(ctx, startX, py, length, width, true, ship.id, isGhost, isSunk);
    } else {
      const px = startX + (cellW - width) / 2;
      this.renderDetailedWarship(ctx, px, startY, width, length, false, ship.id, isGhost, isSunk);
    }

    ctx.restore();
  }

  renderDetailedWarship(ctx, x, y, w, h, isH, shipId, isGhost, isSunk) {
    // 1. Main Hull Base with Metallic Camouflage Armor
    if (!isGhost) {
      const hullGrad = ctx.createLinearGradient(x, y, isH ? x : x + w, isH ? y + h : y);
      if (isSunk) {
        hullGrad.addColorStop(0, '#2d1111');
        hullGrad.addColorStop(0.5, '#190606');
        hullGrad.addColorStop(1, '#110202');
      } else {
        hullGrad.addColorStop(0, '#3a4b60');
        hullGrad.addColorStop(0.4, '#4f647d');
        hullGrad.addColorStop(0.7, '#344458');
        hullGrad.addColorStop(1, '#24303f');
      }
      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = isSunk ? '#ff2244' : '#7b95b2';
      ctx.lineWidth = 1.8;
    }

    // Armor Hull Silhouette with Sharp Bow Wedge
    ctx.beginPath();
    if (isH) {
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + w - 16, y);
      ctx.lineTo(x + w, y + h / 2); // Sharp bow cone
      ctx.lineTo(x + w - 16, y + h);
      ctx.lineTo(x, y + h - 4);
      ctx.closePath();
    } else {
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x, y + h - 16);
      ctx.lineTo(x + w / 2, y + h); // Sharp bow cone
      ctx.lineTo(x + w, y + h - 16);
      ctx.lineTo(x + w - 4, y);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent'; // reset shadow for inner details
    if (isGhost) return;

    // 2. Specific Ship Realistic Superstructures
    if (shipId === 'carrier') {
      // Dark Non-Skid Flight Deck
      ctx.fillStyle = '#1c2430';
      if (isH) {
        ctx.fillRect(x + 4, y + 3, w - 18, h - 6);

        // Yellow Angled Landing Strip Markings
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + h * 0.28);
        ctx.lineTo(x + w - 24, y + h * 0.65);
        ctx.stroke();

        // White Catapult Launch Tracks
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.35, y + h * 0.35);
        ctx.lineTo(x + w - 20, y + h * 0.35);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arresting Gear Cables
        ctx.strokeStyle = '#94a3b8';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 16 + i * 8, y + 4);
          ctx.lineTo(x + 16 + i * 8, y + h - 4);
          ctx.stroke();
        }

        // Parked Fighter Jets (F-35 Silhouettes on Deck)
        this.drawFighterJet(ctx, x + w * 0.2, y + h * 0.72, 0);
        this.drawFighterJet(ctx, x + w * 0.32, y + h * 0.72, 0);

        // Starboard Island Superstructure & Radar Radomes
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w * 0.52, y + 1, 24, 7);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x + w * 0.52 + 5, y + 4, 2.5, 0, Math.PI * 2);
        ctx.arc(x + w * 0.52 + 18, y + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x + 3, y + 4, w - 6, h - 18);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.28, y + 6);
        ctx.lineTo(x + w * 0.65, y + h - 24);
        ctx.stroke();

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.35, y + h * 0.35);
        ctx.lineTo(x + w * 0.35, y + h - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fighter Jets
        this.drawFighterJet(ctx, x + w * 0.72, y + h * 0.2, Math.PI / 2);
        this.drawFighterJet(ctx, x + w * 0.72, y + h * 0.32, Math.PI / 2);

        // Island Tower
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w - 8, y + h * 0.52, 7, 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x + w - 4, y + h * 0.52 + 5, 2.5, 0, Math.PI * 2);
        ctx.arc(x + w - 4, y + h * 0.52 + 18, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (shipId === 'battleship') {
      // Teak Wood Composite Center Deck
      ctx.fillStyle = '#2d3b4e';
      if (isH) {
        ctx.fillRect(x + 12, y + 5, w - 28, h - 10);

        // 3 Triple-Gun Heavy Main Turrets (Turret A, B, and X)
        this.drawHeavyTurret(ctx, x + w * 0.65, y + h / 2, 8, 14, 0);
        this.drawHeavyTurret(ctx, x + w * 0.8, y + h / 2, 7.5, 14, 0);
        this.drawHeavyTurret(ctx, x + w * 0.22, y + h / 2, 8, 14, Math.PI);

        // Armored Conning Citadel Tower
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w * 0.42, y + h * 0.24, w * 0.16, h * 0.52);
        ctx.fillStyle = '#0ea5e9'; // Bridge windows
        ctx.fillRect(x + w * 0.47, y + h * 0.32, w * 0.08, 3);
      } else {
        ctx.fillRect(x + 5, y + 12, w - 10, h - 28);

        this.drawHeavyTurret(ctx, x + w / 2, y + h * 0.65, 8, 14, Math.PI / 2);
        this.drawHeavyTurret(ctx, x + w / 2, y + h * 0.8, 7.5, 14, Math.PI / 2);
        this.drawHeavyTurret(ctx, x + w / 2, y + h * 0.22, 8, 14, -Math.PI / 2);

        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w * 0.24, y + h * 0.42, w * 0.52, h * 0.16);
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(x + w * 0.32, y + h * 0.47, 3, h * 0.08);
      }
    } else if (shipId === 'submarine') {
      // Hydrodynamic Black Rubber Tile Texture & Water Sheen
      ctx.fillStyle = '#0b111e';
      if (isH) {
        // Streamlined Conning Sail
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5, y + h / 2, w * 0.22, h * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Periscope & Snorkel Masts
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + w * 0.54, y + h / 2 - 2, 4, 3);
        ctx.fillRect(x + w * 0.48, y + h / 2 - 1, 3, 2);

        // Stern Rudders
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, 6, h - 4);
      } else {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.5, w * 0.26, h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + w / 2 - 2, y + h * 0.54, 3, 4);
        ctx.fillRect(x + w / 2 - 1, y + h * 0.48, 2, 3);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, w - 4, 6);
      }
    } else if (shipId === 'cruiser') {
      // Aegis Cruiser: VLS Missile Silo Cells & Helipad
      if (isH) {
        // Forward Mk 45 Naval Gun
        this.drawHeavyTurret(ctx, x + w * 0.78, y + h / 2, 5.5, 10, 0);

        // VLS 64-Cell Missile Hatch Grid
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + w * 0.58, y + h * 0.28, 18, h * 0.44);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + w * 0.58, y + h * 0.28, 18, h * 0.44);

        // Bridge & Octagonal SPY-1 Radar Dome
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w * 0.36, y + h * 0.25, w * 0.18, h * 0.5);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x + w * 0.45, y + h / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Stern Helipad with 'H' marking
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x + 14, y + h / 2, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('H', x + 14, y + h / 2 + 3);
      } else {
        this.drawHeavyTurret(ctx, x + w / 2, y + h * 0.78, 5.5, 10, Math.PI / 2);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + w * 0.28, y + h * 0.58, w * 0.44, 18);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + w * 0.28, y + h * 0.58, w * 0.44, 18);

        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w * 0.25, y + h * 0.36, w * 0.5, h * 0.18);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.45, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 14, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('H', x + w / 2, y + 17);
      }
    } else {
      // Destroyer: Stealth Faceted Fast Frigate
      if (isH) {
        this.drawHeavyTurret(ctx, x + w * 0.72, y + h / 2, 5, 9, 0);

        // Stealth Bridge
        ctx.fillStyle = '#475569';
        ctx.fillRect(x + w * 0.35, y + h * 0.26, w * 0.24, h * 0.48);

        // Quad Torpedo Tubes
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + w * 0.22, y + 3, 8, 3);
        ctx.fillRect(x + w * 0.22, y + h - 6, 8, 3);
      } else {
        this.drawHeavyTurret(ctx, x + w / 2, y + h * 0.72, 5, 9, Math.PI / 2);

        ctx.fillStyle = '#475569';
        ctx.fillRect(x + w * 0.26, y + h * 0.35, w * 0.48, h * 0.24);

        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 3, y + h * 0.22, 3, 8);
        ctx.fillRect(x + w - 6, y + h * 0.22, 3, 8);
      }
    }

    // Critical Sunk Damage
    if (isSunk) {
      ctx.strokeStyle = 'rgba(255, 30, 60, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);
    }
  }

  drawHeavyTurret(ctx, cx, cy, radius, barrelLen, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Blast Bag & Triple/Dual Barrels
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, -3.5, barrelLen, 2.2);
    ctx.fillRect(0, 1.3, barrelLen, 2.2);

    // Muzzle Flash Brakes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barrelLen - 2, -4, 3, 3);
    ctx.fillRect(barrelLen - 2, 1, 3, 3);

    // Turret Armor Dome
    const turretGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
    turretGrad.addColorStop(0, '#cbd5e1');
    turretGrad.addColorStop(0.8, '#64748b');
    turretGrad.addColorStop(1, '#334155');
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rangefinder Optics Ears on Turret Sides
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -radius - 1.5, 4, 3);
    ctx.fillRect(-2, radius - 1.5, 4, 3);

    ctx.restore();
  }

  drawFighterJet(ctx, jx, jy, rot) {
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(rot);

    // Jet Wings Silhouette
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(2, 0);
    ctx.lineTo(-5, 6);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -1, 3, 2);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Markers & Targeting Reticle
  // -------------------------------------------------------------
  drawMarkers(board, type) {
    const ctx = this.ctx;
    const { x, y, cellSize } = board;

    this.markers.filter((m) => m.gridType === type).forEach((m) => {
      const px = x + (m.x + 0.5) * cellSize;
      const py = y + (m.y + 0.5) * cellSize;

      if (m.hit) {
        // DIRECT HIT: Burning Skull/Cross Marker
        ctx.fillStyle = '#ff1133';
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // White Armor Piercing Spike Cross
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(px - 7, py - 7); ctx.lineTo(px + 7, py + 7);
        ctx.moveTo(px + 7, py - 7); ctx.lineTo(px - 7, py + 7);
        ctx.stroke();
      } else {
        // MISS: Cyan Oceanic Buoy Peg
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py, cellSize * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  drawTargetReticle(board, cell) {
    const ctx = this.ctx;
    const px = board.x + (cell.x + 0.5) * board.cellSize;
    const py = board.y + (cell.y + 0.5) * board.cellSize;
    const r = board.cellSize * 0.46;

    ctx.save();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 14;

    // Glowing Target Ring
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();

    // Rangefinder Ticks
    ctx.beginPath();
    ctx.moveTo(px - r - 6, py); ctx.lineTo(px - 4, py);
    ctx.moveTo(px + 4, py); ctx.lineTo(px + r + 6, py);
    ctx.moveTo(px, py - r - 6); ctx.lineTo(px, py - 4);
    ctx.moveTo(px, py + 4); ctx.lineTo(px, py + r + 6);
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Ultra-Realistic Cruise Missile & Artillery Shell Ballistics
  // -------------------------------------------------------------
  updateMissiles(dt) {
    const ctx = this.ctx;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.progress += dt / m.duration;
      const t = Math.min(1.0, m.progress);

      // Parabolic Arc
      const arcHeight = 110;
      const prevX = m.curX;
      const prevY = m.curY;
      m.curX = m.startX + (m.endX - m.startX) * t;
      m.curY = m.startY + (m.endY - m.startY) * t - Math.sin(t * Math.PI) * arcHeight;

      // Calculate tangent flight angle
      const dx = m.curX - prevX;
      const dy = m.curY - prevY;
      m.angle = Math.atan2(dy, dx);

      // Record trajectory history for volumetric expanding smoke trail
      m.trail.push({ x: m.curX, y: m.curY, age: 0 });

      // Render Expanding Smoke Trail along flight path
      for (let j = m.trail.length - 1; j >= 0; j--) {
        const pt = m.trail[j];
        pt.age += dt;
        const alpha = Math.max(0, 1 - pt.age / 0.45);
        if (alpha <= 0) {
          m.trail.splice(j, 1);
          continue;
        }

        ctx.fillStyle = `rgba(230, 230, 230, ${alpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(pt.x + (Math.random() - 0.5) * 4, pt.y + (Math.random() - 0.5) * 4, 3 + pt.age * 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Cruise Missile
      ctx.save();
      ctx.translate(m.curX, m.curY);
      ctx.rotate(m.angle);

      // Intense Rocket Thruster Flame (Orange to White Flare)
      const flameLen = 14 + Math.random() * 8;
      const flameGrad = ctx.createLinearGradient(-flameLen, 0, 0, 0);
      flameGrad.addColorStop(0, 'rgba(255, 60, 0, 0)');
      flameGrad.addColorStop(0.5, '#ff7700');
      flameGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-flameLen, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();

      // Missile Metallic Fuselage
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.fillRect(-6, -2.5, 14, 5);
      ctx.strokeRect(-6, -2.5, 14, 5);

      // Red Explosive Warhead Nose Cone
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(8, -2.5);
      ctx.lineTo(13, 0);
      ctx.lineTo(8, 2.5);
      ctx.closePath();
      ctx.fill();

      // Delta Wings / Tail Fins
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-5, -6); ctx.lineTo(-1, -2.5); ctx.lineTo(-6, -2.5); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, 6); ctx.lineTo(-1, 2.5); ctx.lineTo(-6, 2.5); ctx.closePath();
      ctx.fill();

      ctx.restore();

      if (t >= 1.0) {
        if (m.onHit) m.onHit(m.endX, m.endY);
        this.missiles.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    const ctx = this.ctx;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      const ratio = Math.max(0, p.life / p.maxLife);

      if (p.type === 'shockwave') {
        p.radius += (p.maxRadius - p.radius) * 0.22;
        ctx.strokeStyle = p.color || '#ffcc00';
        ctx.globalAlpha = ratio * 0.85;
        ctx.lineWidth = 4 * ratio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'ripple') {
        p.radius += (p.maxRadius - p.radius) * 0.16;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.globalAlpha = ratio * 0.75;
        ctx.lineWidth = 2.5 * ratio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else {
        if (p.gravity) p.vy += p.gravity * dt;
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        const pSize = p.type === 'fire' ? p.size * (1 + (1 - ratio) * 0.8) : p.size * ratio;
        ctx.arc(p.x, p.y, Math.max(0.5, pSize), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}
