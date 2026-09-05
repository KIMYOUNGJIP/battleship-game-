import { SHIP_TYPES, GRID_SIZE } from './board2d.js';

export class BattleshipAI {
  constructor() {
    this.ships = [];
    this.shotsFired = new Set(); // Set of "x,y"
    this.targetQueue = []; // Array of {x, y}
    this.successfulHits = []; // Array of {x, y}
  }

  reset() {
    this.ships = [];
    this.shotsFired.clear();
    this.targetQueue = [];
    this.successfulHits = [];
  }

  // Generate valid fleet placement
  generateFleet() {
    const fleet = [];
    const occupied = new Set();

    for (const shipDef of SHIP_TYPES) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 500) {
        attempts++;
        const orientation = Math.random() < 0.5 ? 'H' : 'V';
        const isH = orientation === 'H';

        const maxX = isH ? GRID_SIZE - shipDef.size : GRID_SIZE - 1;
        const maxY = isH ? GRID_SIZE - 1 : GRID_SIZE - shipDef.size;

        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));

        const cells = [];
        let valid = true;

        for (let i = 0; i < shipDef.size; i++) {
          const cx = isH ? x + i : x;
          const cy = isH ? y : y + i;
          const key = `${cx},${cy}`;

          if (occupied.has(key)) {
            valid = false;
            break;
          }
          cells.push({ x: cx, y: cy, hit: false });
        }

        if (valid) {
          cells.forEach((c) => occupied.add(`${c.x},${c.y}`));
          fleet.push({
            id: shipDef.id,
            name: shipDef.name,
            size: shipDef.size,
            x,
            y,
            orientation,
            cells,
          });
          placed = true;
        }
      }
    }

    this.ships = fleet;
    return fleet;
  }

  // Determine next shot coordinate
  getNextShot() {
    let target = null;

    // 1. If in Target mode and queue has coordinates
    while (this.targetQueue.length > 0) {
      const cand = this.targetQueue.shift();
      const key = `${cand.x},${cand.y}`;
      if (!this.shotsFired.has(key) && this.isValidCoord(cand.x, cand.y)) {
        target = cand;
        break;
      }
    }

    // 2. If no target in queue, use Hunt mode (Parity checkerboard search)
    if (!target) {
      const parityCells = [];
      const anyCells = [];

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const key = `${x},${y}`;
          if (!this.shotsFired.has(key)) {
            if ((x + y) % 2 === 0) {
              parityCells.push({ x, y });
            } else {
              anyCells.push({ x, y });
            }
          }
        }
      }

      const pool = parityCells.length > 0 ? parityCells : anyCells;
      if (pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        target = pool[idx];
      }
    }

    if (target) {
      this.shotsFired.add(`${target.x},${target.y}`);
    }
    return target;
  }

  // Register shot result to improve targeting algorithm
  registerShotResult(x, y, hit, sunk, sunkShip = null) {
    if (hit) {
      this.successfulHits.push({ x, y });

      if (sunk) {
        // Ship sunk: remove cells of this ship from successful hits list
        if (sunkShip && sunkShip.cells) {
          const sunkKeys = new Set(sunkShip.cells.map((c) => `${c.x},${c.y}`));
          this.successfulHits = this.successfulHits.filter(
            (h) => !sunkKeys.has(`${h.x},${h.y}`)
          );
        } else {
          this.successfulHits = [];
        }

        // Rebuild target queue from remaining unresolved hits
        this.targetQueue = [];
        this.successfulHits.forEach((h) => this.addAdjacentCandidates(h.x, h.y));
      } else {
        // Not sunk yet: analyze axis
        this.addSmartCandidates(x, y);
      }
    }
  }

  addSmartCandidates(x, y) {
    // Check if we have previous unsunk hits that align with this hit
    const alignedHits = this.successfulHits.filter((h) => (h.x === x || h.y === y) && !(h.x === x && h.y === y));

    if (alignedHits.length > 0) {
      // We have alignment! Determine direction
      const prev = alignedHits[0];
      if (prev.x === x) {
        // Vertical alignment
        const dy = y > prev.y ? 1 : -1;
        this.pushIfValid(x, y + dy, true);
        this.pushIfValid(x, prev.y - dy, true);
      } else {
        // Horizontal alignment
        const dx = x > prev.x ? 1 : -1;
        this.pushIfValid(x + dx, y, true);
        this.pushIfValid(prev.x - dx, y, true);
      }
    }

    // Always ensure orthogonal neighbors are in queue
    this.addAdjacentCandidates(x, y);
  }

  addAdjacentCandidates(x, y) {
    const dirs = [
      { x: x + 1, y: y },
      { x: x - 1, y: y },
      { x: x, y: y + 1 },
      { x: x, y: y - 1 },
    ];
    // Shuffle directions for organic unpredictability
    dirs.sort(() => Math.random() - 0.5);
    dirs.forEach((d) => this.pushIfValid(d.x, d.y, false));
  }

  pushIfValid(x, y, highPriority = false) {
    if (!this.isValidCoord(x, y)) return;
    const key = `${x},${y}`;
    if (this.shotsFired.has(key)) return;
    if (this.targetQueue.some((q) => q.x === x && q.y === y)) return;

    if (highPriority) {
      this.targetQueue.unshift({ x, y });
    } else {
      this.targetQueue.push({ x, y });
    }
  }

  isValidCoord(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }
}
