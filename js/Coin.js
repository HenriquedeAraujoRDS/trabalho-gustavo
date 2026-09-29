/**
 * COIN / CÉLULA QUÂNTICA - COLETÁVEIS E GERENCIADOR DE PADRÕES
 * Células de energia com animação de brilho, atração magnética e geração de trilhas.
 */

import { CONFIG } from './constants.js';

export class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 11;
    this.isDead = false;
    this.rotation = Math.random() * Math.PI;
    this.floatTimer = Math.random() * Math.PI * 2;
    this.baseY = y;
    this.collected = false;

    // Física de atração magnética
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, scrollSpeed, player, magnetRadius = 0) {
    this.floatTimer += dt * 5;
    this.rotation += dt * 4;

    // Atração Magnética
    if (magnetRadius > 0 && !this.collected) {
      const pCenterX = player.x + player.width / 2;
      const pCenterY = player.y + player.height / 2;
      const dx = pCenterX - this.x;
      const dy = pCenterY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < magnetRadius && dist > 0) {
        const pullForce = 850 * (1 - dist / magnetRadius) + 400;
        this.vx += (dx / dist) * pullForce * dt;
        this.vy += (dy / dist) * pullForce * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        this.x -= scrollSpeed * dt;
      }
    } else {
      this.x -= scrollSpeed * dt;
    }

    if (this.x + this.radius < -50) {
      this.isDead = true;
    }
  }

  /**
   * Checagem de colisão com a hitbox do jogador
   */
  checkCollision(playerBox) {
    const cx = this.x;
    const cy = this.y;
    // Ponto mais próximo na caixa do jogador
    const nearestX = Math.max(playerBox.x, Math.min(cx, playerBox.x + playerBox.width));
    const nearestY = Math.max(playerBox.y, Math.min(cy, playerBox.y + playerBox.height));
    const distSq = (cx - nearestX) ** 2 + (cy - nearestY) ** 2;

    return distSq < (this.radius + 6) ** 2;
  }

  /**
   * Desenho da Célula Quântica com rotação pseudo-3D e brilho dourado
   */
  draw(ctx) {
    ctx.save();
    const cx = this.x;
    const cy = this.y + Math.sin(this.floatTimer) * 2.5;

    // Rotação horizontal (largura variável como moeda girando)
    const scaleX = Math.cos(this.rotation);
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);

    ctx.shadowColor = '#ffb703';
    ctx.shadowBlur = 10;

    // Losango externo dourado
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fill();

    // Borda brilhante
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Núcleo energético interno (ciano/branco)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * GERENCIADOR DE CÉLULAS E PADRÕES
 */
export class CoinManager {
  constructor() {
    this.coins = [];
    this.spawnTimer = 2.0;
    this.particles = [];
  }

  reset() {
    this.coins = [];
    this.spawnTimer = 2.0;
    this.particles = [];
  }

  update(dt, scrollSpeed, player, magnetRadius, audioManager, scoreManager) {
    // 1. Atualiza partículas de coleta
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Atualiza e coleta moedas
    const playerBox = player.getHitbox();

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.update(dt, scrollSpeed, player, magnetRadius);

      if (!coin.collected && coin.checkCollision(playerBox)) {
        coin.collected = true;
        coin.isDead = true;

        // Feedback de coleta
        this.spawnCollectSparks(coin.x, coin.y);
        if (audioManager) audioManager.playCoin();
        if (scoreManager) scoreManager.addCoin();
      }

      if (coin.isDead) {
        this.coins.splice(i, 1);
      }
    }

    // 3. Geração de novas trilhas de células
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnPattern();
      this.spawnTimer = 2.5 + Math.random() * 2.5;
    }
  }

  /**
   * Spawna diferentes padrões estéticos de moedas
   */
  spawnPattern() {
    const startX = CONFIG.VIRTUAL_WIDTH + 60;
    const playTop = CONFIG.CEILING_Y + 50;
    const playBottom = CONFIG.PHYSICS.GROUND_Y - 50;
    const playRange = playBottom - playTop;

    const patterns = ['LINE', 'ARC', 'SINE', 'CLUSTER'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    switch (pattern) {
      case 'LINE': {
        // Linha horizontal de 5 a 8 moedas
        const y = playTop + Math.random() * playRange;
        const count = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          this.coins.push(new Coin(startX + i * 28, y));
        }
        break;
      }

      case 'ARC': {
        // Arco parabólico simulando voo de jetpack
        const startY = playBottom - 20;
        const apexHeight = 120 + Math.random() * 100;
        const count = 10;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          // Parábola y = 4 * apex * t * (1 - t)
          const arcY = startY - 4 * apexHeight * t * (1 - t);
          this.coins.push(new Coin(startX + i * 32, arcY));
        }
        break;
      }

      case 'SINE': {
        // Onda senoidal de moedas
        const midY = playTop + playRange * 0.5;
        const count = 9;
        for (let i = 0; i < count; i++) {
          const sineY = midY + Math.sin(i * 0.7) * 45;
          this.coins.push(new Coin(startX + i * 30, sineY));
        }
        break;
      }

      case 'CLUSTER': {
        // Matriz 3x3 de células de energia
        const baseY = playTop + Math.random() * (playRange - 60);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            this.coins.push(new Coin(startX + c * 26, baseY + r * 26));
          }
        }
        break;
      }
    }
  }

  /**
   * Efeito de faíscas ao coletar moeda
   */
  spawnCollectSparks(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35,
        maxLife: 0.35,
        color: Math.random() > 0.3 ? '#ffb703' : '#00f0ff'
      });
    }
  }

  draw(ctx) {
    // Desenha moedas
    for (let i = 0; i < this.coins.length; i++) {
      this.coins[i].draw(ctx);
    }

    // Desenha faíscas de coleta
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
