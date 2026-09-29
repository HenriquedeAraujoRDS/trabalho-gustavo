/**
 * UI - GERENCIADOR DE INTERFACE, HUD, MENUS, MODAIS E FEEDBACKS VISUAIS
 */

import { CONFIG } from './constants.js';

export class UI {
  constructor(gameManager) {
    this.gm = gameManager;

    // Elementos do HUD
    this.hudLayer = document.getElementById('hud');
    this.hudDistance = document.getElementById('hud-distance-val');
    this.hudCoins = document.getElementById('hud-coins-val');
    this.hudScore = document.getElementById('hud-score-val');

    // Barra de Power-up
    this.powerupBarContainer = document.getElementById('powerup-bar-container');
    this.powerupBadgeIcon = document.getElementById('powerup-badge-icon');
    this.powerupBarFill = document.getElementById('powerup-bar-fill');
    this.powerupBadgeName = document.getElementById('powerup-badge-name');

    // Telas Overlays
    this.menuScreen = document.getElementById('menu-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.shopModal = document.getElementById('shop-modal');
    this.missionsModal = document.getElementById('missions-modal');

    // Elementos de Game Over
    this.resDistance = document.getElementById('res-distance');
    this.resCoins = document.getElementById('res-coins');
    this.resScore = document.getElementById('res-score');
    this.resBest = document.getElementById('res-best');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.completedMissionsBox = document.getElementById('completed-missions-box');
    this.completedMissionsList = document.getElementById('completed-missions-list');

    // Modais
    this.shopWalletVal = document.getElementById('shop-wallet-val');
    this.upgradesContainer = document.getElementById('upgrades-container');
    this.missionsContainer = document.getElementById('missions-container');

    // Canvas de Preview no Menu
    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

    // Camada de Toasts
    this.toastLayer = document.getElementById('toast-layer');

    this.initEventListeners();
    this.renderMenuPreview();
  }

  initEventListeners() {
    // Botão Iniciar Partida
    document.getElementById('btn-play').addEventListener('click', () => {
      this.gm.startGame();
    });

    // Botão Pausar
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.gm.togglePause();
    });

    // Ações de Pausa
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.gm.togglePause();
    });
    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      this.gm.restartGame();
    });
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      this.gm.goToMenu();
    });

    // Ações de Game Over
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.gm.restartGame();
    });
    document.getElementById('btn-res-shop').addEventListener('click', () => {
      this.openShop();
    });
    document.getElementById('btn-res-menu').addEventListener('click', () => {
      this.gm.goToMenu();
    });

    // Botões de Loja e Missões
    document.getElementById('btn-shop').addEventListener('click', () => {
      this.openShop();
    });
    document.getElementById('btn-close-shop').addEventListener('click', () => {
      this.closeShop();
    });
    document.getElementById('btn-done-shop').addEventListener('click', () => {
      this.closeShop();
    });

    document.getElementById('btn-missions').addEventListener('click', () => {
      this.openMissions();
    });
    document.getElementById('btn-close-missions').addEventListener('click', () => {
      this.closeMissions();
    });
    document.getElementById('btn-done-missions').addEventListener('click', () => {
      this.closeMissions();
    });

    // Alternar Som
    const btnSound = document.getElementById('btn-sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    btnSound.addEventListener('click', () => {
      const isMuted = this.gm.audioManager.toggleMute();
      soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  updateHUD(distance, coins, score) {
    this.hudDistance.innerHTML = `${Math.floor(distance)} <small>m</small>`;
    this.hudCoins.textContent = coins;
    this.hudScore.textContent = score;
  }

  showPowerupBar(config) {
    this.powerupBarContainer.classList.remove('hidden');
    this.powerupBadgeIcon.textContent = config.icon;
    this.powerupBadgeName.textContent = config.name;
    this.powerupBadgeName.style.color = config.color;
    this.powerupBarFill.style.background = `linear-gradient(90deg, ${config.color}, #ffffff)`;
    this.powerupBarFill.style.width = '100%';
  }

  updatePowerupBar(config, progress) {
    this.powerupBarFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
  }

  hidePowerupBar() {
    this.powerupBarContainer.classList.add('hidden');
  }

  showMenu() {
    this.menuScreen.classList.remove('hidden');
    this.hudLayer.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  showGame() {
    this.menuScreen.classList.add('hidden');
    this.hudLayer.classList.remove('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden');
  }

  showGameOver(distance, coins, score, bestRecord, isNewRecord, completedMissions) {
    this.gameOverScreen.classList.remove('hidden');
    this.hudLayer.classList.add('hidden');

    this.resDistance.textContent = `${Math.floor(distance)} m`;
    this.resCoins.textContent = `◈ ${coins}`;
    this.resScore.textContent = score;
    this.resBest.textContent = `${bestRecord} m`;

    if (isNewRecord) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    if (completedMissions && completedMissions.length > 0) {
      this.completedMissionsBox.classList.remove('hidden');
      this.completedMissionsList.innerHTML = completedMissions
        .map(m => `<div><strong>${m.title}</strong>: +${m.reward} ◈</div>`)
        .join('');
    } else {
      this.completedMissionsBox.classList.add('hidden');
    }
  }

  openShop() {
    this.shopModal.classList.remove('hidden');
    this.renderShop();
  }

  closeShop() {
    this.shopModal.classList.add('hidden');
  }

  renderShop() {
    const sm = this.gm.scoreManager;
    this.shopWalletVal.textContent = sm.walletCoins;
    this.upgradesContainer.innerHTML = '';

    CONFIG.UPGRADES.forEach(item => {
      const currentLvl = sm.getUpgradeLevel(item.id);
      const isMaxed = currentLvl >= item.maxLevel;
      const nextCost = isMaxed ? 0 : item.costPerLevel[currentLvl];
      const canAfford = sm.walletCoins >= nextCost && !isMaxed;

      // Criação das pips de nível
      let pipsHtml = '';
      for (let i = 0; i < item.maxLevel; i++) {
        pipsHtml += `<div class="pip ${i < currentLvl ? 'filled' : ''}"></div>`;
      }

      const div = document.createElement('div');
      div.className = 'upgrade-item';
      div.innerHTML = `
        <div class="upgrade-info">
          <div class="upgrade-title">${item.title}</div>
          <div class="upgrade-desc">${item.desc}</div>
          <div class="upgrade-pips">${pipsHtml}</div>
        </div>
        <button class="cyber-btn btn-buy" id="btn-buy-${item.id}" ${(!canAfford || isMaxed) ? 'disabled' : ''}>
          ${isMaxed ? 'MÁXIMO' : `◈ ${nextCost}`}
        </button>
      `;

      this.upgradesContainer.appendChild(div);

      const buyBtn = div.querySelector(`#btn-buy-${item.id}`);
      if (buyBtn && !isMaxed) {
        buyBtn.addEventListener('click', () => {
          if (sm.buyUpgrade(item.id)) {
            if (this.gm.audioManager) this.gm.audioManager.playCoin();
            this.renderShop();
          }
        });
      }
    });
  }

  openMissions() {
    this.missionsModal.classList.remove('hidden');
    this.renderMissions();
  }

  closeMissions() {
    this.missionsModal.classList.add('hidden');
  }

  renderMissions() {
    const sm = this.gm.scoreManager;
    this.missionsContainer.innerHTML = '';

    sm.missions.forEach(m => {
      const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
      const div = document.createElement('div');
      div.className = `mission-item ${m.completed ? 'completed' : ''}`;
      div.innerHTML = `
        <div class="mission-info">
          <div class="mission-title">${m.completed ? '✓ ' : ''}${m.title}</div>
          <div class="mission-desc">${m.desc} (${m.progress}/${m.target})</div>
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="mission-reward">+${m.reward} ◈</div>
      `;
      this.missionsContainer.appendChild(div);
    });
  }

  showToast(text, color = '#00f0ff') {
    const toast = document.createElement('div');
    toast.className = 'float-toast';
    toast.style.color = color;
    toast.style.left = '50%';
    toast.style.top = '35%';
    toast.textContent = text;
    this.toastLayer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 900);
  }

  /**
   * Renderiza a pré-visualização animada do personagem no Menu
   */
  renderMenuPreview() {
    if (!this.previewCtx) return;
    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;

    let time = 0;
    const animate = () => {
      time += 0.04;
      ctx.clearRect(0, 0, w, h);

      // Efeito de flutuação suave
      const floatY = Math.sin(time * 2) * 5;

      // Propulsor simulado
      ctx.save();
      ctx.translate(w / 2 - 20, h / 2 - 25 + floatY);

      // Partículas no preview
      ctx.fillStyle = Math.random() > 0.4 ? '#00f0ff' : '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(4, 44 + Math.random() * 8, 3 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();

      // Renderiza sprite do personagem
      this.gm.player.drawCharacterSprite(ctx, 0, 0, -0.08, false);

      ctx.restore();

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}
