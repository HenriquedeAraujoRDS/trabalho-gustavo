/**
 * JETPACK - SISTEMA DE PROPULSÃO IÔNICA E EMISSÃO DE PARTÍCULAS
 */

export class Jetpack {
  constructor() {
    this.isActive = false;
    this.particles = [];
    this.heat = 0; // Para brilho dinâmico do bocal
    this.MAX_PARTICLES = 60; // Limite para performance
  }

  /**
   * Ativa a propulsão
   */
  activate() {
    this.isActive = true;
  }

  /**
   * Desativa a propulsão
   */
  deactivate() {
    this.isActive = false;
  }

  /**
   * Atualiza a simulação das partículas
   */
  update(dt, playerX, playerY, isTurbo = false, isGravityInverted = false) {
    // Aquece ou resfria o propulsor
    if (this.isActive || isTurbo) {
      this.heat = Math.min(1, this.heat + dt * 5);
      
      // Bocal de escape na parte traseira do jogador
      const nozzleX = playerX + 4;
      const nozzleY = isGravityInverted ? playerY + 8 : playerY + 38;

      // Taxa de emissão de partículas de plasma (limitada)
      const count = isTurbo ? 4 : 2;
      for (let i = 0; i < count; i++) {
        if (this.particles.length < this.MAX_PARTICLES) {
          this.emitParticle(nozzleX, nozzleY, isTurbo, isGravityInverted);
        }
      }
    } else {
      this.heat = Math.max(0, this.heat - dt * 3);
    }

    // Atualização física de cada partícula (swap-and-pop para O(1))
    let len = this.particles.length;
    for (let i = len - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[len - 1];
        len--;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0.5, p.initialSize * (p.life / p.maxLife));
    }
    this.particles.length = len;
  }

  /**
   * Emite uma partícula individual com cores neon e dispersão
   */
  emitParticle(originX, originY, isTurbo, isGravityInverted) {
    const dirY = isGravityInverted ? -1 : 1;
    const speedY = (180 + Math.random() * 260) * dirY;
    const speedX = -120 - Math.random() * 80; // empurrado para trás pelo vento

    let color, glowColor;
    if (isTurbo) {
      color = Math.random() > 0.4 ? '#ff0055' : '#ffb703';
      glowColor = 'rgba(255, 0, 85, 0.8)';
    } else {
      color = Math.random() > 0.3 ? '#00f0ff' : '#ffffff';
      glowColor = 'rgba(0, 240, 255, 0.7)';
    }

    const maxLife = 0.25 + Math.random() * 0.25;

    this.particles.push({
      x: originX + (Math.random() - 0.5) * 8,
      y: originY,
      vx: speedX,
      vy: speedY + (Math.random() - 0.5) * 60,
      initialSize: 4 + Math.random() * 4,
      size: 6,
      color: color,
      glowColor: glowColor,
      life: maxLife,
      maxLife: maxLife
    });
  }

  /**
   * Renderiza as partículas com efeito de luz aditiva
   */
  drawParticles(ctx) {
    if (this.particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0; // Desabilita shadow para performance

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Desenha a carcaça do Jetpack preso às costas do corredor
   */
  drawEquipped(ctx, x, y, isGravityInverted = false) {
    ctx.save();
    
    // Suporte dorsal
    ctx.fillStyle = '#1b2234';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;

    // Cilindro do propulsor
    const jetX = x - 6;
    const jetY = y + 14;
    const jetW = 12;
    const jetH = 26;

    ctx.beginPath();
    ctx.roundRect(jetX, jetY, jetW, jetH, 4);
    ctx.fill();
    ctx.stroke();

    // Faixa luminosa no tanque
    ctx.fillStyle = this.heat > 0.2 ? '#00f0ff' : '#008fa0';
    ctx.fillRect(jetX + 3, jetY + 4, jetW - 6, jetH - 8);

    // Bocal de escape inferior
    const nozzleY = isGravityInverted ? jetY - 4 : jetY + jetH;
    ctx.fillStyle = this.heat > 0.4 ? '#ff5500' : '#444c60';
    ctx.beginPath();
    ctx.moveTo(jetX + 1, nozzleY);
    ctx.lineTo(jetX + jetW - 1, nozzleY);
    ctx.lineTo(jetX + jetW - 3, isGravityInverted ? nozzleY - 4 : nozzleY + 4);
    ctx.lineTo(jetX + 3, isGravityInverted ? nozzleY - 4 : nozzleY + 4);
    ctx.closePath();
    ctx.fill();

    // Luz de ignição no bocal
    if (this.heat > 0.1) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10 * this.heat;
      ctx.beginPath();
      ctx.arc(jetX + jetW / 2, isGravityInverted ? nozzleY - 2 : nozzleY + 2, 3 * this.heat, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  reset() {
    this.isActive = false;
    this.particles = [];
    this.heat = 0;
  }
}
