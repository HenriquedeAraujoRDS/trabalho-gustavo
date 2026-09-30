/**
 * OBSTACLEMANAGER - GERENCIADOR PROCEDURAL DE OBSTÁCULOS
 * Gera padrões balanceados, garante corredores seguros de passagem, e escalona a dificuldade.
 */

import { CONFIG } from './constants.js';
import { LaserObstacle, MissileObstacle, MovingBarrierObstacle } from './Obstacle.js';

export class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.spawnTimer = 1.5; // Tempo até o próximo obstáculo
    this.missileTimer = 8.0; // Intervalo para mísseis
    this.totalDodgedMissiles = 0;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 1.5;
    this.missileTimer = 9.0;
    this.totalDodgedMissiles = 0;
  }

  /**
   * Atualiza e gera novos obstáculos
   */
  update(dt, scrollSpeed, distance, player, audioManager) {
    // 1. Atualizar obstáculos existentes
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs instanceof MissileObstacle) {
        obs.update(dt, scrollSpeed, player.y, audioManager);
      } else {
        obs.update(dt, scrollSpeed);
      }

      // Detecção de passagem bem-sucedida (para missões de desvio)
      if (!obs.passed && obs.x + obs.width < player.x) {
        obs.passed = true;
        if (obs instanceof MissileObstacle) {
          this.totalDodgedMissiles++;
        }
      }

      // Remove obstáculos fora da tela
      if (obs.isDead) {
        this.obstacles.splice(i, 1);
      }
    }

    // 2. Temporizador de geração procedural de obstáculos terrestres/aéreos
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnProceduralObstacle(distance);
      // Intervalo entre obstáculos reduz ligeiramente com a velocidade, mantendo distância mínima
      const minInterval = 1.8;
      const variableInterval = Math.max(1.3, 3.0 - (distance / 2000));
      this.spawnTimer = minInterval + Math.random() * variableInterval;
    }

    // 3. Temporizador de mísseis teleguiados (após 400m de distância)
    if (distance >= 400) {
      this.missileTimer -= dt;
      if (this.missileTimer <= 0) {
        this.spawnMissile(player.y);
        // Intervalo aleatório entre mísseis futuros
        this.missileTimer = Math.max(6.0, 14.0 - (distance / 1500)) + Math.random() * 4;
      }
    }
  }

  /**
   * Spawna um míssil na altitude aproximada do jogador
   */
  spawnMissile(playerY) {
    // Garante que o míssil comece na área visível de voo
    const clampedY = Math.max(CONFIG.CEILING_Y + 40, Math.min(CONFIG.PHYSICS.GROUND_Y - 40, playerY));
    const missile = new MissileObstacle(CONFIG.VIRTUAL_WIDTH, clampedY);
    this.obstacles.push(missile);
  }

  /**
   * Gera um obstáculo ou padrão proceduramente, com garantia de corredor livre
   */
  spawnProceduralObstacle(distance) {
    const spawnX = CONFIG.VIRTUAL_WIDTH + 80;
    const playHeight = CONFIG.PHYSICS.GROUND_Y - CONFIG.CEILING_Y;

    // Seleção de tipos desbloqueados por distância
    const availableTypes = ['LASER_V', 'LASER_H'];
    if (distance > 250) availableTypes.push('MOVING_BARRIER');

    const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    switch (chosenType) {
      case 'LASER_V': {
        // Laser Vertical: garante um vão amplo de no mínimo 180px para o jogador passar
        const laserHeight = 140 + Math.random() * 80;
        const placeTop = Math.random() > 0.5;

        let spawnY;
        if (placeTop) {
          // Pendurado no teto -> passagem segura pelo chão
          spawnY = CONFIG.CEILING_Y + 5;
        } else {
          // Erguido do chão -> passagem segura pelo teto
          spawnY = CONFIG.PHYSICS.GROUND_Y - laserHeight;
        }

        this.obstacles.push(new LaserObstacle(spawnX, spawnY, laserHeight, true));
        break;
      }

      case 'LASER_H': {
        // Laser Horizontal: posicionado em uma de 3 faixas de altitude seguras
        const altitudes = [
          CONFIG.CEILING_Y + 70,                  // Faixa Alta (passagem por baixo)
          CONFIG.CEILING_Y + playHeight * 0.5,     // Faixa Média (passagem por cima ou por baixo)
          CONFIG.PHYSICS.GROUND_Y - 90            // Faixa Baixa (passagem por cima com jetpack)
        ];
        const selectedY = altitudes[Math.floor(Math.random() * altitudes.length)];
        const length = 110 + Math.random() * 90;

        this.obstacles.push(new LaserObstacle(spawnX, selectedY, length, false));
        break;
      }

      case 'MOVING_BARRIER': {
        // Barreira móvel centralizada que oscila
        const barrierHeight = 90;
        const midY = CONFIG.CEILING_Y + (playHeight - barrierHeight) / 2;
        this.obstacles.push(new MovingBarrierObstacle(spawnX, midY, barrierHeight));
        break;
      }
    }
  }

  /**
   * Checa colisão de qualquer obstáculo com a hitbox do jogador
   */
  checkCollisions(player) {
    if (player.isDead) return null;

    const playerBox = player.getHitbox();

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      // Mísseis em estado de alerta ainda não colidem
      if (obs instanceof MissileObstacle && obs.state === 'WARNING') {
        continue;
      }

      if (obs.checkCollision(playerBox)) {
        return obs;
      }
    }
    return null;
  }

  /**
   * Renderiza todos os obstáculos
   */
  draw(ctx) {
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].draw(ctx);
    }
  }
}
