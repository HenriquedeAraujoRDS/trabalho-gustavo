/**
 * AUDIOMANAGER - GERENCIADOR DE ÁUDIO PROCEDURAL SINTETIZADO (WEB AUDIO API)
 * Gera todos os efeitos sonoros e música synthwave retro-futurista sem arquivos externos.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Nós de áudio para o propulsor contínuo
    this.jetpackOsc = null;
    this.jetpackGain = null;
    this.jetpackFilter = null;
    this.isJetpackPlaying = false;

    // Música de fundo sintetizada
    this.bgmTimer = null;
    this.isMusicPlaying = false;
    this.musicStep = 0;

    // Carregar preferência salva
    const savedMute = localStorage.getItem('astropulse_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  /**
   * Inicializa o AudioContext após interação do usuário (evita bloqueio do navegador)
   */
  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initJetpackSound();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API não suportada:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Configura o som contínuo do propulsor iônico
   */
  initJetpackSound() {
    if (!this.ctx) return;
    
    // Oscilador de baixa frequência + gerador de ruído filtrado
    this.jetpackGain = this.ctx.createGain();
    this.jetpackGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.jetpackGain.connect(this.ctx.destination);

    this.jetpackFilter = this.ctx.createBiquadFilter();
    this.jetpackFilter.type = 'lowpass';
    this.jetpackFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.jetpackFilter.connect(this.jetpackGain);

    // Oscilador serra para o ronco do motor de plasma
    this.jetpackOsc = this.ctx.createOscillator();
    this.jetpackOsc.type = 'sawtooth';
    this.jetpackOsc.frequency.setValueAtTime(85, this.ctx.currentTime);
    this.jetpackOsc.connect(this.jetpackFilter);

    // Buffer de ruído para o ar/plasma do propulsor
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(750, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.jetpackFilter);

    try {
      this.jetpackOsc.start();
      whiteNoise.start();
    } catch (e) {
      // Ignora se já iniciado
    }
  }

  /**
   * Ativa o som contínuo do jetpack ao acelerar
   */
  startJetpack() {
    if (this.isMuted || !this.ctx || !this.jetpackGain) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    this.jetpackGain.gain.cancelScheduledValues(t);
    this.jetpackGain.gain.setTargetAtTime(0.25, t, 0.05);

    if (this.jetpackFilter) {
      this.jetpackFilter.frequency.cancelScheduledValues(t);
      this.jetpackFilter.frequency.setTargetAtTime(800, t, 0.08);
    }
    this.isJetpackPlaying = true;
  }

  /**
   * Suaviza e cessa o som do jetpack ao soltar
   */
  stopJetpack() {
    if (!this.ctx || !this.jetpackGain) return;
    const t = this.ctx.currentTime;
    this.jetpackGain.gain.cancelScheduledValues(t);
    this.jetpackGain.gain.setTargetAtTime(0.0001, t, 0.08);

    if (this.jetpackFilter) {
      this.jetpackFilter.frequency.cancelScheduledValues(t);
      this.jetpackFilter.frequency.setTargetAtTime(250, t, 0.1);
    }
    this.isJetpackPlaying = false;
  }

  /**
   * Som de coleta de moeda / célula quântica (arpeggio cristalino)
   */
  playCoin() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Salto de tom agradável (E6 para B6)
    osc.frequency.setValueAtTime(1318.5, t);
    osc.frequency.setValueAtTime(1975.5, t + 0.06);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Som de alerta de míssil se aproximando
   */
  playWarning() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.setValueAtTime(1250, t + 0.05);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Som de explosão / destruição de míssil ou colisão
   */
  playExplosion() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.38);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Som ao pegar um Power-up
   */
  playPowerup() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde C Maior brilhante
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.32);
    });
  }

  /**
   * Som do Escudo quebrando
   */
  playShieldBreak() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Som de Game Over
   */
  playGameOver() {
    this.stopJetpack();
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const notes = [440, 392, 349.23, 261.63]; // Escala descendente
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.25, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.28);
    });
  }

  /**
   * Trilha sonora sintetizada de fundo (ritmo synthwave animado)
   */
  startMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    this.ensureContext();
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const tempo = 125; // BPM
    const stepTime = (60 / tempo) / 4; // Semicolcheia

    // Padrão de baixo synthwave
    const bassline = [
      110, 110, 164.8, 110,  130.8, 130.8, 196, 130.8,
      98, 98, 146.8, 98,     82.4, 82.4, 123.5, 98
    ];

    const playStep = () => {
      if (!this.isMusicPlaying || this.isMuted || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      const freq = bassline[this.musicStep % bassline.length];

      // Nota do baixo
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(150, t + stepTime * 0.8);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + stepTime * 0.9);

      // Efeito de chimbal eletrônico nos contra-tempos
      if (this.musicStep % 2 === 1) {
        this.playHiHat(t);
      }

      this.musicStep++;
      this.bgmTimer = setTimeout(playStep, stepTime * 1000);
    };

    playStep();
  }

  playHiHat(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'highpass';
    osc.frequency.setValueAtTime(7000, time);

    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('astropulse_muted', this.isMuted.toString());
    if (this.isMuted) {
      this.stopJetpack();
      this.stopMusic();
    } else {
      this.ensureContext();
      this.startMusic();
    }
    return this.isMuted;
  }
}
