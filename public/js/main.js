(() => {
  const socket = io();
  let myId = null;
  let currentScreen = 'screen-nick';
  let gameState = null;
  let prevState = null;
  let stateTimestamp = 0;
  let animFrameId = null;

  // ── Screen management ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    currentScreen = id;

    // Toggle body class for game mode (hides header, full viewport)
    if (id === 'screen-game') {
      document.body.classList.add('in-game');
    } else {
      document.body.classList.remove('in-game');
    }
  }

  // ── Nick screen ──
  const nickInput = document.getElementById('nick-input');
  const nickOk = document.getElementById('nick-ok');

  function submitNick() {
    const nick = nickInput.value.trim() || 'Oyuncu';
    socket.emit('set-nick', nick);
    showScreen('screen-lobby');
  }

  nickOk.addEventListener('click', submitNick);
  nickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitNick();
  });

  // ── Lobby ──
  const teamRedList = document.getElementById('team-red-list');
  const teamBlueList = document.getElementById('team-blue-list');
  const teamSpecList = document.getElementById('team-spec-list');
  const btnStart = document.getElementById('btn-start');

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('join-team', btn.dataset.team);
    });
  });

  btnStart.addEventListener('click', () => {
    socket.emit('start-game');
  });

  socket.on('connect', () => {
    myId = socket.id;
  });

  socket.on('lobby-updated', (data) => {
    // Update player lists
    const red = data.players.filter(p => p.team === 'red');
    const blue = data.players.filter(p => p.team === 'blue');
    const spec = data.players.filter(p => p.team === 'spectator');

    renderPlayerList(teamRedList, red, data.hostId);
    renderPlayerList(teamBlueList, blue, data.hostId);
    renderPlayerList(teamSpecList, spec, data.hostId);

    // Show start button only for host
    if (data.hostId === myId) {
      btnStart.classList.remove('hidden');
    } else {
      btnStart.classList.add('hidden');
    }
  });

  function renderPlayerList(ul, players, hostId) {
    ul.innerHTML = '';
    for (const p of players) {
      const li = document.createElement('li');
      li.textContent = p.nick;
      if (p.id === myId) li.classList.add('is-me');
      if (p.id === hostId) {
        const badge = document.createElement('span');
        badge.className = 'host-badge';
        badge.textContent = ' ★';
        li.appendChild(badge);
      }
      ul.appendChild(li);
    }
  }

  // ── Game ──
  const scoreRedEl = document.getElementById('score-red');
  const scoreBlueEl = document.getElementById('score-blue');
  const timerEl = document.getElementById('timer');
  const goalOverlay = document.getElementById('goal-overlay');
  const goalText = document.getElementById('goal-text');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const gameoverText = document.getElementById('gameover-text');
  const btnBackLobby = document.getElementById('btn-back-lobby');

  socket.on('game-start', (state) => {
    showScreen('screen-game');
    gameoverOverlay.classList.add('hidden');
    goalOverlay.classList.add('hidden');

    Renderer.init(document.getElementById('game-canvas'));
    gameState = state;
    prevState = null;
    stateTimestamp = Date.now();

    updateScoreboard(state.s, state.t);
    Input.startLoop(socket);
    startRenderLoop();
  });

  socket.on('state', (state) => {
    prevState = gameState;
    gameState = state;
    stateTimestamp = Date.now();
    updateScoreboard(state.s, state.t);
  });

  // ── Celebration ──
  const celebrationMedia = document.getElementById('celebration-media');
  const celebrationVideo = document.getElementById('celebration-video');
  const celebrationNick = document.getElementById('celebration-nick');

  // Celebration videos: nick (lowercase) -> video file
  const CELEBRATIONS = {
    'ayhan':    '/celebrations/Ayhan Aksoy.mp4',
    'baran':    '/celebrations/Baran Barış Bal.mp4',
    'barışc':   '/celebrations/Barış Can Hasar.mp4',
    'barışt':   '/celebrations/Barış Topal.mp4',
    'bedirhan': '/celebrations/Bedirhan.mp4',
    'bilal':    '/celebrations/Bilal Gümüş.mp4',
    'deniz':    '/celebrations/Deniz Erişen.mp4',
    'ezel':     '/celebrations/Ezel Yalçın.mp4',
    'furkan':   '/celebrations/Furkan Erkorkmaz.mp4',
    'gökberk':  '/celebrations/Gökberk Sarı.mp4',
    'hakan':    '/celebrations/Hakan Işık.mp4',
    'melisa':   '/celebrations/Melisa.mp4',
    'meriç':    '/celebrations/Meriç Ödemiş.mp4',
    'murat':    '/celebrations/Murat Ödemiş.mp4',
    'ozan':     '/celebrations/Ozan İşgör.mp4',
    'oğuzhan':  '/celebrations/Oğuzhan Aslan.mp4',
    'sara':     '/celebrations/Sara Mboqe Koçak.mp4',
    'yunus':    '/celebrations/Yunus Gülcü.mp4',
    'zehra':    '/celebrations/Zehra Özce Özbaşoğlu.mp4',
  };

  function showCelebration(nick) {
    const url = CELEBRATIONS[nick.toLowerCase()];
    if (!url) return;
    celebrationNick.textContent = nick;
    celebrationVideo.src = url;
    celebrationVideo.classList.remove('hidden');
    celebrationVideo.play().catch(() => {});
    celebrationMedia.classList.remove('hidden');
  }

  function hideCelebration() {
    celebrationMedia.classList.add('hidden');
    celebrationVideo.pause();
    celebrationVideo.src = '';
  }

  socket.on('goal', (data) => {
    goalText.textContent = 'GOL!';
    goalText.style.color = data.team === 'red' ? '#ff4d5a' : '#4d8eff';
    goalOverlay.classList.remove('hidden');
    hideCelebration();

    updateScore(data.score);

    if (data.scoredBy) {
      showCelebration(data.scoredBy);
    }

    setTimeout(() => {
      goalOverlay.classList.add('hidden');
      hideCelebration();
    }, 3500);
  });

  socket.on('game-over', (data) => {
    Input.stopLoop();
    stopRenderLoop();

    updateScore(data.score);

    let text;
    if (data.winner === 'red') {
      text = 'Kırmızı Kazandı!';
      gameoverText.style.color = '#ff4d5a';
    } else {
      text = 'Mavi Kazandı!';
      gameoverText.style.color = '#4d8eff';
    }
    gameoverText.textContent = `${text} (${data.score.red} - ${data.score.blue})`;
    gameoverOverlay.classList.remove('hidden');
  });

  socket.on('overtime', () => {
    goalText.textContent = 'UZATMA!';
    goalText.style.color = '#fff';
    goalOverlay.classList.remove('hidden');
    setTimeout(() => {
      goalOverlay.classList.add('hidden');
    }, 1800);
  });

  socket.on('error', (data) => {
    alert(data.message);
  });

  btnBackLobby.addEventListener('click', () => {
    showScreen('screen-lobby');
    gameoverOverlay.classList.add('hidden');
    goalOverlay.classList.add('hidden');
  });

  function updateScore(score) {
    scoreRedEl.textContent = score.red;
    scoreBlueEl.textContent = score.blue;
  }

  function updateScoreboard(score, timeRemaining) {
    updateScore(score);
    const min = Math.floor(Math.max(0, timeRemaining) / 60);
    const sec = Math.max(0, timeRemaining) % 60;
    timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // ── Render loop with interpolation ──
  function getInterpolatedState() {
    if (!gameState) return null;
    if (!prevState) return gameState;

    const elapsed = Date.now() - stateTimestamp;
    const t = Math.min(elapsed / CONSTANTS.TICK_MS, 1);

    return {
      p: gameState.p.map((curr, i) => {
        const prev = prevState.p && prevState.p[i];
        if (!prev || prev.id !== curr.id) return curr;
        return {
          ...curr,
          x: prev.x + (curr.x - prev.x) * t,
          y: prev.y + (curr.y - prev.y) * t,
        };
      }),
      b: {
        x: (prevState.b ? prevState.b.x : gameState.b.x) +
           (gameState.b.x - (prevState.b ? prevState.b.x : gameState.b.x)) * t,
        y: (prevState.b ? prevState.b.y : gameState.b.y) +
           (gameState.b.y - (prevState.b ? prevState.b.y : gameState.b.y)) * t,
      },
      s: gameState.s,
      t: gameState.t,
      k: gameState.k,
    };
  }

  function renderLoop() {
    const interpolated = getInterpolatedState();
    Renderer.render(interpolated, myId);
    animFrameId = requestAnimationFrame(renderLoop);
  }

  function startRenderLoop() {
    stopRenderLoop();
    renderLoop();
  }

  function stopRenderLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ── Chat ──
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const lobbyChatMessages = document.getElementById('lobby-chat-messages');
  const lobbyChatForm = document.getElementById('lobby-chat-form');
  const lobbyChatInput = document.getElementById('lobby-chat-input');

  function appendChatMsg(container, nick, team, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const nickSpan = document.createElement('span');
    nickSpan.className = 'chat-nick ' + (team || 'spectator');
    nickSpan.textContent = nick + ':';
    const textSpan = document.createElement('span');
    textSpan.className = 'chat-text';
    textSpan.textContent = ' ' + text;
    div.appendChild(nickSpan);
    div.appendChild(textSpan);
    container.appendChild(div);
    // Keep max 100 messages
    while (container.children.length > 100) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
  }

  socket.on('chat', (data) => {
    // Append to both chat panels (whichever is visible)
    appendChatMsg(chatMessages, data.nick, data.team, data.text);
    appendChatMsg(lobbyChatMessages, data.nick, data.team, data.text);
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('chat', text);
    chatInput.value = '';
  });

  lobbyChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = lobbyChatInput.value.trim();
    if (!text) return;
    socket.emit('chat', text);
    lobbyChatInput.value = '';
  });

  // Prevent game input while typing in chat
  chatInput.addEventListener('focus', () => Input.stopLoop());
  chatInput.addEventListener('blur', () => {
    if (currentScreen === 'screen-game' && gameState) Input.startLoop(socket);
  });

  // ── Handle game already running (reconnect) ──
  socket.on('game-running', (state) => {
    // If a game is already in progress when we join, show it as spectator
    showScreen('screen-game');
    Renderer.init(document.getElementById('game-canvas'));
    gameState = state;
    stateTimestamp = Date.now();
    updateScoreboard(state.s, state.t);
    startRenderLoop();
  });
})();
