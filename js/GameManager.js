/**
 * GAMEMANAGER - COORDENADOR CENTRAL DO JOGO
 * Loop com Delta Time, máquina de estados, renderização parallax e gerenciamento de entrada.
 */

import { CONFIG } from './constants.js';
import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CoinManager } from './CoinManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { ScoreManager } from './ScoreManager.js';
import { AudioManager } from './AudioManager.js';
import { UI } from './UI.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Módulos
    this.audioManager = new AudioManager();
    this.scoreManager = new ScoreManager();
    this.player = new Player();
    this.obstacleManager = new ObstacleManager();
    this.coinManager = new CoinManager();
    this.powerUpManager = new PowerUpManager();
    this.ui = new UI(this);

    // Estados: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'MENU';

    // Delta Time
    this.lastTime = performance.now();
    this.currentSpeed = CONFIG.SPEED.BASE;

    // Trepidação de tela (Screen Shake)
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Parallax Offsets
    this.bgFarOffset = 0;
    this.bgMidOffset = 0;
    this.fgOffset = 0;

    // Entrada (teclado, mouse, toque)
    this.inputPressed = false;

    this.initCanvasSize();
    this.initInputListeners();

    // Inicia loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initCanvasSize() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;

      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      // Fator de escala virtual para manter física consistente independente do tamanho da tela
      this.scale = this.height / CONFIG.VIRTUAL_HEIGHT;
    };

    window.addEventListener('resize', resize);
    resize();
  }

  initInputListeners() {
    // 1. Teclado
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (this.state === 'PLAYING') {
          this.inputPressed = true;
          this.player.isThrusting = true;
        } else if (this.state === 'MENU') {
          this.startGame();
        } else if (this.state === 'GAMEOVER') {
          this.restartGame();
        }
        e.preventDefault();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.togglePause();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.inputPressed = false;
        if (this.state === 'PLAYING') {
          this.player.isThrusting = false;
        }
      }
    });

    // 2. Mouse e Toque (Canvas)
    const onActionStart = (e) => {
      // Ignora se o clique foi em um botão da UI
      if (e.target.closest('button') || e.target.closest('.screen-overlay')) return;

      if (this.state === 'PLAYING') {
        this.inputPressed = true;
        this.player.isThrusting = true;
      }
    };

    const onActionEnd = () => {
      this.inputPressed = false;
      if (this.state === 'PLAYING') {
        this.player.isThrusting = false;
      }
    };

    window.addEventListener('mousedown', onActionStart);
    window.addEventListener('mouseup', onActionEnd);
    window.addEventListener('touchstart', onActionStart, { passive: false });
    window.addEventListener('touchend', onActionEnd);
    window.addEventListener('touchcancel', onActionEnd);
  }

  startGame() {
    this.audioManager.ensureContext();
    this.audioManager.startMusic();
    this.restartGame();
  }

  restartGame() {
    this.scoreManager.resetRun();
    this.player.reset();
    this.obstacleManager.reset();
    this.coinManager.reset();
    this.powerUpManager.reset();
    this.powerUpManager.setUpgrades(this.scoreManager.upgrades);

    this.currentSpeed = CONFIG.SPEED.BASE;
    this.state = 'PLAYING';
    this.player.isThrusting = this.inputPressed;

    this.ui.showGame();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.audioManager.stopJetpack();
      this.ui.showPause();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
      this.ui.hidePause();
    }
  }

  goToMenu() {
    this.state = 'MENU';
    this.audioManager.stopJetpack();
    this.ui.showMenu();
  }

  triggerScreenShake(duration = 0.35, intensity = 8) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  /**
   * Loop principal do jogo
   */
  gameLoop(currentTime) {
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Limita dt para evitar saltos quânticos se a aba perder o foco
    if (dt > 0.05) dt = 0.05;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.draw();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Atualização de todos os subsistemas
   */
  update(dt) {
    // 1. Atualizar velocidade e escalonamento
    const baseProgress = CONFIG.SPEED.BASE + this.scoreManager.distance * CONFIG.SPEED.ACCELERATION_PER_METER;
    const cappedSpeed = Math.min(CONFIG.SPEED.MAX, baseProgress);
    const effectiveSpeed = this.player.isTurbo ? cappedSpeed * CONFIG.SPEED.TURBO_MULTIPLIER : cappedSpeed;
    this.currentSpeed = effectiveSpeed;

    // 2. Atualizar Parallax
    this.bgFarOffset = (this.bgFarOffset + this.currentSpeed * 0.2 * dt) % CONFIG.VIRTUAL_WIDTH;
    this.bgMidOffset = (this.bgMidOffset + this.currentSpeed * 0.5 * dt) % CONFIG.VIRTUAL_WIDTH;
    this.fgOffset = (this.fgOffset + this.currentSpeed * dt) % CONFIG.VIRTUAL_WIDTH;

    // 3. Atualizar Trepidação
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    // 4. Atualizar Jogador e Física
    this.player.update(dt, this.audioManager);

    // 5. Atualizar Obstáculos e checar colisões
    this.obstacleManager.update(dt, this.currentSpeed, this.scoreManager.distance, this.player, this.audioManager);

    const hitObstacle = this.obstacleManager.checkCollisions(this.player);
    if (hitObstacle) {
      if (this.player.isTurbo) {
        // Modo Turbo destrói obstáculos sem sofrer dano
        hitObstacle.isDead = true;
        this.triggerScreenShake(0.2, 5);
        this.audioManager.playExplosion();
      } else if (this.player.hasShield) {
        // Escudo absorve o impacto
        hitObstacle.isDead = true;
        this.powerUpManager.breakShield(this.player, this.audioManager, this.ui);
        this.triggerScreenShake(0.3, 7);
      } else if (this.player.invulnerableTimer <= 0) {
        // Colisão fatal!
        this.gameOver();
        return;
      }
    }

    // 6. Atualizar Moedas e Atração Magnética
    let magnetRadius = 0;
    if (this.powerUpManager.activePowerUp && this.powerUpManager.activePowerUp.typeKey === 'MAGNET') {
      const upgradeBonus = (this.scoreManager.upgrades.magnet_boost || 0) * 70;
      magnetRadius = CONFIG.POWERUPS.MAGNET.radius + upgradeBonus;
    }
    this.coinManager.update(dt, this.currentSpeed, this.player, magnetRadius, this.audioManager, this.scoreManager);

    // 7. Atualizar Power-ups
    this.powerUpManager.update(dt, this.currentSpeed, this.player, this.audioManager, this.scoreManager, this.ui);

    // 8. Atualizar Pontuação e HUD
    this.scoreManager.update(dt, this.currentSpeed);
    this.ui.updateHUD(this.scoreManager.distance, this.scoreManager.coins, this.scoreManager.score);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.player.isDead = true;
    this.triggerScreenShake(0.6, 14);

    this.audioManager.playExplosion();
    this.audioManager.playGameOver();

    this.scoreManager.finishRun(this.obstacleManager.totalDodgedMissiles);

    setTimeout(() => {
      this.ui.showGameOver(
        this.scoreManager.distance,
        this.scoreManager.coins,
        this.scoreManager.score,
        this.scoreManager.highScore,
        this.scoreManager.isNewRecord,
        this.scoreManager.justCompletedMissions
      );
    }, 650);
  }

  /**
   * Renderização do jogo
   */
  draw() {
    const ctx = this.ctx;

    // Limpa o canvas inteiro para evitar fantasmas de frames anteriores
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // Aplica trepidação de tela
    if (this.shakeDuration > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // Escala para resolução virtual
    ctx.scale(this.scale, this.scale);

    // Largura visível real em coordenadas virtuais (pode ser > VIRTUAL_WIDTH)
    this.visibleVW = this.width / this.scale;

    // 1. Fundo do Complexo Quântico com Parallax
    this.drawParallaxBackground(ctx);

    // 2. Obstáculos
    this.obstacleManager.draw(ctx);

    // 3. Células de Energia (Moedas)
    this.coinManager.draw(ctx);

    // 4. Power-ups no chão/ar
    this.powerUpManager.draw(ctx);

    // 5. Jogador e Jetpack
    this.player.draw(ctx);

    // 6. Efeito de Linhas de Hiper-Velocidade no modo Turbo
    if (this.player.isTurbo) {
      this.drawSpeedLines(ctx);
    }

    // 7. Chão e Teto do Laboratório
    this.drawFloorAndCeiling(ctx);

    ctx.restore();
  }

  /**
   * Fundo sci-fi com 3 camadas de profundidade
   */
  drawParallaxBackground(ctx) {
    const vw = this.visibleVW || CONFIG.VIRTUAL_WIDTH;
    const vh = CONFIG.VIRTUAL_HEIGHT;

    // Gradiente de fundo do complexo (cobre toda a largura visível)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
    skyGrad.addColorStop(0, '#090b16');
    skyGrad.addColorStop(0.5, '#0e1222');
    skyGrad.addColorStop(1, '#05070e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh);

    // CAMADA 1 (DISTANTE): Painéis de servidores e linhas de grade neon
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = -this.bgFarOffset; x < vw + 100; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, 480);
      ctx.stroke();

      // Painéis e torres ao fundo
      ctx.fillStyle = 'rgba(12, 18, 35, 0.45)';
      ctx.fillRect(x + 10, 120, 50, 360);

      // Luzes piscantes dos servidores
      ctx.fillStyle = (Math.floor(x) % 3 === 0) ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 85, 0.3)';
      ctx.fillRect(x + 20, 160, 6, 4);
      ctx.fillRect(x + 35, 180, 6, 4);
      ctx.fillRect(x + 20, 220, 6, 4);
    }

    // CAMADA 2 (MÉDIA): Conduítes e tubulações industriais
    ctx.fillStyle = '#111728';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;

    for (let x = -this.bgMidOffset; x < vw + 120; x += 140) {
      // Dutos verticais
      ctx.fillRect(x, 40, 18, 440);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.fillRect(x + 4, 40, 10, 440);

      // Anéis de reforço do duto
      ctx.fillStyle = '#1c2438';
      ctx.fillRect(x - 2, 140, 22, 10);
      ctx.fillRect(x - 2, 280, 22, 10);
      ctx.fillRect(x - 2, 400, 22, 10);
    }
  }

  /**
   * Renderiza teto energizado e solo do setor industrial
   */
  drawFloorAndCeiling(ctx) {
    const vw = this.visibleVW || CONFIG.VIRTUAL_WIDTH;

    // TETO (cobre toda a largura visível)
    ctx.fillStyle = '#0a0d18';
    ctx.fillRect(0, 0, vw, CONFIG.CEILING_Y);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.CEILING_Y);
    ctx.lineTo(vw, CONFIG.CEILING_Y);
    ctx.stroke();

    // CHÃO (cobre toda a largura visível)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d111e';
    ctx.fillRect(0, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT, vw, 60);

    // Linha de luz guia no solo
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT);
    ctx.lineTo(vw, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT);
    ctx.stroke();

    // Faixas de sinalização amarela/preta no piso rolante
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 183, 3, 0.4)';
    for (let x = -this.fgOffset; x < vw + 60; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT + 4);
      ctx.lineTo(x + 20, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT + 4);
      ctx.lineTo(x + 10, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT + 14);
      ctx.lineTo(x - 10, CONFIG.PHYSICS.GROUND_Y + CONFIG.PLAYER.HEIGHT + 14);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Efeito de linhas de velocidade supersônica durante o Turbo
   */
  drawSpeedLines(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
    ctx.lineWidth = 2;
    const count = 8;

    for (let i = 0; i < count; i++) {
      const y = CONFIG.CEILING_Y + Math.random() * (CONFIG.PHYSICS.GROUND_Y - CONFIG.CEILING_Y);
      const x = Math.random() * CONFIG.VIRTUAL_WIDTH;
      const len = 80 + Math.random() * 140;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
