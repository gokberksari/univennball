const CONSTANTS = {
  // Field - 10v10 (2400/3*2 = 1600, 1200/3*2 = 800)
  FIELD_W: 1600,
  FIELD_H: 800,
  FIELD_MARGIN: 120,

  // How far players can go outside field lines
  PLAYER_OUT_OF_BOUNDS: 80,

  // Viewport (what the player sees on screen)
  CANVAS_W: 960,
  CANVAS_H: 540,

  // Goals
  GOAL_DEPTH: 40,
  GOAL_WIDTH: 160,
  GOAL_POST_RADIUS: 12,

  // Ball
  BALL_RADIUS: 10,
  BALL_DAMPING: 0.98,
  BALL_BOUNCE: 0.75,
  BALL_MAX_SPEED: 11.5,
  BALL_MASS: 0.8,

  // Player
  PLAYER_RADIUS: 20,
  PLAYER_DAMPING: 0.88,
  PLAYER_ACCEL: 0.22,
  PLAYER_MAX_SPEED: 4.0,
  PLAYER_BOUNCE: 0.5,
  PLAYER_MASS: 2,

  // Kick
  KICK_RADIUS: 5,
  KICK_FORCE: 6.5,
  KICK_COOLDOWN: 10,

  // Game
  TICK_RATE: 60,
  TICK_MS: 1000 / 60,
  DEFAULT_TIME_LIMIT: 5,
  DEFAULT_SCORE_LIMIT: 5,
  GOAL_RESET_DELAY: 3500,

  // Spawns for 10v10 (scaled to 1600x800)
  SPAWNS: {
    red: [
      { x: -130, y: 0 }, // ST
      { x: -300, y: -130 }, // LM
      { x: -300, y: 130 }, // RM
      { x: -330, y: 0 }, // CM
      { x: -500, y: -100 }, // LCM
      { x: -500, y: 100 }, // RCM
      { x: -600, y: -230 }, // LB
      { x: -600, y: 230 }, // RB
      { x: -600, y: -70 }, // LCB
      { x: -600, y: 70 }, // RCB
      { x: -730, y: 0 }, // GK
    ],
    blue: [
      { x: 130, y: 0 },
      { x: 300, y: -130 },
      { x: 300, y: 130 },
      { x: 330, y: 0 },
      { x: 500, y: -100 },
      { x: 500, y: 100 },
      { x: 600, y: -230 },
      { x: 600, y: 230 },
      { x: 600, y: -70 },
      { x: 600, y: 70 },
      { x: 730, y: 0 },
    ],
  },
};

if (typeof module !== "undefined") module.exports = CONSTANTS;
if (typeof window !== "undefined") window.CONSTANTS = CONSTANTS;
