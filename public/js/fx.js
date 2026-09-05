import * as THREE from 'three';

export class FXManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.particles = [];
    this.projectiles = [];
    this.smokeEmitters = [];
    this.sinkingShips = [];
    this.trauma = 0;
    this.originalCamPos = null;
  }

  // Camera Shake
  shake(amount = 0.5) {
    this.trauma = Math.min(1.0, this.trauma + amount);
    if (!this.originalCamPos && this.camera) {
      this.originalCamPos = this.camera.position.clone();
    }
  }

  // Launch ballistic projectile from startPos to endPos
  launchProjectile(startPos, endPos, onHit) {
    const group = new THREE.Group();

    // Shell mesh
    const shellGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
    shellGeom.rotateX(Math.PI / 2);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const shellMesh = new THREE.Mesh(shellGeom, shellMat);
    group.add(shellMesh);

    // Glow point light
    const light = new THREE.PointLight(0xff7700, 2.5, 6);
    group.add(light);

    this.scene.add(group);

    const distance = startPos.distanceTo(endPos);
    const arcHeight = Math.max(5, distance * 0.35);
    const duration = 0.85; // seconds
    let elapsed = 0;

    this.projectiles.push({
      group,
      startPos: startPos.clone(),
      endPos: endPos.clone(),
      arcHeight,
      duration,
      elapsed,
      onHit,
      lastTrail: 0,
    });
  }

  // Splash Effect (Miss)
  createSplash(pos) {
    const particleCount = 28;
    const geom = new THREE.DodecahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x99ddff,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geom, mat.clone());
      p.position.copy(pos);
      p.position.y += 0.1;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      const vY = 3.5 + Math.random() * 4.0;

      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        vY,
        Math.sin(angle) * speed
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -14.0,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
      });
    }

    // Expanding water ring wave
    const ringGeom = new THREE.RingGeometry(0.1, 0.4, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xccffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(pos);
    ring.position.y += 0.05;
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      isRing: true,
      scaleSpeed: 4.5,
      life: 0.7,
      maxLife: 0.7,
    });
  }

  // Explosion Effect (Hit)
  createExplosion(pos) {
    this.shake(0.4);

    // 1. Central expanding fireball
    const fireGeom = new THREE.SphereGeometry(0.4, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 1.0,
    });
    const fireball = new THREE.Mesh(fireGeom, fireMat);
    fireball.position.copy(pos);
    fireball.position.y += 0.3;
    this.scene.add(fireball);

    this.particles.push({
      mesh: fireball,
      isFireball: true,
      scaleSpeed: 5.0,
      life: 0.45,
      maxLife: 0.45,
    });

    // 2. Flying hot debris / sparks
    const sparkCount = 35;
    const sparkGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < sparkCount; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xff5511 : 0xffcc00,
        transparent: true,
        opacity: 1.0,
      });
      const spark = new THREE.Mesh(sparkGeom, sparkMat);
      spark.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // upward hemisphere
      const speed = 3.5 + Math.random() * 5.0;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 2.0,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.scene.add(spark);
      this.particles.push({
        mesh: spark,
        vel,
        gravity: -16.0,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
      });
    }

    // 3. Add ongoing smoke emitter at this coordinate
    this.addSmokeEmitter(pos);
  }

  // Persistent smoke over burning hit ship tile
  addSmokeEmitter(pos) {
    this.smokeEmitters.push({
      pos: pos.clone(),
      timer: 0,
    });
  }

  // Sinking ship animation
  sinkShip(shipMesh, onComplete) {
    this.shake(0.6);
    this.sinkingShips.push({
      mesh: shipMesh,
      startPos: shipMesh.position.clone(),
      startRot: shipMesh.rotation.clone(),
      progress: 0,
      duration: 3.5, // 3.5 seconds sinking sequence
      onComplete,
    });
  }

  update(dt) {
    // 1. Camera Shake decay
    if (this.trauma > 0 && this.originalCamPos) {
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
      const shakeOffset = (this.trauma * this.trauma) * 0.45;
      this.camera.position.x = this.originalCamPos.x + (Math.random() * 2 - 1) * shakeOffset;
      this.camera.position.y = this.originalCamPos.y + (Math.random() * 2 - 1) * shakeOffset;
      this.camera.position.z = this.originalCamPos.z + (Math.random() * 2 - 1) * shakeOffset;
      if (this.trauma === 0) {
        this.camera.position.copy(this.originalCamPos);
        this.originalCamPos = null;
      }
    }

    // 2. Projectiles update
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.elapsed += dt;
      const t = Math.min(1.0, p.elapsed / p.duration);

      // Parabolic trajectory
      const currentPos = new THREE.Vector3().lerpVectors(p.startPos, p.endPos, t);
      currentPos.y += 4 * p.arcHeight * t * (1 - t);

      // Orientation towards travel tangent
      const nextT = Math.min(1.0, t + 0.02);
      const nextPos = new THREE.Vector3().lerpVectors(p.startPos, p.endPos, nextT);
      nextPos.y += 4 * p.arcHeight * nextT * (1 - nextT);
      p.group.position.copy(currentPos);
      p.group.lookAt(nextPos);

      // Spawn trail particle occasionally
      if (p.elapsed - p.lastTrail > 0.04) {
        p.lastTrail = p.elapsed;
        const trailGeom = new THREE.SphereGeometry(0.18, 6, 6);
        const trailMat = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.6,
        });
        const trailMesh = new THREE.Mesh(trailGeom, trailMat);
        trailMesh.position.copy(currentPos);
        this.scene.add(trailMesh);
        this.particles.push({
          mesh: trailMesh,
          vel: new THREE.Vector3(0, 0.2, 0),
          gravity: 0,
          scaleSpeed: 1.5,
          life: 0.4,
          maxLife: 0.4,
        });
      }

      if (t >= 1.0) {
        this.scene.remove(p.group);
        if (p.onHit) p.onHit(p.endPos);
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      const lifeRatio = Math.max(0, part.life / part.maxLife);

      if (part.isRing) {
        part.mesh.scale.addScalar(part.scaleSpeed * dt);
        part.mesh.material.opacity = lifeRatio * 0.8;
      } else if (part.isFireball) {
        part.mesh.scale.addScalar(part.scaleSpeed * dt);
        part.mesh.material.opacity = lifeRatio;
        if (lifeRatio < 0.5) {
          part.mesh.material.color.setHex(0x555555); // fade into smoke
        }
      } else {
        if (part.vel) {
          part.vel.y += (part.gravity || 0) * dt;
          part.mesh.position.addScaledVector(part.vel, dt);
        }
        if (part.scaleSpeed) {
          part.mesh.scale.addScalar(part.scaleSpeed * dt);
        }
        part.mesh.material.opacity = lifeRatio;
      }

      if (part.life <= 0) {
        this.scene.remove(part.mesh);
        if (part.mesh.geometry) part.mesh.geometry.dispose();
        if (part.mesh.material) part.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 4. Smoke Emitters (intermittent smoke puffs from burning tiles)
    for (const emitter of this.smokeEmitters) {
      emitter.timer += dt;
      if (emitter.timer > 0.18) {
        emitter.timer = 0;
        const geom = new THREE.SphereGeometry(0.2, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.5,
        });
        const puff = new THREE.Mesh(geom, mat);
        puff.position.copy(emitter.pos);
        puff.position.x += (Math.random() - 0.5) * 0.3;
        puff.position.z += (Math.random() - 0.5) * 0.3;
        this.scene.add(puff);

        this.particles.push({
          mesh: puff,
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4),
          scaleSpeed: 0.8,
          life: 1.2,
          maxLife: 1.2,
        });
      }
    }

    // 5. Sinking Ships
    for (let i = this.sinkingShips.length - 1; i >= 0; i--) {
      const item = this.sinkingShips[i];
      item.progress += dt / item.duration;
      const t = Math.min(1.0, item.progress);

      // Sink downward and roll/tilt dramatically
      item.mesh.position.y = item.startPos.y - t * 2.8;
      item.mesh.rotation.z = item.startRot.z + Math.sin(t * Math.PI) * 0.45;
      item.mesh.rotation.x = item.startRot.x + t * 0.35;

      // Occasional water bubble around sinking hull
      if (Math.random() < 0.25) {
        this.createSplash(new THREE.Vector3(
          item.mesh.position.x + (Math.random() - 0.5) * 2,
          0,
          item.mesh.position.z + (Math.random() - 0.5) * 2
        ));
      }

      if (t >= 1.0) {
        if (item.onComplete) item.onComplete();
        this.sinkingShips.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
    this.projectiles.forEach((p) => this.scene.remove(p.group));
    this.projectiles = [];
    this.smokeEmitters = [];
    this.sinkingShips = [];
  }
}
