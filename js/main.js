/**
 * MAIN - PONTO DE ENTRADA DO JOGO ASTROPULSE
 */

import { GameManager } from './GameManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas principal #game-canvas não encontrado!');
    return;
  }

  // Inicializa o GameManager central
  const game = new GameManager(canvas);

  // Expor globalmente para depuração se necessário
  window.AstroPulse = game;
  console.log('🚀 AstroPulse: Fuga Quântica inicializado com sucesso!');
});
