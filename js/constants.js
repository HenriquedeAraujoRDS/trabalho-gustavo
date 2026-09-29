/**
 * CONSTANTES E CONFIGURAÇÕES DO JOGO - ASTROPULSE
 */

export const CONFIG = {
  // Resolução virtual padrão para consistência de física e renderização
  VIRTUAL_WIDTH: 960,
  VIRTUAL_HEIGHT: 540,
  
  // Limites do cenário
  CEILING_Y: 40,
  FLOOR_Y: 480, // chão onde o personagem corre

  // Física do Jogador
  PHYSICS: {
    GRAVITY: 1550,            // Gravidade constante (pixels/s²)
    JETPACK_THRUST: -2350,    // Força de empuxo para cima (pixels/s²)
    MAX_FALL_SPEED: 680,      // Velocidade máxima de queda terminal
    MAX_RISE_SPEED: -580,     // Velocidade máxima de subida
    INERTIA_DAMPING: 0.985,   // Inércia leve para suavização
    GROUND_Y: 430,            // Posição Y do pé no solo (FLOOR_Y - PLAYER_HEIGHT)
  },

  // Dimensões do Jogador
  PLAYER: {
    WIDTH: 38,
    HEIGHT: 50,
    SPAWN_X: 140,             // Distância fixa da borda esquerda
  },

  // Velocidade e Progressão
  SPEED: {
    BASE: 320,                // Velocidade horizontal inicial (pixels/s)
    MAX: 720,                 // Velocidade máxima após longa distância
    ACCELERATION_PER_METER: 0.18, // Aumento gradual por metro percorrido
    TURBO_MULTIPLIER: 1.85,   // Multiplicador no modo Turbo
  },

  // Tipos de Power-Up
  POWERUPS: {
    SHIELD: {
      id: 'SHIELD',
      name: 'ESCUDO',
      icon: '🛡️',
      color: '#00f0ff',
      duration: 10,           // Segundos (ou até colisão)
      description: 'Protege contra 1 impacto crítico de obstáculo',
    },
    MAGNET: {
      id: 'MAGNET',
      name: 'ÍMÃ QUÂNTICO',
      icon: '🧲',
      color: '#ffb703',
      duration: 12,
      radius: 260,
      description: 'Atrai todas as células de energia próximas',
    },
    TURBO: {
      id: 'TURBO',
      name: 'HIPER VELOCIDADE',
      icon: '⚡',
      color: '#ff0055',
      duration: 7,
      description: 'Impulso supersônico com invulnerabilidade total',
    },
    GRAVITY: {
      id: 'GRAVITY',
      name: 'INVERSOR DE CAMPO',
      icon: '🔄',
      color: '#a3ff00',
      duration: 10,
      description: 'Altera o campo gravitacional para voo invertido/reverso',
    }
  },

  // Upgrades disponíveis na Loja
  UPGRADES: [
    {
      id: 'magnet_boost',
      title: 'Amplificador Magnético',
      desc: 'Aumenta o raio de atração do ímã de células.',
      maxLevel: 4,
      costPerLevel: [100, 250, 500, 1000],
      baseValue: 260,
      increment: 70
    },
    {
      id: 'shield_regen',
      title: 'Escudo Duplo',
      desc: 'Chances do escudo regenerar após absorver um dano.',
      maxLevel: 3,
      costPerLevel: [200, 450, 900],
      baseValue: 0,
      increment: 25
    },
    {
      id: 'turbo_charge',
      title: 'Tanque Hiperdrive',
      desc: 'Aumenta a duração do power-up de Turbo.',
      maxLevel: 4,
      costPerLevel: [150, 300, 600, 1200],
      baseValue: 7,
      increment: 2
    },
    {
      id: 'coin_multiplier',
      title: 'Conversor de Células',
      desc: 'Multiplica o valor de células de energia coletadas.',
      maxLevel: 3,
      costPerLevel: [300, 750, 1500],
      baseValue: 1,
      increment: 0.5
    }
  ],

  // Missões Iniciais
  INITIAL_MISSIONS: [
    {
      id: 'dist_500',
      title: 'Primeiro Salto',
      desc: 'Percorra 500 metros em uma única corrida.',
      type: 'distance_single',
      target: 500,
      reward: 100,
      progress: 0,
      completed: false
    },
    {
      id: 'coins_50',
      title: 'Coletor de Plasma',
      desc: 'Colete 50 células de energia no total.',
      type: 'coins_accumulated',
      target: 50,
      reward: 150,
      progress: 0,
      completed: false
    },
    {
      id: 'dodge_missiles_5',
      title: 'Reflexos Rápidos',
      desc: 'Desvie de 5 mísseis teleguiados em uma corrida.',
      type: 'dodge_missiles',
      target: 5,
      reward: 200,
      progress: 0,
      completed: false
    },
    {
      id: 'use_powerup_3',
      title: 'Sobrecarga de Energia',
      desc: 'Ative 3 power-ups em uma única corrida.',
      type: 'powerups_single',
      target: 3,
      reward: 250,
      progress: 0,
      completed: false
    }
  ]
};
