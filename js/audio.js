// High-Impact Naval Warfare Web Audio API Sound Synthesizer
// Zero external files - Pure synthesized sub-bass, transients, and acoustic physics!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.compressor = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Dynamics Compressor for punchy, distortion-free loud explosions
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  createNoiseBuffer(duration = 1.5) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pink/Brownian weighted noise for heavy explosion character
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 3.5;
    }
    return buffer;
  }

  // 1. MEGA CANNON / MISSILE LAUNCH BLAST
  playFire() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Layer A: Cannon Muzzle Crack (Sharp supersonic transient)
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(380, t);
    snap.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    snapGain.gain.setValueAtTime(1.2, t);
    snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    snap.connect(snapGain);
    snapGain.connect(this.masterGain);
    snap.start(t);
    snap.stop(t + 0.15);

    // Layer B: Heavy Sub-Bass Gun Thud (Deep 35Hz drop)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.5);
    subGain.gain.setValueAtTime(1.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.55);

    // Layer C: Propellant Blast & Rocket Whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.7);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.6);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.65);
  }

  // 2. EARTH-SHATTERING DIRECT HIT EXPLOSION (KABOOOOOOM!)
  playExplosion() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Layer 1: Devastating Sub-Woofer Shockwave (20Hz ~ 120Hz)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(18, t + 1.2);
    subGain.gain.setValueAtTime(2.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 1.25);

    // Layer 2: Distorted Metal Crunch / Impact Strike
    const osc2 = this.ctx.createOscillator();
    const osc2Gain = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(220, t);
    osc2.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    osc2Gain.gain.setValueAtTime(1.4, t);
    osc2Gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc2.connect(osc2Gain);
    osc2Gain.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.4);

    // Layer 3: Massive Rolling Blast Noise & Debris
    const blast = this.ctx.createBufferSource();
    blast.buffer = this.createNoiseBuffer(1.8);
    const blastFilter = this.ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(2400, t);
    blastFilter.frequency.exponentialRampToValueAtTime(80, t + 1.6);
    const blastGain = this.ctx.createGain();
    blastGain.gain.setValueAtTime(1.8, t);
    blastGain.gain.exponentialRampToValueAtTime(0.005, t + 1.7);
    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(this.masterGain);
    blast.start(t);
    blast.stop(t + 1.7);

    // Layer 4: Shrapnel Crackle & Fire
    const crackle = this.ctx.createBufferSource();
    crackle.buffer = this.createNoiseBuffer(1.0);
    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.setValueAtTime(1800, t);
    crackleFilter.Q.setValueAtTime(2, t);
    const crackleGain = this.ctx.createGain();
    crackleGain.gain.setValueAtTime(0.6, t + 0.1);
    crackleGain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);
    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.masterGain);
    crackle.start(t + 0.05);
    crackle.stop(t + 0.95);
  }

  // 3. HEAVY WATER GEYSER SPLASH (MISS)
  playSplash() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Sub thud of water displacement
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(100, t);
    thud.frequency.exponentialRampToValueAtTime(25, t + 0.4);
    thudGain.gain.setValueAtTime(0.9, t);
    thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(t);
    thud.stop(t + 0.45);

    // Roaring water spray
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.0);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.85);
    filter.Q.setValueAtTime(2.5, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.9);
  }

  // 4. SHIP SUNK EMERGENCY KLAXON & HULL GROAN
  playSunk() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Deep hull groan
    const groan = this.ctx.createOscillator();
    const groanGain = this.ctx.createGain();
    groan.type = 'sawtooth';
    groan.frequency.setValueAtTime(80, t);
    groan.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    groanGain.gain.setValueAtTime(0.7, t);
    groanGain.gain.exponentialRampToValueAtTime(0.01, t + 1.25);
    groan.connect(groanGain);
    groanGain.connect(this.masterGain);
    groan.start(t);
    groan.stop(t + 1.25);

    // Urgent two-tone naval siren
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const start = t + 0.2 + i * 0.4;
      osc.frequency.setValueAtTime(550, start);
      osc.frequency.setValueAtTime(380, start + 0.18);
      gain.gain.setValueAtTime(0.55, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.36);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.38);
    }
  }

  // 5. SONAR RADAR PING
  playSonar() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150, t);
    osc.frequency.exponentialRampToValueAtTime(1120, t + 0.7);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.0);
  }

  // 6. METALLIC CLICK
  playClick() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.07);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // 7. VICTORY FANFARE
  playVictory() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.14);
      gain.gain.setValueAtTime(0.5, t + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 0.75);
    });
  }

  // 8. DEFEAT THUD
  playDefeat() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [349.23, 311.13, 261.63, 196.0];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.28);
      gain.gain.setValueAtTime(0.4, t + idx * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.28 + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.28);
      osc.stop(t + idx * 0.28 + 0.85);
    });
  }
}

export const sound = new SoundEngine();
