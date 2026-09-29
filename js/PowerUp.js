/**
 * POWERUP - SISTEMA DE POWER-UPS TEMPORÁRIOS E GERENCIADOR
 * Escudo, Ímã Quântico, Hiper Velocidade (Turbo), e Inversor de Gravidade.
 */

import { CONFIG } from './constants.js';

export class PowerUpItem {
  constructor(x, y, typeKey) {
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 34;
    this.typeKey = typeKey;
    this.config = CONFIG.POWERUPS[typeKey];
    this.isDead = false;
    this.floatTimer = Math.random() * Math.PI * 2;
  }

  update(dt, scrollSpeed) {
    this.x -= scrollSpeed * dt;
    this.floatTimer += dt * 4;

    if (this.x + this.width < -60) {
      this.isDead = true;
    }
  }

  getHitbox() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }

  checkCollision(playerBox) {
    const box = this.getHitbox();
    return (
      playerBox.x < box.x + box.width &&
      playerBox.x + box.width > box.x &&
      playerBox.y < box.y + box.height &&
      playerBox.y + box.height > box.y
    );
  }

  draw(ctx) {
    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2 + Math.sin(this.floatTimer) * 4;
    const size = this.width / 2;

    ctx.translate(cx, cy);

    // Aura pulsante colorida
    ctx.shadowColor = this.config.color;
    ctx.shadowBlur = 16;

    // Cápsula hexagonal exterior
    ctx.fillStyle = 'rgba(12, 18, 32, 0.9)';
    ctx.strokeStyle = this.config.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * size;
      const hy = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ícone central do Power-Up
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.icon, 0, 1);

    ctx.restore();
  }
}

/**
 * GERENCIADOR DE POWER-UPS
 */
export class PowerUpManager {
  constructor() {
    this.items = [];
    this.activePowerUp = null; // { typeKey, config, remainingTime, maxTime }
    this.spawnTimer = 16.0;    // Tempo até o primeiro power-up
    this.appliedUpgrades = {};
  }

  reset() {
    this.items = [];
    this.activePowerUp = null;
    this.spawnTimer = 14.0;
  }

  setUpgrades(upgrades) {
    this.appliedUpgrades = upgrades || {};
  }

  update(dt, scrollSpeed, player, audioManager, scoreManager, ui) {
    // 1. Atualizar itens colecionáveis no mundo
    const playerBox = player.getHitbox();

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(dt, scrollSpeed);

      if (item.checkCollision(playerBox)) {
        this.activatePowerUp(item.typeKey, player, audioManager, ui);
        item.isDead = true;
      }

      if (item.isDead) {
        this.items.splice(i, 1);
      }
    }

    // 2. Atualizar power-up ativo
    if (this.activePowerUp) {
      this.activePowerUp.remainingTime -= dt;
      const progress = Math.max(0, this.activePowerUp.remainingTime / this.activePowerUp.maxTime);
      if (ui) ui.updatePowerupBar(this.activePowerUp.config, progress);

      if (this.activePowerUp.remainingTime <= 0) {
        this.deactivatePowerUp(player, ui);
      }
    }

    // 3. Temporizador de geração de novos power-ups
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnRandomPowerUp();
      this.spawnTimer = 18.0 + Math.random() * 12.0; // Novo power-up a cada ~18-30s
    }
  }

  spawnRandomPowerUp() {
    const keys = Object.keys(CONFIG.POWERUPS);
    const chosenKey = keys[Math.floor(Math.random() * keys.length)];

    const spawnX = CONFIG.VIRTUAL_WIDTH + 60;
    const playTop = CONFIG.CEILING_Y + 70;
    const playRange = CONFIG.PHYSICS.GROUND_Y - playTop - 70;
    const spawnY = playTop + Math.random() * playRange;

    this.items.push(new PowerUpItem(spawnX, spawnY, chosenKey));
  }

  activatePowerUp(typeKey, player, audioManager, ui) {
    // Desativa anterior se houver
    if (this.activePowerUp) {
      this.deactivatePowerUp(player, ui);
    }

    const config = CONFIG.POWERUPS[typeKey];
    let duration = config.duration;

    // Bônus de upgrades adquiridos na loja
    if (typeKey === 'TURBO' && this.appliedUpgrades.turbo_charge) {
      duration += this.appliedUpgrades.turbo_charge * 2;
    }

    this.activePowerUp = {
      typeKey: typeKey,
      config: config,
      remainingTime: duration,
      maxTime: duration
    };

    // Aplica efeitos no jogador
    if (typeKey === 'SHIELD') {
      player.hasShield = true;
    } else if (typeKey === 'TURBO') {
      player.isTurbo = true;
    } else if (typeKey === 'GRAVITY') {
      player.isGravityInverted = true;
    }

    if (audioManager) audioManager.playPowerup();
    if (ui) {
      ui.showPowerupBar(config);
      ui.showToast(`${config.icon} ${config.name}!`, config.color);
    }
  }

  deactivatePowerUp(player, ui) {
    if (!this.activePowerUp) return;

    const key = this.activePowerUp.typeKey;
    if (key === 'SHIELD') {
      player.hasShield = false;
    } else if (key === 'TURBO') {
      player.isTurbo = false;
    } else if (key === 'GRAVITY') {
      player.isGravityInverted = false;
    }

    this.activePowerUp = null;
    if (ui) ui.hidePowerupBar();
  }

  /**
   * Chamado quando o jogador é atingido mas tem escudo
   */
  breakShield(player, audioManager, ui) {
    if (!player.hasShield) return false;

    player.hasShield = false;
    player.invulnerableTimer = 1.2; // Breve período de invulnerabilidade após o golpe

    if (this.activePowerUp && this.activePowerUp.typeKey === 'SHIELD') {
      this.activePowerUp = null;
      if (ui) ui.hidePowerupBar();
    }

    if (audioManager) audioManager.playShieldBreak();
    if (ui) ui.showToast('🛡️ ESCUDO ABSORVEU O IMPACTO!', '#00f0ff');

    return true;
  }

  draw(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].draw(ctx);
    }
  }
}
