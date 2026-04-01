const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const C = require('./game/constants');
const Physics = require('./game/physics');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
// Serve game/ files so client can load constants.js
app.use('/game', express.static(path.join(__dirname, 'game')));
// Serve pre-generated celebration media
app.use('/celebrations', express.static(path.join(__dirname, 'celebrations', 'output')));

// ── Single lobby state ──
const lobby = {
  players: new Map(), // socketId -> { id, nick, team }
  settings: {
    timeLimit: C.DEFAULT_TIME_LIMIT,
    scoreLimit: C.DEFAULT_SCORE_LIMIT,
    map: 'big',
  },
  hostId: null,
  game: null, // null = in lobby, object = game running
};

function getLobbyState() {
  const players = [];
  for (const [id, p] of lobby.players) {
    players.push({ id, nick: p.nick, team: p.team });
  }
  return {
    players,
    settings: lobby.settings,
    hostId: lobby.hostId,
  };
}

function broadcastLobby() {
  io.emit('lobby-updated', getLobbyState());
}

// ── Game state management ──
function startGame() {
  // Apply selected map
  C.applyMap(lobby.settings.map);

  const redPlayers = [];
  const bluePlayers = [];
  for (const [, p] of lobby.players) {
    if (p.team === 'red') redPlayers.push(p);
    else if (p.team === 'blue') bluePlayers.push(p);
  }

  if (redPlayers.length === 0 || bluePlayers.length === 0) return false;

  const gameState = {
    players: [],
    ball: Physics.createBall(),
    posts: Physics.createPosts(),
    score: { red: 0, blue: 0 },
    timeRemaining: lobby.settings.timeLimit * 60, // seconds
    goalPause: false,
    tickInterval: null,
    tickCount: 0,
  };

  redPlayers.forEach((p, i) => {
    gameState.players.push(Physics.createPlayer(p.id, p.nick, 'red', i));
  });
  bluePlayers.forEach((p, i) => {
    gameState.players.push(Physics.createPlayer(p.id, p.nick, 'blue', i));
  });

  lobby.game = gameState;

  io.emit('game-start', { ...compactState(gameState), map: lobby.settings.map });

  // Start game loop
  gameState.tickInterval = setInterval(() => {
    if (gameState.goalPause) return;

    const { scorer, kickingIds, lastKickedBy } = Physics.tick(gameState);

    gameState.tickCount++;
    if (gameState.tickCount % C.TICK_RATE === 0) {
      gameState.timeRemaining--;
    }

    io.emit('state', compactState(gameState, kickingIds));

    // Goal scored
    if (scorer) {
      gameState.score[scorer]++;
      gameState.goalPause = true;
      io.emit('goal', {
        team: scorer,
        score: { ...gameState.score },
        scoredBy: lastKickedBy ? lastKickedBy.nick : null,
      });

      // Check score limit or golden goal in overtime
      if (gameState.score[scorer] >= lobby.settings.scoreLimit || gameState.overtime) {
        endGame(scorer);
        return;
      }

      setTimeout(() => {
        if (!lobby.game) return;
        Physics.resetPositions(gameState);
        gameState.goalPause = false;
      }, C.GOAL_RESET_DELAY);
    }

    // Time up
    if (gameState.timeRemaining <= 0) {
      if (gameState.score.red > gameState.score.blue) {
        endGame('red');
      } else if (gameState.score.blue > gameState.score.red) {
        endGame('blue');
      } else {
        // Tied - go to overtime (1 minute golden goal)
        gameState.timeRemaining = 60;
        gameState.overtime = true;
        io.emit('overtime');
      }
    }
  }, C.TICK_MS);

  return true;
}

function endGame(winner) {
  if (!lobby.game) return;
  clearInterval(lobby.game.tickInterval);
  io.emit('game-over', { score: { ...lobby.game.score }, winner });
  lobby.game = null;
}

function compactState(gs, kickingIds) {
  return {
    p: gs.players.map(p => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      id: p.id,
      t: p.team,
      l: p.label,
      n: p.nick,
    })),
    b: {
      x: Math.round(gs.ball.x * 10) / 10,
      y: Math.round(gs.ball.y * 10) / 10,
    },
    s: gs.score,
    t: gs.timeRemaining,
    k: kickingIds || [],
  };
}

// ── Socket handlers ──
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('set-nick', (nick) => {
    const sanitized = String(nick).trim().substring(0, 16) || 'Player';
    lobby.players.set(socket.id, {
      id: socket.id,
      nick: sanitized,
      team: 'spectator',
    });

    // First player becomes host
    if (!lobby.hostId) {
      lobby.hostId = socket.id;
    }

    // If game is running, send current game state
    if (lobby.game) {
      socket.emit('game-running', { ...compactState(lobby.game), map: lobby.settings.map });
    }

    broadcastLobby();
  });

  socket.on('join-team', (team) => {
    const player = lobby.players.get(socket.id);
    if (!player) return;
    if (!['red', 'blue', 'spectator'].includes(team)) return;

    player.team = team;

    // If game is running, add/remove player from active game
    if (lobby.game) {
      // Remove from game first (if already playing)
      lobby.game.players = lobby.game.players.filter(p => p.id !== socket.id);

      if (team === 'red' || team === 'blue') {
        // Add to game with a spawn position
        const teamCount = lobby.game.players.filter(p => p.team === team).length;
        lobby.game.players.push(Physics.createPlayer(socket.id, player.nick, team, teamCount));
      }
    }

    broadcastLobby();
  });

  socket.on('start-game', () => {
    if (socket.id !== lobby.hostId) return;
    if (lobby.game) return;

    const success = startGame();
    if (!success) {
      socket.emit('error', { message: 'Her iki takımda da en az 1 oyuncu olmalı!' });
    }
  });

  socket.on('set-map', (mapId) => {
    if (socket.id !== lobby.hostId) return;
    if (lobby.game) return;
    if (!C.MAPS[mapId]) return;
    lobby.settings.map = mapId;
    broadcastLobby();
  });

  socket.on('stop-game', () => {
    if (socket.id !== lobby.hostId) return;
    if (!lobby.game) return;
    clearInterval(lobby.game.tickInterval);
    io.emit('game-stopped');
    lobby.game = null;
    broadcastLobby();
  });

  socket.on('input', (input) => {
    if (!lobby.game) return;
    const playerDisc = lobby.game.players.find(p => p.id === socket.id);
    if (!playerDisc) return;
    playerDisc.input = {
      up: !!input.up,
      down: !!input.down,
      left: !!input.left,
      right: !!input.right,
      kick: !!input.kick,
    };
  });

  socket.on('chat', (msg) => {
    const player = lobby.players.get(socket.id);
    if (!player) return;
    const text = String(msg).trim().substring(0, 200);
    if (!text) return;
    io.emit('chat', { nick: player.nick, team: player.team, text });
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    lobby.players.delete(socket.id);

    // Remove from game if running
    if (lobby.game) {
      lobby.game.players = lobby.game.players.filter(p => p.id !== socket.id);
      // End game if a team is empty
      const redAlive = lobby.game.players.some(p => p.team === 'red');
      const blueAlive = lobby.game.players.some(p => p.team === 'blue');
      if (!redAlive || !blueAlive) {
        const winner = !redAlive ? 'blue' : 'red';
        endGame(winner);
      }
    }

    // Reassign host
    if (socket.id === lobby.hostId) {
      const next = lobby.players.keys().next();
      lobby.hostId = next.done ? null : next.value;
    }

    broadcastLobby();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
