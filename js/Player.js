/**
 * PLAYER - PERSONAGEM ORIGINAL "NOVA"
 * Física de voo, gravidade, inércia, animações de corrida e voo, e hitboxes precisas.
 */

import { CONFIG } from './constants.js';
import { Jetpack } from './Jetpack.js';

export class Player {
  constructor() {
    this.jetpack = new Jetpack();
    this.reset();
  }

  reset() {
    this.x = CONFIG.PLAYER.SPAWN_X;
    this.y = CONFIG.PHYSICS.GROUND_Y;
    this.vy = 0;
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;

    this.isThrusting = false;
    this.isOnGround = true;
    this.isDead = false;

    // Estados de Power-up
    this.hasShield = false;
    this.isTurbo = false;
    this.isGravityInverted = false;
    this.invulnerableTimer = 0; // Temporizador após dano/escudo

    // Animação
    this.runAnimTimer = 0;
    this.runFrame = 0;
    this.trailHistory = []; // Para efeito de rastro no Turbo
    this.tiltAngle = 0;     // Inclinação dinâmica do corpo

    this.jetpack.reset();
  }

  /**
   * Atualiza a física do personagem
   */
  update(dt, audioManager) {
    if (this.isDead) return;

    // Atualiza temporizador de invulnerabilidade
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Aplica forças: Impulso do Jetpack vs Gravidade
    let effectiveGravity = CONFIG.PHYSICS.GRAVITY;
    let effectiveThrust = CONFIG.PHYSICS.JETPACK_THRUST;

    if (this.isGravityInverted) {
      effectiveGravity = -CONFIG.PHYSICS.GRAVITY;
      effectiveThrust = -CONFIG.PHYSICS.JETPACK_THRUST;
    }

    if (this.isThrusting) {
      // Subindo com Jetpack
      this.vy += effectiveThrust * dt;
      this.jetpack.activate();
      if (audioManager) audioManager.startJetpack();
    } else {
      // Caindo com Gravidade
      this.vy += effectiveGravity * dt;
      this.jetpack.deactivate();
      if (audioManager) audioManager.stopJetpack();
    }

    // Inércia e amortecimento
    this.vy *= CONFIG.PHYSICS.INERTIA_DAMPING;

    // Limites de velocidade terminal
    if (this.vy > CONFIG.PHYSICS.MAX_FALL_SPEED) {
      this.vy = CONFIG.PHYSICS.MAX_FALL_SPEED;
    } else if (this.vy < CONFIG.PHYSICS.MAX_RISE_SPEED) {
      this.vy = CONFIG.PHYSICS.MAX_RISE_SPEED;
    }

    // Atualiza posição Y
    this.y += this.vy * dt;

    // Colisão com o Solo
    const groundLimit = CONFIG.PHYSICS.GROUND_Y;
    const ceilingLimit = CONFIG.CEILING_Y;

    if (this.y >= groundLimit) {
      this.y = groundLimit;
      this.vy = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }

    // Colisão com o Teto
    if (this.y <= ceilingLimit) {
      this.y = ceilingLimit;
      if (this.vy < 0) this.vy = 0;
    }

    // Inclinação aerodinâmica baseada na velocidade vertical
    const targetAngle = (this.vy / CONFIG.PHYSICS.MAX_FALL_SPEED) * 0.22;
    this.tiltAngle += (targetAngle - this.tiltAngle) * 0.15;

    // Animação de corrida no chão
    if (this.isOnGround) {
      this.runAnimTimer += dt * 12;
      this.runFrame = Math.floor(this.runAnimTimer) % 4;
      this.tiltAngle = 0;
    }

    // Atualiza partículas do propulsor
    this.jetpack.update(dt, this.x, this.y, this.isTurbo, this.isGravityInverted);

    // Rastro visual durante o Turbo
    if (this.isTurbo) {
      this.trailHistory.push({ x: this.x, y: this.y, angle: this.tiltAngle, alpha: 0.6 });
      if (this.trailHistory.length > 7) {
        this.trailHistory.shift();
      }
    } else {
      this.trailHistory = [];
    }
  }

  /**
   * Obtém caixa delimitadora de colisão (hitbox precisa e justa)
   */
  getHitbox() {
    // Reduz ligeiramente a hitbox externa para jogabilidade justa
    const insetX = 6;
    const insetY = 4;
    return {
      x: this.x + insetX,
      y: this.y + insetY,
      width: this.width - insetX * 2,
      height: this.height - insetY * 2
    };
  }

  /**
   * Renderização completa do personagem e efeitos
   */
  draw(ctx) {
    // Rastros de velocidade no modo Turbo
    if (this.isTurbo && this.trailHistory.length > 0) {
      ctx.save();
      for (let i = 0; i < this.trailHistory.length; i++) {
        const tr = this.trailHistory[i];
        ctx.globalAlpha = (i + 1) / this.trailHistory.length * 0.35;
        this.drawCharacterSprite(ctx, tr.x - (this.trailHistory.length - i) * 8, tr.y, tr.angle, true);
      }
      ctx.restore();
    }

    // Partículas do jetpack são desenhadas primeiro para ficarem atrás do corpo
    this.jetpack.drawParticles(ctx);

    // Piscar se estiver temporariamente invulnerável (pós-escudo)
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 12) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Desenha o personagem
    this.drawCharacterSprite(ctx, this.x, this.y, this.tiltAngle, false);

    ctx.globalAlpha = 1.0;

    // Escudo Protetor (aura esférica futurista)
    if (this.hasShield) {
      this.drawShieldAura(ctx);
    }
  }

  /**
   * Desenho procedural detalhado do corredor cibernético "Nova"
   */
  drawCharacterSprite(ctx, px, py, angle, isSilhouette = false) {
    ctx.save();
    ctx.translate(px + this.width / 2, py + this.height / 2);
    ctx.rotate(angle);

    if (this.isGravityInverted) {
      ctx.scale(1, -1);
    }

    const ox = -this.width / 2;
    const oy = -this.height / 2;

    if (isSilhouette) {
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.fillRect(ox, oy, this.width, this.height);
      ctx.restore();
      return;
    }

    // 1. Jetpack nas costas
    this.jetpack.drawEquipped(ctx, ox + 6, oy, this.isGravityInverted);

    // 2. Pernas / Pés com animação de corrida ou voo
    ctx.fillStyle = '#0f1626';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;

    if (this.isOnGround) {
      // Ciclo de corrida de 4 poses
      const legPhase = [
        { l1: 0, l2: 10 },
        { l1: 6, l2: 4 },
        { l1: 10, l2: 0 },
        { l1: 4, l2: 6 }
      ][this.runFrame];

      // Perna esquerda (frente)
      ctx.beginPath();
      ctx.roundRect(ox + 8, oy + 32, 8, 16 - legPhase.l1 * 0.4, 3);
      ctx.fill();
      ctx.stroke();

      // Perna direita (traseira)
      ctx.beginPath();
      ctx.roundRect(ox + 18, oy + 32, 8, 16 - legPhase.l2 * 0.4, 3);
      ctx.fill();
      ctx.stroke();

      // Botas com propulsores magnéticos nos calcanhares
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(ox + 7, oy + 46 - legPhase.l1 * 0.4, 9, 3);
      ctx.fillRect(ox + 17, oy + 46 - legPhase.l2 * 0.4, 9, 3);
    } else {
      // Pose de voo: pernas inclinadas aerodinamicamente
      ctx.beginPath();
      ctx.roundRect(ox + 8, oy + 33, 9, 14, 3);
      ctx.roundRect(ox + 18, oy + 31, 9, 14, 3);
      ctx.fill();
      ctx.stroke();

      // Brilho dos estabilizadores das botas
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 3;
      ctx.fillRect(ox + 8, oy + 44, 9, 3);
      ctx.fillRect(ox + 18, oy + 42, 9, 3);
      ctx.shadowBlur = 0;
    }

    // 3. Tronco e Peitoral Nano-tecnológico
    ctx.fillStyle = '#182033';
    ctx.beginPath();
    ctx.roundRect(ox + 8, oy + 15, 20, 20, 4);
    ctx.fill();

    // Detalhes da armadura peitoral
    ctx.fillStyle = '#232f4b';
    ctx.beginPath();
    ctx.roundRect(ox + 10, oy + 17, 16, 12, 2);
    ctx.fill();

    // Reator Arc no peito (Luz pulsante)
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(ox + 18, oy + 23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Cabeça / Capacete Futurista
    ctx.fillStyle = '#0e1424';
    ctx.beginPath();
    ctx.roundRect(ox + 10, oy + 2, 17, 15, 5);
    ctx.fill();

    // Visor Neon Curvo
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.roundRect(ox + 17, oy + 5, 11, 6, 2);
    ctx.fill();

    // Linha de dados no capacete
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 4;
    ctx.fillRect(ox + 11, oy + 4, 3, 2);
    ctx.shadowBlur = 0;

    // 5. Braço / Manopla de controle
    ctx.fillStyle = '#222b42';
    ctx.beginPath();
    ctx.roundRect(ox + 14, oy + 21, 14, 7, 3);
    ctx.fill();

    // Luz da manopla
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(ox + 23, oy + 23, 4, 3);

    ctx.restore();
  }

  /**
   * Desenha a cúpula do escudo quântico
   */
  drawShieldAura(ctx) {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const radius = 34;

    const time = performance.now() * 0.003;

    // Gradiente esférico translúcido
    const grad = ctx.createRadialGradient(centerX, centerY, radius * 0.4, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
    grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.85)');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Anel orbital de contenção
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, time, time + Math.PI * 1.4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, time + Math.PI, time + Math.PI * 2.4);
    ctx.stroke();

    ctx.restore();
  }
}
