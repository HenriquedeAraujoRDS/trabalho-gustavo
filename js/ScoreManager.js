/**
 * SCOREMANAGER - GERENCIADOR DE PONTUAÇÃO, DISTÂNCIA, CARTEIRA, RECORDE E MISSÕES
 * Persistência via LocalStorage.
 */

import { CONFIG } from './constants.js';

export class ScoreManager {
  constructor() {
    this.distance = 0;
    this.coins = 0;
    this.score = 0;

    // Dados persistentes no LocalStorage
    this.highScore = 0;
    this.walletCoins = 0;
    this.upgrades = {};
    this.missions = [];

    this.isNewRecord = false;
    this.justCompletedMissions = [];

    this.loadData();
  }

  resetRun() {
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.isNewRecord = false;
    this.justCompletedMissions = [];
  }

  /**
   * Atualiza a distância percorrida
   */
  update(dt, currentSpeed) {
    // 1 metro a cada ~20 pixels percorridos
    const distDelta = (currentSpeed * dt) / 20;
    this.distance += distDelta;

    // Multiplicador de moedas por upgrades se houver
    const mult = 1 + (this.upgrades.coin_multiplier || 0) * 0.5;
    this.score = Math.floor(this.distance + this.coins * 10 * mult);

    // Checa missões baseadas em distância em corrida única
    this.checkMissionProgress('distance_single', Math.floor(this.distance));
  }

  addCoin(baseValue = 1) {
    const mult = 1 + (this.upgrades.coin_multiplier || 0) * 0.5;
    const added = Math.round(baseValue * mult);
    this.coins += added;
    this.walletCoins += added;

    this.checkMissionProgress('coins_accumulated', added, true);
    this.saveData();
  }

  /**
   * Finaliza a corrida, checa recordes e salva dados
   */
  finishRun(dodgedMissiles = 0) {
    const currentDist = Math.floor(this.distance);
    if (currentDist > this.highScore) {
      this.highScore = currentDist;
      this.isNewRecord = true;
    }

    if (dodgedMissiles > 0) {
      this.checkMissionProgress('dodge_missiles', dodgedMissiles);
    }

    this.saveData();
  }

  /**
   * Atualiza e completa missões
   */
  checkMissionProgress(type, amount, isIncremental = false) {
    for (let i = 0; i < this.missions.length; i++) {
      const m = this.missions[i];
      if (m.completed || m.type !== type) continue;

      if (isIncremental) {
        m.progress += amount;
      } else {
        m.progress = Math.max(m.progress, amount);
      }

      if (m.progress >= m.target) {
        m.progress = m.target;
        m.completed = true;
        this.walletCoins += m.reward;
        this.justCompletedMissions.push(m);
      }
    }
  }

  /**
   * Compra ou sobe nível de melhoria
   */
  buyUpgrade(upgradeId) {
    const item = CONFIG.UPGRADES.find(u => u.id === upgradeId);
    if (!item) return false;

    const currentLevel = this.upgrades[upgradeId] || 0;
    if (currentLevel >= item.maxLevel) return false;

    const cost = item.costPerLevel[currentLevel];
    if (this.walletCoins < cost) return false;

    this.walletCoins -= cost;
    this.upgrades[upgradeId] = currentLevel + 1;
    this.saveData();
    return true;
  }

  getUpgradeLevel(upgradeId) {
    return this.upgrades[upgradeId] || 0;
  }

  saveData() {
    try {
      const data = {
        highScore: this.highScore,
        walletCoins: this.walletCoins,
        upgrades: this.upgrades,
        missions: this.missions
      };
      localStorage.setItem('astropulse_save_data', JSON.stringify(data));
    } catch (e) {
      console.warn('Erro ao salvar no LocalStorage:', e);
    }
  }

  loadData() {
    try {
      const raw = localStorage.getItem('astropulse_save_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.highScore = parsed.highScore || 0;
        this.walletCoins = parsed.walletCoins || 0;
        this.upgrades = parsed.upgrades || {};
        this.missions = parsed.missions || JSON.parse(JSON.stringify(CONFIG.INITIAL_MISSIONS));
      } else {
        this.missions = JSON.parse(JSON.stringify(CONFIG.INITIAL_MISSIONS));
      }
    } catch (e) {
      this.missions = JSON.parse(JSON.stringify(CONFIG.INITIAL_MISSIONS));
    }
  }
}
