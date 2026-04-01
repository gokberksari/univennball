const Input = (() => {
  const keys = {};

  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevent space from scrolling
    if (e.code === 'Space') e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Reset all keys when window loses focus
  window.addEventListener('blur', () => {
    for (const key in keys) keys[key] = false;
  });

  function getInput() {
    return {
      up:    !!(keys['ArrowUp']    || keys['KeyW']),
      down:  !!(keys['ArrowDown']  || keys['KeyS']),
      left:  !!(keys['ArrowLeft']  || keys['KeyA']),
      right: !!(keys['ArrowRight'] || keys['KeyD']),
      kick:  !!(keys['KeyX']       || keys['Space']),
    };
  }

  let inputInterval = null;

  function startLoop(socket) {
    stopLoop();
    inputInterval = setInterval(() => {
      socket.emit('input', getInput());
    }, CONSTANTS.TICK_MS);
  }

  function stopLoop() {
    if (inputInterval) {
      clearInterval(inputInterval);
      inputInterval = null;
    }
  }

  return { getInput, startLoop, stopLoop };
})();
