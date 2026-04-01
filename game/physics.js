const C = (typeof require !== 'undefined') ? require('./constants') : window.CONSTANTS;

function createBall() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    radius: C.BALL_RADIUS,
    mass: C.BALL_MASS,
    damping: C.BALL_DAMPING,
    bounce: C.BALL_BOUNCE,
    isBall: true,
    lastKickedBy: null, // { id, nick, team }
  };
}

function createPlayer(id, nick, team, spawnIndex) {
  const spawns = C.SPAWNS[team];
  const spawn = spawns[spawnIndex % spawns.length];
  return {
    id,
    nick,
    team,
    x: spawn.x,
    y: spawn.y,
    vx: 0, vy: 0,
    radius: C.PLAYER_RADIUS,
    mass: C.PLAYER_MASS,
    damping: C.PLAYER_DAMPING,
    bounce: C.PLAYER_BOUNCE,
    isBall: false,
    input: { up: false, down: false, left: false, right: false, kick: false },
    kickCooldown: 0,
    label: nick ? nick.substring(0, 2).toUpperCase() : '??',
  };
}

function applyInput(player) {
  const inp = player.input;
  if (inp.up)    player.vy -= C.PLAYER_ACCEL;
  if (inp.down)  player.vy += C.PLAYER_ACCEL;
  if (inp.left)  player.vx -= C.PLAYER_ACCEL;
  if (inp.right) player.vx += C.PLAYER_ACCEL;

  // Clamp speed
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > C.PLAYER_MAX_SPEED) {
    player.vx = (player.vx / speed) * C.PLAYER_MAX_SPEED;
    player.vy = (player.vy / speed) * C.PLAYER_MAX_SPEED;
  }
}

function resolveCircleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // Separate
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / totalMass);
  a.y -= ny * overlap * (b.mass / totalMass);
  b.x += nx * overlap * (a.mass / totalMass);
  b.y += ny * overlap * (a.mass / totalMass);

  // Relative velocity along normal
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const relVelNormal = dvx * nx + dvy * ny;

  if (relVelNormal < 0) return;

  const e = 0.5;
  const j = (-(1 + e) * relVelNormal) / (1 / a.mass + 1 / b.mass);

  a.vx += (j / a.mass) * nx;
  a.vy += (j / a.mass) * ny;
  b.vx -= (j / b.mass) * nx;
  b.vy -= (j / b.mass) * ny;
}

function resolveWallCollisions(disc) {
  const hw = C.FIELD_W / 2;
  const hh = C.FIELD_H / 2;
  const gw = C.GOAL_WIDTH / 2;
  const r = disc.radius;
  const bounce = disc.bounce;

  // Players can go beyond field lines by PLAYER_OUT_OF_BOUNDS
  const extra = disc.isBall ? 0 : C.PLAYER_OUT_OF_BOUNDS;

  // Top wall
  if (disc.y - r < -(hh + extra)) {
    disc.y = -(hh + extra) + r;
    disc.vy = Math.abs(disc.vy) * bounce;
  }
  // Bottom wall
  if (disc.y + r > hh + extra) {
    disc.y = hh + extra - r;
    disc.vy = -Math.abs(disc.vy) * bounce;
  }

  // Left wall
  if (disc.x - r < -(hw + extra)) {
    const inGoalY = disc.y > -gw && disc.y < gw;
    if (disc.isBall && inGoalY) {
      // Ball in goal area - clamp to goal depth
      if (disc.x - r < -hw - C.GOAL_DEPTH) {
        disc.x = -hw - C.GOAL_DEPTH + r;
        disc.vx = Math.abs(disc.vx) * bounce;
      }
      // Also clamp Y within goal area
      if (disc.y - r < -gw) {
        disc.y = -gw + r;
        disc.vy = Math.abs(disc.vy) * bounce;
      }
      if (disc.y + r > gw) {
        disc.y = gw - r;
        disc.vy = -Math.abs(disc.vy) * bounce;
      }
    } else {
      disc.x = -(hw + extra) + r;
      disc.vx = Math.abs(disc.vx) * bounce;
    }
  }

  // Right wall
  if (disc.x + r > hw + extra) {
    const inGoalY = disc.y > -gw && disc.y < gw;
    if (disc.isBall && inGoalY) {
      if (disc.x + r > hw + C.GOAL_DEPTH) {
        disc.x = hw + C.GOAL_DEPTH - r;
        disc.vx = -Math.abs(disc.vx) * bounce;
      }
      if (disc.y - r < -gw) {
        disc.y = -gw + r;
        disc.vy = Math.abs(disc.vy) * bounce;
      }
      if (disc.y + r > gw) {
        disc.y = gw - r;
        disc.vy = -Math.abs(disc.vy) * bounce;
      }
    } else {
      disc.x = hw + extra - r;
      disc.vx = -Math.abs(disc.vx) * bounce;
    }
  }
}

function resolvePostCollision(disc, post) {
  const dx = disc.x - post.x;
  const dy = disc.y - post.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = disc.radius + post.radius;

  if (dist >= minDist || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  disc.x = post.x + nx * minDist;
  disc.y = post.y + ny * minDist;

  const dot = disc.vx * nx + disc.vy * ny;
  if (dot < 0) {
    disc.vx -= 2 * dot * nx;
    disc.vy -= 2 * dot * ny;
    disc.vx *= 0.8;
    disc.vy *= 0.8;
  }
}

function tryKick(player, ball) {
  if (player.kickCooldown > 0) return false;

  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const kickRange = player.radius + ball.radius + C.KICK_RADIUS;

  if (dist > kickRange || dist === 0) return false;

  const nx = dx / dist;
  const ny = dy / dist;

  ball.vx += nx * C.KICK_FORCE;
  ball.vy += ny * C.KICK_FORCE;

  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > C.BALL_MAX_SPEED) {
    ball.vx = (ball.vx / speed) * C.BALL_MAX_SPEED;
    ball.vy = (ball.vy / speed) * C.BALL_MAX_SPEED;
  }

  ball.lastKickedBy = { id: player.id, nick: player.nick, team: player.team };
  player.kickCooldown = C.KICK_COOLDOWN;
  return true;
}

function checkGoal(ball) {
  const hw = C.FIELD_W / 2;
  const gw = C.GOAL_WIDTH / 2;

  if (ball.x < -hw && ball.y > -gw && ball.y < gw) {
    return 'blue'; // Blue scored (ball in red's goal)
  }
  if (ball.x > hw && ball.y > -gw && ball.y < gw) {
    return 'red';  // Red scored (ball in blue's goal)
  }
  return null;
}

function createPosts() {
  const hw = C.FIELD_W / 2;
  const gw = C.GOAL_WIDTH / 2;
  const r = C.GOAL_POST_RADIUS;
  return [
    { x: -hw, y: -gw, radius: r },
    { x: -hw, y: gw, radius: r },
    { x: hw, y: -gw, radius: r },
    { x: hw, y: gw, radius: r },
  ];
}

function tick(gameState) {
  const { players, ball, posts } = gameState;
  const kickingIds = [];

  // 1. Apply inputs and kick
  for (const player of players) {
    applyInput(player);
    if (player.kickCooldown > 0) player.kickCooldown--;
    if (player.input.kick) {
      const kicked = tryKick(player, ball);
      if (kicked) kickingIds.push(player.id);
    }
  }

  // 2. Move all discs
  const allDiscs = [...players, ball];
  for (const disc of allDiscs) {
    disc.x += disc.vx;
    disc.y += disc.vy;
    disc.vx *= disc.damping;
    disc.vy *= disc.damping;
    // Stop tiny velocities
    if (Math.abs(disc.vx) < 0.01) disc.vx = 0;
    if (Math.abs(disc.vy) < 0.01) disc.vy = 0;
  }

  // 3. Circle-circle collisions (3 passes for stability)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < allDiscs.length; i++) {
      for (let j = i + 1; j < allDiscs.length; j++) {
        resolveCircleCollision(allDiscs[i], allDiscs[j]);
      }
    }
  }

  // 4. Wall collisions
  for (const disc of allDiscs) {
    resolveWallCollisions(disc);
  }

  // 5. Goal post collisions
  for (const post of posts) {
    for (const disc of allDiscs) {
      resolvePostCollision(disc, post);
    }
  }

  // 6. Goal detection
  const scorer = checkGoal(ball);

  return { scorer, kickingIds, lastKickedBy: ball.lastKickedBy };
}

function resetPositions(gameState) {
  gameState.ball.x = 0;
  gameState.ball.y = 0;
  gameState.ball.vx = 0;
  gameState.ball.vy = 0;

  const redCount = { n: 0 };
  const blueCount = { n: 0 };
  for (const player of gameState.players) {
    const counter = player.team === 'red' ? redCount : blueCount;
    const spawns = C.SPAWNS[player.team];
    const spawn = spawns[counter.n % spawns.length];
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.kickCooldown = 0;
    counter.n++;
  }
}

const Physics = {
  createBall,
  createPlayer,
  createPosts,
  tick,
  resetPositions,
  checkGoal,
};

if (typeof module !== 'undefined') module.exports = Physics;
