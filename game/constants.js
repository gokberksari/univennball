const CONSTANTS = {
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
  GOAL_RESET_DELAY: 5000,

  // Map presets
  MAPS: {
    big: {
      name: 'Büyük Saha',
      FIELD_W: 1600,
      FIELD_H: 800,
      FIELD_MARGIN: 120,
      PLAYER_OUT_OF_BOUNDS: 80,
      GOAL_DEPTH: 40,
      GOAL_WIDTH: 160,
      GOAL_POST_RADIUS: 12,
      SPAWNS: {
        red: [
          { x: -130, y: 0 },
          { x: -300, y: -130 },
          { x: -300, y: 130 },
          { x: -330, y: 0 },
          { x: -500, y: -100 },
          { x: -500, y: 100 },
          { x: -600, y: -230 },
          { x: -600, y: 230 },
          { x: -600, y: -70 },
          { x: -600, y: 70 },
          { x: -730, y: 0 },
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
    },
    small: {
      name: 'Küçük Saha',
      FIELD_W: 800,
      FIELD_H: 400,
      FIELD_MARGIN: 80,
      PLAYER_OUT_OF_BOUNDS: 40,
      GOAL_DEPTH: 30,
      GOAL_WIDTH: 120,
      GOAL_POST_RADIUS: 10,
      SPAWNS: {
        red: [
          { x: -80, y: 0 },
          { x: -200, y: -80 },
          { x: -200, y: 80 },
          { x: -350, y: 0 },
        ],
        blue: [
          { x: 80, y: 0 },
          { x: 200, y: -80 },
          { x: 200, y: 80 },
          { x: 350, y: 0 },
        ],
      },
    },
  },

  // Default active map (overwritten at game start)
  FIELD_W: 1600,
  FIELD_H: 800,
  FIELD_MARGIN: 120,
  PLAYER_OUT_OF_BOUNDS: 80,
  GOAL_DEPTH: 40,
  GOAL_WIDTH: 160,
  GOAL_POST_RADIUS: 12,
  SPAWNS: {
    red: [
      { x: -130, y: 0 },
      { x: -300, y: -130 },
      { x: -300, y: 130 },
      { x: -330, y: 0 },
      { x: -500, y: -100 },
      { x: -500, y: 100 },
      { x: -600, y: -230 },
      { x: -600, y: 230 },
      { x: -600, y: -70 },
      { x: -600, y: 70 },
      { x: -730, y: 0 },
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

// Apply a map preset to the active constants
CONSTANTS.applyMap = function(mapId) {
  const map = CONSTANTS.MAPS[mapId] || CONSTANTS.MAPS.big;
  CONSTANTS.FIELD_W = map.FIELD_W;
  CONSTANTS.FIELD_H = map.FIELD_H;
  CONSTANTS.FIELD_MARGIN = map.FIELD_MARGIN;
  CONSTANTS.PLAYER_OUT_OF_BOUNDS = map.PLAYER_OUT_OF_BOUNDS;
  CONSTANTS.GOAL_DEPTH = map.GOAL_DEPTH;
  CONSTANTS.GOAL_WIDTH = map.GOAL_WIDTH;
  CONSTANTS.GOAL_POST_RADIUS = map.GOAL_POST_RADIUS;
  CONSTANTS.SPAWNS = map.SPAWNS;
};

if (typeof module !== "undefined") module.exports = CONSTANTS;
if (typeof window !== "undefined") window.CONSTANTS = CONSTANTS;
