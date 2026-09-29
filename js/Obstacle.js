/**
 * OBSTACLE - CLASSES DE OBSTÁCULOS E AMEAÇAS DO COMPLEXO
 * Laser Zapper (horizontal/vertical), Míssel Teleguiado com aviso, e Barreira Móvel.
 */

import { CONFIG } from './constants.js';

export class Obstacle {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.isDead = false;
    this.passed = false;
  }

  update(dt, scrollSpeed) {
    this.x -= scrollSpeed * dt;
    if (this.x + this.width < -100) {
      this.isDead = true;
    }
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Checagem de colisão retangular AABB
   */
  checkCollision(pBox) {
    const oBox = this.getHitbox();
    return (
      pBox.x < oBox.x + oBox.width &&
      pBox.x + pBox.width > oBox.x &&
      pBox.y < oBox.y + oBox.height &&
      pBox.y + pBox.height > oBox.y
    );
  }
}

/**
 * 1. ZAPPER LASER (Horizontal ou Vertical)
 * Dois pólos de contenção e feixe de plasma pulsante
 */
export class LaserObstacle extends Obstacle {
  constructor(x, y, length, isVertical = false) {
    const width = isVertical ? 22 : length;
    const height = isVertical ? length : 22;
    super(x, y, width, height, 'LASER');

    this.isVertical = isVertical;
    this.length = length;
    this.pulseTimer = Math.random() * Math.PI;
  }

  update(dt, scrollSpeed) {
    super.update(dt, scrollSpeed);
    this.pulseTimer += dt * 8;
  }

  getHitbox() {
    // Hitbox ligeiramente perdoadora na largura do feixe
    if (this.isVertical) {
      return {
        x: this.x + 5,
        y: this.y + 10,
        width: this.width - 10,
        height: this.height - 20
      };
    } else {
      return {
        x: this.x + 10,
        y: this.y + 5,
        width: this.width - 20,
        height: this.height - 10
      };
    }
  }

  draw(ctx) {
    ctx.save();
    const pulse = 0.8 + Math.sin(this.pulseTimer) * 0.2;
    const isV = this.isVertical;

    // Emissores nos extremos (nós eletromagnéticos)
    const p1 = { x: this.x + (isV ? this.width / 2 : 10), y: this.y + (isV ? 10 : this.height / 2) };
    const p2 = { x: isV ? p1.x : this.x + this.width - 10, y: isV ? this.y + this.height - 10 : p1.y };

    // Linha de descarga elétrica / feixe
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 12 * pulse;

    // Feixe externo (laranja/dourado incandescente)
    ctx.strokeStyle = `rgba(255, 140, 0, ${pulse})`;
    ctx.lineWidth = isV ? 10 : 8;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Núcleo interno branco/amarelo ultra brilhante
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Faíscas elétricas aleatórias no feixe
    if (Math.random() > 0.4) {
      ctx.strokeStyle = '#ffee77';
      ctx.lineWidth = 1.5;
      const t = Math.random();
      const fx = p1.x + (p2.x - p1.x) * t;
      const fy = p1.y + (p2.y - p1.y) * t;
      const offset = (Math.random() - 0.5) * 14;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(isV ? fx + offset : fx, isV ? fy : fy + offset);
      ctx.stroke();
    }

    // Desenha os dois módulos terminais (nós metálicos)
    this.drawEmitterNode(ctx, p1.x, p1.y);
    this.drawEmitterNode(ctx, p2.x, p2.y);

    ctx.restore();
  }

  drawEmitterNode(ctx, x, y) {
    ctx.shadowBlur = 0;
    // Base do nó
    ctx.fillStyle = '#1c2233';
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Núcleo energizado
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 2. MÍSSEL TELEGUIADO (Com indicador de trajetória)
 */
export class MissileObstacle extends Obstacle {
  constructor(canvasWidth, targetY) {
    super(canvasWidth + 60, targetY, 44, 20, 'MISSILE');
    this.state = 'WARNING'; // 'WARNING' -> 'FLYING'
    this.warningDuration = 1.25; // segundos de alerta prévio
    this.targetY = targetY;
    this.trackingSpeed = 160; // capacidade de manobra para alinhar
    this.speedX = 640; // velocidade horizontal alta
    this.particles = [];
  }

  update(dt, scrollSpeed, playerY, audioManager) {
    if (this.state === 'WARNING') {
      this.warningDuration -= dt;
      // Persegue suavemente a altitude do jogador durante o aviso
      this.targetY += (playerY - this.targetY) * 3.5 * dt;
      this.y = this.targetY;

      // Disparar o som de bip
      if (this.warningDuration > 0 && Math.floor(this.warningDuration * 8) % 2 === 0) {
        if (audioManager && Math.random() < 0.2) audioManager.playWarning();
      }

      if (this.warningDuration <= 0) {
        this.state = 'FLYING';
        this.x = CONFIG.VIRTUAL_WIDTH + 10;
        this.y = this.targetY;
      }
    } else {
      // Estado de voo veloz
      this.x -= (this.speedX + scrollSpeed * 0.4) * dt;

      // Leve perseguição vertical em voo
      const diffY = playerY - this.y;
      this.y += Math.sign(diffY) * Math.min(Math.abs(diffY), this.trackingSpeed * dt);

      // Partículas de fumaça e fogo do foguete
      this.particles.push({
        x: this.x + this.width,
        y: this.y + this.height / 2 + (Math.random() - 0.5) * 4,
        size: 5 + Math.random() * 4,
        life: 0.25,
        maxLife: 0.25,
        color: Math.random() > 0.4 ? '#ff0055' : '#ff9900'
      });

      if (this.x + this.width < -80) {
        this.isDead = true;
      }
    }

    // Atualiza partículas do rastro
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += 120 * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getHitbox() {
    return {
      x: this.x + 4,
      y: this.y + 3,
      width: this.width - 8,
      height: this.height - 6
    };
  }

  draw(ctx) {
    if (this.state === 'WARNING') {
      // O indicador visual de alerta é renderizado pelo ObstacleManager ou no canvas
      this.drawWarningMarker(ctx);
      return;
    }

    ctx.save();

    // Rastro de fogo e fumaça
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;

    // Corpo do míssil (formato aerodinâmico afiado)
    const mx = this.x;
    const my = this.y;
    const mw = this.width;
    const mh = this.height;

    // Fuselagem
    ctx.fillStyle = '#220816';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(mx + mw, my + 3);
    ctx.lineTo(mx + 12, my + 3);
    ctx.lineTo(mx, my + mh / 2); // Ogiva pontiaguda frontal
    ctx.lineTo(mx + 12, my + mh - 3);
    ctx.lineTo(mx + mw, my + mh - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ogiva brilhante vermelha
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.moveTo(mx + 12, my + 4);
    ctx.lineTo(mx, my + mh / 2);
    ctx.lineTo(mx + 12, my + mh - 4);
    ctx.closePath();
    ctx.fill();

    // Aletas estabilizadoras traseiras
    ctx.fillStyle = '#440f25';
    ctx.beginPath();
    ctx.moveTo(mx + mw - 8, my + 3);
    ctx.lineTo(mx + mw, my - 4);
    ctx.lineTo(mx + mw - 2, my + 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(mx + mw - 8, my + mh - 3);
    ctx.lineTo(mx + mw, my + mh + 4);
    ctx.lineTo(mx + mw - 2, my + mh - 3);
    ctx.closePath();
    ctx.fill();

    // Olho rastreador central
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + 16, my + mh / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawWarningMarker(ctx) {
    ctx.save();
    const rightX = CONFIG.VIRTUAL_WIDTH - 24;
    const centerY = this.y + this.height / 2;
    const pulse = Math.floor(this.warningDuration * 10) % 2 === 0;

    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 12;

    // Ícone de triângulo de perigo
    ctx.fillStyle = pulse ? '#ff0055' : 'rgba(255, 0, 85, 0.4)';
    ctx.beginPath();
    ctx.moveTo(rightX - 16, centerY - 14);
    ctx.lineTo(rightX, centerY);
    ctx.lineTo(rightX - 16, centerY + 14);
    ctx.closePath();
    ctx.fill();

    // Linha guia pontilhada indicando a rota do míssil
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(rightX - 20, centerY);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * 3. BARREIRA DE PLASMA MÓVEL (Oscilação senoidal vertical)
 */
export class MovingBarrierObstacle extends Obstacle {
  constructor(x, baseY, height = 110) {
    super(x, baseY, 26, height, 'MOVING_BARRIER');
    this.baseY = baseY;
    this.amplitude = 75; // amplitude de movimento
    this.freq = 2.4;    // velocidade de oscilação
    this.timer = Math.random() * Math.PI * 2;
  }

  update(dt, scrollSpeed) {
    super.update(dt, scrollSpeed);
    this.timer += dt * this.freq;
    
    // Movimento senoidal suave entre teto e chão
    this.y = this.baseY + Math.sin(this.timer) * this.amplitude;

    // Limites de segurança
    const minY = CONFIG.CEILING_Y + 10;
    const maxY = CONFIG.PHYSICS.GROUND_Y - this.height;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
  }

  getHitbox() {
    return {
      x: this.x + 4,
      y: this.y + 6,
      width: this.width - 8,
      height: this.height - 12
    };
  }

  draw(ctx) {
    ctx.save();
    const bx = this.x;
    const by = this.y;
    const bw = this.width;
    const bh = this.height;

    // Pilar principal
    ctx.fillStyle = '#141829';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    // Faixas de aviso de perigo
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    for (let stripeY = by - 20; stripeY < by + bh + 20; stripeY += 16) {
      ctx.fillRect(bx, stripeY + (this.timer * 8) % 16, bw, 6);
    }
    ctx.restore();

    // Núcleo de energia central pulsante
    const pulse = 0.5 + Math.sin(this.timer * 4) * 0.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = `rgba(0, 240, 255, ${0.4 + pulse * 0.5})`;
    ctx.fillRect(bx + 7, by + 12, bw - 14, bh - 24);

    // Eletrodos superior e inferior
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 6;
    ctx.fillRect(bx + 4, by + 4, bw - 8, 4);
    ctx.fillRect(bx + 4, by + bh - 8, bw - 8, 4);

    ctx.restore();
  }
}
