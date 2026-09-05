import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FXManager } from './fx.js';
import { sound } from './audio.js';

export const SHIP_TYPES = [
  { id: 'carrier', name: '항공모함', nameEn: 'Carrier', size: 5, color: 0x4a5568 },
  { id: 'battleship', name: '전함', nameEn: 'Battleship', size: 4, color: 0x2d3748 },
  { id: 'cruiser', name: '순양함', nameEn: 'Cruiser', size: 3, color: 0x3182ce },
  { id: 'submarine', name: '잠수함', nameEn: 'Submarine', size: 3, color: 0x2b6cb0 },
  { id: 'destroyer', name: '구축함', nameEn: 'Destroyer', size: 2, color: 0x319795 },
];

export const GRID_SIZE = 10;
export const CELL_SIZE = 1.2;

export class Board3D {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth || 800;
    this.height = container.clientHeight || window.innerHeight || 600;

    this.is2D = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.fx = null;

    this.waterMesh = null;
    this.waterGeom = null;
    this.startTime = performance.now();
    this.lastTime = performance.now();

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.friendlyHitPlane = null;
    this.enemyHitPlane = null;

    // Placed Ship 3D Objects: key is ship id
    this.friendlyShipMeshes = new Map();
    this.enemyShipMeshes = new Map();

    // Markers: Array of { x, y, mesh, gridType, hit }
    this.markers = [];
    this.placedFriendlyShipsData = new Map();
    this.sunkEnemyShipsData = [];

    // Ghost Preview for placement
    this.ghostShipGroup = null;
    this.currentPlacementShip = null;
    this.placementOrientation = 'H'; // 'H' or 'V'
    this.hoverCell = null;
    this.isGhostValid = true;

    // Target reticle for enemy grid
    this.targetReticle = null;
    this.hoverEnemyCell = null;

    // Callbacks
    this.onFriendlyCellClick = null;
    this.onEnemyCellClick = null;
    this.onFriendlyHover = null;
    this.onRotateRequest = null;
    this.isPlacementMode = false;
    this.isAttackEnabled = false;

    this.init();
  }

  init() {
    // Check if WebGL is available
    const testCanvas = document.createElement('canvas');
    let gl = null;
    try {
      gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    } catch (e) {
      console.warn('WebGL detection error:', e);
    }

    if (!gl) {
      console.warn('⚠️ WebGL not supported on this environment. Initializing high-tech 2D Tactical Radar mode.');
      this.initTactical2D();
      return;
    }

    try {
      this.init3D();
    } catch (err) {
      console.error('Failed to initialize 3D scene, falling back to 2D:', err);
      this.initTactical2D();
    }
  }

  // -------------------------------------------------------------
  // 3D Initialization
  // -------------------------------------------------------------
  init3D() {
    this.is2D = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a111c);
    this.scene.fog = new THREE.FogExp2(0x0a111c, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 22, 26);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 0, 0);

    this.fx = new FXManager(this.scene, this.camera);

    this.setupLighting();
    this.setupOcean();
    this.setupBoards();
    this.setupReticle();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x1a2e4c, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaad4ff, 2.2);
    dirLight.position.set(20, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffaa66, 0.8);
    fillLight.position.set(-20, 20, -15);
    this.scene.add(fillLight);
  }

  setupOcean() {
    const size = 180;
    const segments = 80;
    this.waterGeom = new THREE.PlaneGeometry(size, size, segments, segments);
    this.waterGeom.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x071e3d,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true,
    });

    this.waterMesh = new THREE.Mesh(this.waterGeom, waterMat);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.position.y = -0.05;
    this.scene.add(this.waterMesh);
  }

  createBoardMesh(titleText, originX, accentColorHex) {
    const group = new THREE.Group();
    const boardTotalSize = GRID_SIZE * CELL_SIZE;

    const baseGeom = new THREE.BoxGeometry(boardTotalSize + 0.8, 0.4, boardTotalSize + 0.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.7,
      metalness: 0.4,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(originX, -0.2, 0);
    base.receiveShadow = true;
    group.add(base);

    const borderGeom = new THREE.BoxGeometry(boardTotalSize + 0.9, 0.08, boardTotalSize + 0.9);
    const borderMat = new THREE.MeshStandardMaterial({
      color: accentColorHex,
      emissive: accentColorHex,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const border = new THREE.Mesh(borderGeom, borderMat);
    border.position.set(originX, 0.01, 0);
    group.add(border);

    const lineMat = new THREE.LineBasicMaterial({
      color: accentColorHex,
      transparent: true,
      opacity: 0.35,
    });

    const startX = originX - boardTotalSize / 2;
    const startZ = -boardTotalSize / 2;

    const points = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      points.push(new THREE.Vector3(startX, 0.02, startZ + i * CELL_SIZE));
      points.push(new THREE.Vector3(startX + boardTotalSize, 0.02, startZ + i * CELL_SIZE));
      points.push(new THREE.Vector3(startX + i * CELL_SIZE, 0.02, startZ));
      points.push(new THREE.Vector3(startX + i * CELL_SIZE, 0.02, startZ + boardTotalSize));
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const gridLines = new THREE.LineSegments(lineGeom, lineMat);
    group.add(gridLines);

    const titleSprite = this.createTextSprite(titleText, accentColorHex);
    titleSprite.position.set(originX, 0.8, -boardTotalSize / 2 - 1.2);
    titleSprite.scale.set(7, 1.8, 1);
    group.add(titleSprite);

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let x = 0; x < GRID_SIZE; x++) {
      const colSprite = this.createTextSprite(String(x + 1), '#8899aa', 32);
      colSprite.position.set(startX + (x + 0.5) * CELL_SIZE, 0.1, startZ - 0.5);
      colSprite.scale.set(1.1, 0.55, 1);
      group.add(colSprite);
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      const rowSprite = this.createTextSprite(rows[y], '#8899aa', 32);
      rowSprite.position.set(startX - 0.5, 0.1, startZ + (y + 0.5) * CELL_SIZE);
      rowSprite.scale.set(1.1, 0.55, 1);
      group.add(rowSprite);
    }

    this.scene.add(group);
    return group;
  }

  createTextSprite(text, color = '#ffffff', fontSize = 56) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(mat);
  }

  setupBoards() {
    this.friendlyBoard = this.createBoardMesh('MY FLEET (아군 해역)', -8.0, 0x00e5ff);
    this.enemyBoard = this.createBoardMesh('ENEMY WATERS (적 해역)', 8.0, 0xff3366);

    const boardTotalSize = GRID_SIZE * CELL_SIZE;
    const planeGeom = new THREE.PlaneGeometry(boardTotalSize, boardTotalSize);
    planeGeom.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });

    this.friendlyHitPlane = new THREE.Mesh(planeGeom, planeMat);
    this.friendlyHitPlane.position.set(-8.0, 0.05, 0);
    this.friendlyHitPlane.name = 'friendly_plane';
    this.scene.add(this.friendlyHitPlane);

    this.enemyHitPlane = new THREE.Mesh(planeGeom.clone(), planeMat);
    this.enemyHitPlane.position.set(8.0, 0.05, 0);
    this.enemyHitPlane.name = 'enemy_plane';
    this.scene.add(this.enemyHitPlane);
  }

  setupReticle() {
    const group = new THREE.Group();
    const size = CELL_SIZE * 0.92;
    const shape = new THREE.Shape();
    const hs = size / 2;
    shape.moveTo(-hs, -hs);
    shape.lineTo(hs, -hs);
    shape.lineTo(hs, hs);
    shape.lineTo(-hs, hs);
    shape.closePath();

    const hole = new THREE.Path();
    const ihs = hs - 0.08;
    hole.moveTo(-ihs, -ihs);
    hole.lineTo(-ihs, ihs);
    hole.lineTo(ihs, ihs);
    hole.lineTo(ihs, -ihs);
    hole.closePath();
    shape.holes.push(hole);

    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3344,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const square = new THREE.Mesh(geom, mat);
    group.add(square);

    const crossMat = new THREE.LineBasicMaterial({ color: 0xffdd44 });
    const crossPts = [
      new THREE.Vector3(0, 0.02, -hs), new THREE.Vector3(0, 0.02, -hs + 0.3),
      new THREE.Vector3(0, 0.02, hs), new THREE.Vector3(0, 0.02, hs - 0.3),
      new THREE.Vector3(-hs, 0.02, 0), new THREE.Vector3(-hs + 0.3, 0.02, 0),
      new THREE.Vector3(hs, 0.02, 0), new THREE.Vector3(hs - 0.3, 0.02, 0),
    ];
    const crossGeom = new THREE.BufferGeometry().setFromPoints(crossPts);
    const cross = new THREE.LineSegments(crossGeom, crossMat);
    group.add(cross);

    group.visible = false;
    this.scene.add(group);
    this.targetReticle = group;
  }

  gridToWorld(gridType, x, y) {
    if (this.is2D) return new THREE.Vector3(0, 0, 0);
    const originX = gridType === 'friendly' ? -8.0 : 8.0;
    const boardTotalSize = GRID_SIZE * CELL_SIZE;
    const startX = originX - boardTotalSize / 2;
    const startZ = -boardTotalSize / 2;

    const worldX = startX + (x + 0.5) * CELL_SIZE;
    const worldZ = startZ + (y + 0.5) * CELL_SIZE;
    return new THREE.Vector3(worldX, 0.08, worldZ);
  }

  worldToGrid(gridType, worldPoint) {
    if (this.is2D) return null;
    const originX = gridType === 'friendly' ? -8.0 : 8.0;
    const boardTotalSize = GRID_SIZE * CELL_SIZE;
    const startX = originX - boardTotalSize / 2;
    const startZ = -boardTotalSize / 2;

    const x = Math.floor((worldPoint.x - startX) / CELL_SIZE);
    const y = Math.floor((worldPoint.z - startZ) / CELL_SIZE);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y };
    }
    return null;
  }

  createShipModel(shipId, orientation = 'H', isGhost = false, isValid = true) {
    const shipDef = SHIP_TYPES.find((s) => s.id === shipId) || SHIP_TYPES[0];
    const length = shipDef.size * CELL_SIZE;
    const width = CELL_SIZE * 0.65;
    const height = 0.5;

    const group = new THREE.Group();

    let hullMat;
    if (isGhost) {
      hullMat = new THREE.MeshStandardMaterial({
        color: isValid ? 0x00ff88 : 0xff2244,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
      });
    } else {
      hullMat = new THREE.MeshStandardMaterial({
        color: shipDef.color,
        roughness: 0.4,
        metalness: 0.6,
      });
    }

    const deckMat = isGhost ? hullMat : new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.6,
      metalness: 0.3,
    });

    const towerMat = isGhost ? hullMat : new THREE.MeshStandardMaterial({
      color: 0x718096,
      roughness: 0.3,
      metalness: 0.7,
    });

    const hullGeom = new THREE.BoxGeometry(width, height, length * 0.92);
    hullGeom.translate(0, height / 2, 0);
    const hull = new THREE.Mesh(hullGeom, hullMat);
    hull.castShadow = !isGhost;
    hull.receiveShadow = !isGhost;
    group.add(hull);

    const bowGeom = new THREE.ConeGeometry(width * 0.5, length * 0.18, 4);
    bowGeom.rotateY(Math.PI / 4);
    bowGeom.rotateX(Math.PI / 2);
    const bow = new THREE.Mesh(bowGeom, hullMat);
    bow.position.set(0, height * 0.45, length * 0.46);
    group.add(bow);

    if (shipId === 'carrier') {
      const flightDeckGeom = new THREE.BoxGeometry(width * 1.35, 0.12, length * 0.95);
      const flightDeck = new THREE.Mesh(flightDeckGeom, deckMat);
      flightDeck.position.set(0, height + 0.06, 0);
      flightDeck.castShadow = !isGhost;
      group.add(flightDeck);

      if (!isGhost) {
        const stripeGeom = new THREE.BoxGeometry(0.08, 0.13, length * 0.8);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.set(0, height + 0.08, 0);
        group.add(stripe);
      }

      const islandGeom = new THREE.BoxGeometry(width * 0.3, height * 0.8, length * 0.25);
      const island = new THREE.Mesh(islandGeom, towerMat);
      island.position.set(width * 0.45, height + height * 0.4, 0);
      group.add(island);
    } else if (shipId === 'battleship') {
      const turretGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12);
      const gunGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
      gunGeom.rotateX(Math.PI / 2);

      const turretPositions = [length * 0.26, length * 0.1, -length * 0.26];
      turretPositions.forEach((zPos, idx) => {
        const tMesh = new THREE.Mesh(turretGeom, towerMat);
        tMesh.position.set(0, height + 0.09, zPos);
        const gMesh1 = new THREE.Mesh(gunGeom, towerMat);
        gMesh1.position.set(-0.08, 0.04, idx < 2 ? 0.35 : -0.35);
        const gMesh2 = new THREE.Mesh(gunGeom, towerMat);
        gMesh2.position.set(0.08, 0.04, idx < 2 ? 0.35 : -0.35);
        tMesh.add(gMesh1);
        tMesh.add(gMesh2);
        group.add(tMesh);
      });

      const bridgeGeom = new THREE.BoxGeometry(width * 0.55, height * 1.1, length * 0.22);
      const bridge = new THREE.Mesh(bridgeGeom, towerMat);
      bridge.position.set(0, height + height * 0.55, -length * 0.06);
      group.add(bridge);
    } else if (shipId === 'submarine') {
      const sailGeom = new THREE.BoxGeometry(width * 0.4, height * 0.9, length * 0.28);
      const sail = new THREE.Mesh(sailGeom, towerMat);
      sail.position.set(0, height + height * 0.45, 0);
      group.add(sail);

      const periscopeGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
      const periscope = new THREE.Mesh(periscopeGeom, towerMat);
      periscope.position.set(0, height + height * 0.9, 0);
      group.add(periscope);
    } else {
      const bridgeGeom = new THREE.BoxGeometry(width * 0.55, height * 0.8, length * 0.25);
      const bridge = new THREE.Mesh(bridgeGeom, towerMat);
      bridge.position.set(0, height + height * 0.4, length * 0.05);
      group.add(bridge);

      const gunGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.15, 8);
      const barrel = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
      barrel.rotateX(Math.PI / 2);
      barrel.position.set(0, 0.05, 0.25);
      const gun = new THREE.Mesh(gunGeom, towerMat);
      gun.position.set(0, height + 0.08, length * 0.28);
      gun.add(barrel);
      group.add(gun);
    }

    if (orientation === 'H') {
      group.rotation.y = Math.PI / 2;
    }

    return group;
  }

  setPlacementMode(active, shipDef = null, orientation = 'H') {
    this.isPlacementMode = active;
    this.currentPlacementShip = shipDef;
    this.placementOrientation = orientation;

    if (this.is2D) {
      this.draw2D();
      return;
    }

    if (this.ghostShipGroup) {
      this.scene.remove(this.ghostShipGroup);
      this.ghostShipGroup = null;
    }

    if (active && shipDef) {
      this.ghostShipGroup = this.createShipModel(shipDef.id, orientation, true, true);
      this.ghostShipGroup.visible = false;
      this.scene.add(this.ghostShipGroup);
    }
  }

  updateGhostPlacement(cell, isValid) {
    this.hoverCell = cell;
    this.isGhostValid = isValid;

    if (this.is2D) {
      this.draw2D();
      return;
    }

    if (!this.ghostShipGroup || !this.currentPlacementShip || !cell) {
      if (this.ghostShipGroup) this.ghostShipGroup.visible = false;
      return;
    }

    const ship = this.currentPlacementShip;
    const size = ship.size;
    const isH = this.placementOrientation === 'H';

    const startWorld = this.gridToWorld('friendly', cell.x, cell.y);
    const endX = isH ? cell.x + size - 1 : cell.x;
    const endY = isH ? cell.y : cell.y + size - 1;
    const endWorld = this.gridToWorld('friendly', endX, endY);
    const centerWorld = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);

    this.scene.remove(this.ghostShipGroup);
    this.ghostShipGroup = this.createShipModel(ship.id, this.placementOrientation, true, isValid);
    this.ghostShipGroup.position.copy(centerWorld);
    this.ghostShipGroup.position.y = 0.1;
    this.ghostShipGroup.visible = true;
    this.scene.add(this.ghostShipGroup);
  }

  placeFriendlyShip(shipData) {
    this.placedFriendlyShipsData.set(shipData.id, shipData);

    if (this.is2D) {
      this.draw2D();
      sound.playClick();
      return;
    }

    if (this.friendlyShipMeshes.has(shipData.id)) {
      const old = this.friendlyShipMeshes.get(shipData.id);
      this.scene.remove(old);
      this.friendlyShipMeshes.delete(shipData.id);
    }

    const isH = shipData.orientation === 'H';
    const startWorld = this.gridToWorld('friendly', shipData.x, shipData.y);
    const endX = isH ? shipData.x + shipData.size - 1 : shipData.x;
    const endY = isH ? shipData.y : shipData.y + shipData.size - 1;
    const endWorld = this.gridToWorld('friendly', endX, endY);
    const centerWorld = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);

    const shipMesh = this.createShipModel(shipData.id, shipData.orientation, false, true);
    shipMesh.position.copy(centerWorld);
    shipMesh.position.y = 0.05;

    this.scene.add(shipMesh);
    this.friendlyShipMeshes.set(shipData.id, shipMesh);
    sound.playClick();
  }

  clearFriendlyShips() {
    this.placedFriendlyShipsData.clear();
    if (!this.is2D) {
      this.friendlyShipMeshes.forEach((mesh) => this.scene.remove(mesh));
      this.friendlyShipMeshes.clear();
    } else {
      this.draw2D();
    }
  }

  revealEnemySunkShip(sunkShip) {
    if (!sunkShip) return;
    this.sunkEnemyShipsData.push(sunkShip);

    if (this.is2D) {
      this.draw2D();
      return;
    }

    const cells = sunkShip.cells;
    const isH = cells.length > 1 && cells[0].y === cells[1].y;
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    const maxX = Math.max(...cells.map((c) => c.x));
    const maxY = Math.max(...cells.map((c) => c.y));

    const startWorld = this.gridToWorld('enemy', minX, minY);
    const endWorld = this.gridToWorld('enemy', maxX, maxY);
    const centerWorld = new THREE.Vector3().addVectors(startWorld, endWorld).multiplyScalar(0.5);

    const shipDef = SHIP_TYPES.find((s) => s.size === sunkShip.cells.length) || SHIP_TYPES[0];
    const shipMesh = this.createShipModel(shipDef.id, isH ? 'H' : 'V', false, true);
    shipMesh.position.copy(centerWorld);
    shipMesh.position.y = 0.05;
    this.scene.add(shipMesh);

    this.fx.sinkShip(shipMesh);
  }

  addMarker(gridType, x, y, hit) {
    this.markers.push({ gridType, x, y, hit });

    if (this.is2D) {
      this.draw2D();
      return;
    }

    const worldPos = this.gridToWorld(gridType, x, y);
    let markerMesh;

    if (hit) {
      const geom = new THREE.ConeGeometry(0.24, 0.9, 12);
      geom.rotateX(Math.PI);
      geom.translate(0, 0.45, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff1122,
        emissive: 0xff0022,
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2,
      });
      markerMesh = new THREE.Mesh(geom, mat);
      markerMesh.position.copy(worldPos);
      markerMesh.position.y = 0.2;

      const light = new THREE.PointLight(0xff2200, 1.2, 3);
      light.position.y = 0.5;
      markerMesh.add(light);
    } else {
      const geom = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 12);
      geom.translate(0, 0.22, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.3,
        metalness: 0.5,
      });
      markerMesh = new THREE.Mesh(geom, mat);
      markerMesh.position.copy(worldPos);

      const capGeom = new THREE.SphereGeometry(0.12, 8, 8);
      const capMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.y = 0.45;
      markerMesh.add(cap);
    }

    this.scene.add(markerMesh);
  }

  clearMarkers() {
    if (!this.is2D) {
      this.markers.forEach((m) => {
        if (m.mesh) this.scene.remove(m.mesh);
      });
    }
    this.markers = [];
    this.sunkEnemyShipsData = [];
    if (this.is2D) this.draw2D();
  }

  setCameraView(mode) {
    if (this.is2D) return;
    if (mode === 'overview') {
      this.animateCameraTo(new THREE.Vector3(0, 22, 26), new THREE.Vector3(0, 0, 0));
    } else if (mode === 'target') {
      this.animateCameraTo(new THREE.Vector3(8.0, 18, 16), new THREE.Vector3(8.0, 0, 0));
    } else if (mode === 'fleet') {
      this.animateCameraTo(new THREE.Vector3(-8.0, 18, 16), new THREE.Vector3(-8.0, 0, 0));
    }
  }

  animateCameraTo(targetPos, targetLookAt) {
    if (this.is2D) return;
    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();
    const duration = 1.0;
    let elapsed = 0;

    const tick = () => {
      elapsed += 0.02;
      const t = Math.min(1.0, elapsed / duration);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startLook, targetLookAt, ease);

      if (t < 1.0) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  }

  onMouseMove(event) {
    if (this.is2D) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.isPlacementMode) {
      const hits = this.raycaster.intersectObject(this.friendlyHitPlane);
      if (hits.length > 0) {
        const cell = this.worldToGrid('friendly', hits[0].point);
        this.hoverCell = cell;
        if (this.onFriendlyHover) {
          this.onFriendlyHover(cell);
        }
      } else {
        this.hoverCell = null;
        if (this.ghostShipGroup) this.ghostShipGroup.visible = false;
      }
      return;
    }

    if (this.isAttackEnabled) {
      const hits = this.raycaster.intersectObject(this.enemyHitPlane);
      if (hits.length > 0) {
        const cell = this.worldToGrid('enemy', hits[0].point);
        if (cell) {
          const worldPos = this.gridToWorld('enemy', cell.x, cell.y);
          this.targetReticle.position.copy(worldPos);
          this.targetReticle.position.y = 0.12;
          this.targetReticle.visible = true;
          return;
        }
      }
    }
    this.targetReticle.visible = false;
  }

  onPointerDown(event) {
    if (event.button === 2) {
      event.preventDefault();
      if (this.isPlacementMode && this.onRotateRequest) {
        this.onRotateRequest();
      }
      return;
    }

    if (event.button !== 0) return;

    if (this.is2D) return; // handled by canvas2D listener

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.isPlacementMode) {
      const hits = this.raycaster.intersectObject(this.friendlyHitPlane);
      if (hits.length > 0) {
        const cell = this.worldToGrid('friendly', hits[0].point);
        if (cell && this.onFriendlyCellClick) {
          this.onFriendlyCellClick(cell);
        }
      }
    } else if (this.isAttackEnabled) {
      const hits = this.raycaster.intersectObject(this.enemyHitPlane);
      if (hits.length > 0) {
        const cell = this.worldToGrid('enemy', hits[0].point);
        if (cell && this.onEnemyCellClick) {
          this.onEnemyCellClick(cell);
        }
      }
    }
  }

  onKeyDown(event) {
    if (event.key === 'r' || event.key === 'R') {
      if (this.isPlacementMode && this.onRotateRequest) {
        this.onRotateRequest();
      }
    }
  }

  onWindowResize() {
    this.width = this.container.clientWidth || window.innerWidth || 800;
    this.height = this.container.clientHeight || window.innerHeight || 600;

    if (this.is2D) {
      if (this.canvas2D) {
        this.canvas2D.width = this.width;
        this.canvas2D.height = this.height;
        this.draw2D();
      }
      return;
    }

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    if (this.is2D) return;
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const elapsedTime = (now - this.startTime) / 1000;

    if (this.waterGeom) {
      const posAttr = this.waterGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const u = posAttr.getX(i);
        const w = posAttr.getZ(i);
        const wave = Math.sin(u * 0.12 + elapsedTime * 1.5) * Math.cos(w * 0.12 + elapsedTime * 1.2) * 0.15 +
                     Math.sin(u * 0.05 - elapsedTime * 0.8) * 0.1;
        posAttr.setY(i, wave);
      }
      posAttr.needsUpdate = true;
    }

    if (this.targetReticle && this.targetReticle.visible) {
      const pulse = 1.0 + Math.sin(elapsedTime * 8) * 0.06;
      this.targetReticle.scale.set(pulse, 1, pulse);
    }

    this.friendlyShipMeshes.forEach((mesh) => {
      mesh.position.y = 0.05 + Math.sin(elapsedTime * 1.8 + mesh.position.x) * 0.03;
      mesh.rotation.z = Math.sin(elapsedTime * 1.2 + mesh.position.z) * 0.012;
    });

    if (this.fx) this.fx.update(dt);
    if (this.controls) this.controls.update();
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  }

  // -------------------------------------------------------------
  // High-Tech 2D Tactical Radar Mode Fallback (if WebGL unavailable)
  // -------------------------------------------------------------
  initTactical2D() {
    this.is2D = true;
    this.container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);
    this.canvas2D = canvas;
    this.ctx2D = canvas.getContext('2d');

    this.fx = {
      launchProjectile: (start, end, onHit) => {
        setTimeout(onHit, 400);
      },
      createSplash: () => {},
      createExplosion: () => {},
      sinkShip: () => {},
      update: () => {},
      clear: () => {},
    };

    window.addEventListener('resize', this.onWindowResize.bind(this));
    canvas.addEventListener('mousemove', this.on2DMouseMove.bind(this));
    canvas.addEventListener('pointerdown', this.on2DPointerDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));

    this.draw2D();
  }

  get2DBoardRects() {
    const w = this.width;
    const h = this.height;
    const padding = 20;
    const boardSize = Math.min(w * 0.42, h * 0.65);
    const cellSize = boardSize / GRID_SIZE;

    const centerY = h / 2 - 10;
    const leftX = w * 0.28 - boardSize / 2;
    const rightX = w * 0.72 - boardSize / 2;
    const topY = centerY - boardSize / 2;

    return {
      friendly: { x: leftX, y: topY, size: boardSize, cellSize },
      enemy: { x: rightX, y: topY, size: boardSize, cellSize },
    };
  }

  draw2D() {
    if (!this.ctx2D) return;
    const ctx = this.ctx2D;
    const w = this.width;
    const h = this.height;

    // Deep ocean background
    ctx.fillStyle = '#070f1e';
    ctx.fillRect(0, 0, w, h);

    const { friendly, enemy } = this.get2DBoardRects();

    this.draw2DBoard(ctx, friendly, 'MY FLEET (아군 해역)', '#00e5ff', 'friendly');
    this.draw2DBoard(ctx, enemy, 'ENEMY WATERS (적 해역)', '#ff3366', 'enemy');
  }

  draw2DBoard(ctx, board, title, color, type) {
    const { x, y, size, cellSize } = board;

    // Platform box
    ctx.fillStyle = 'rgba(11, 22, 38, 0.85)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + size / 2, y - 18);

    // Coordinate Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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

    // Coordinate labels
    ctx.fillStyle = '#7a8b9e';
    ctx.font = '11px monospace';
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = 0; i < GRID_SIZE; i++) {
      ctx.fillText(String(i + 1), x + (i + 0.5) * cellSize, y - 4);
      ctx.fillText(rows[i], x - 10, y + (i + 0.5) * cellSize + 4);
    }

    // Render Friendly Placed Ships
    if (type === 'friendly') {
      this.placedFriendlyShipsData.forEach((ship) => {
        ship.cells.forEach((c) => {
          ctx.fillStyle = '#3182ce';
          ctx.fillRect(x + c.x * cellSize + 2, y + c.y * cellSize + 2, cellSize - 4, cellSize - 4);
        });
      });

      // Render Ghost Preview
      if (this.isPlacementMode && this.currentPlacementShip && this.hoverCell) {
        const ship = this.currentPlacementShip;
        const isH = this.placementOrientation === 'H';
        ctx.fillStyle = this.isGhostValid ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 40, 70, 0.6)';

        for (let i = 0; i < ship.size; i++) {
          const cx = isH ? this.hoverCell.x + i : this.hoverCell.x;
          const cy = isH ? this.hoverCell.y : this.hoverCell.y + i;
          if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
            ctx.fillRect(x + cx * cellSize + 2, y + cy * cellSize + 2, cellSize - 4, cellSize - 4);
          }
        }
      }
    }

    // Render Sunk Enemy Ships
    if (type === 'enemy') {
      this.sunkEnemyShipsData.forEach((ship) => {
        ship.cells.forEach((c) => {
          ctx.fillStyle = '#e53e3e';
          ctx.fillRect(x + c.x * cellSize + 2, y + c.y * cellSize + 2, cellSize - 4, cellSize - 4);
        });
      });

      // Reticle
      if (this.isAttackEnabled && this.hoverEnemyCell) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2.5;
        const cx = this.hoverEnemyCell.x;
        const cy = this.hoverEnemyCell.y;
        ctx.strokeRect(x + cx * cellSize + 3, y + cy * cellSize + 3, cellSize - 6, cellSize - 6);
      }
    }

    // Render Peg Markers (Hits and Misses)
    this.markers.filter((m) => m.gridType === type).forEach((m) => {
      const px = x + (m.x + 0.5) * cellSize;
      const py = y + (m.y + 0.5) * cellSize;

      if (m.hit) {
        ctx.fillStyle = '#ff2244';
        ctx.beginPath();
        ctx.arc(px, py, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 5, py - 5);
        ctx.lineTo(px + 5, py + 5);
        ctx.moveTo(px + 5, py - 5);
        ctx.lineTo(px - 5, py + 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(px, py, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  on2DMouseMove(event) {
    if (!this.is2D) return;
    const rect = this.canvas2D.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const { friendly, enemy } = this.get2DBoardRects();

    if (this.isPlacementMode) {
      if (mx >= friendly.x && mx <= friendly.x + friendly.size &&
          my >= friendly.y && my <= friendly.y + friendly.size) {
        const x = Math.floor((mx - friendly.x) / friendly.cellSize);
        const y = Math.floor((my - friendly.y) / friendly.cellSize);
        this.hoverCell = { x, y };
        if (this.onFriendlyHover) this.onFriendlyHover(this.hoverCell);
      } else {
        this.hoverCell = null;
      }
      this.draw2D();
      return;
    }

    if (this.isAttackEnabled) {
      if (mx >= enemy.x && mx <= enemy.x + enemy.size &&
          my >= enemy.y && my <= enemy.y + enemy.size) {
        const x = Math.floor((mx - enemy.x) / enemy.cellSize);
        const y = Math.floor((my - enemy.y) / enemy.cellSize);
        this.hoverEnemyCell = { x, y };
      } else {
        this.hoverEnemyCell = null;
      }
      this.draw2D();
    }
  }

  on2DPointerDown(event) {
    if (!this.is2D) return;
    if (event.button === 2) {
      event.preventDefault();
      if (this.isPlacementMode && this.onRotateRequest) {
        this.onRotateRequest();
      }
      return;
    }
    if (event.button !== 0) return;

    const rect = this.canvas2D.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const { friendly, enemy } = this.get2DBoardRects();

    if (this.isPlacementMode) {
      if (mx >= friendly.x && mx <= friendly.x + friendly.size &&
          my >= friendly.y && my <= friendly.y + friendly.size) {
        const x = Math.floor((mx - friendly.x) / friendly.cellSize);
        const y = Math.floor((my - friendly.y) / friendly.cellSize);
        if (this.onFriendlyCellClick) this.onFriendlyCellClick({ x, y });
      }
    } else if (this.isAttackEnabled) {
      if (mx >= enemy.x && mx <= enemy.x + enemy.size &&
          my >= enemy.y && my <= enemy.y + enemy.size) {
        const x = Math.floor((mx - enemy.x) / enemy.cellSize);
        const y = Math.floor((my - enemy.y) / enemy.cellSize);
        if (this.onEnemyCellClick) this.onEnemyCellClick({ x, y });
      }
    }
  }
}
