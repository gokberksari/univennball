const Renderer = (() => {
  let C;
  let canvas, ctx;
  let fieldCanvas, fieldCtx; // offscreen - field drawn once
  let fullW, fullH;          // full field canvas dimensions

  function init(canvasEl) {
    C = window.CONSTANTS || CONSTANTS;
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    resizeCanvas();

    fullW = C.FIELD_W + C.FIELD_MARGIN * 2;
    fullH = C.FIELD_H + C.FIELD_MARGIN * 2;

    // Pre-render static field to offscreen canvas
    fieldCanvas = document.createElement('canvas');
    fieldCanvas.width = fullW;
    fieldCanvas.height = fullH;
    fieldCtx = fieldCanvas.getContext('2d');
    drawFieldToOffscreen();

    // Resize canvas when window resizes
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }

  // ── Offscreen field (drawn once) ──
  function drawFieldToOffscreen() {
    const fctx = fieldCtx;
    const ox = C.FIELD_MARGIN;
    const oy = C.FIELD_MARGIN;
    const fw = C.FIELD_W;
    const fh = C.FIELD_H;
    const gw = C.GOAL_WIDTH;
    const goalTop = oy + fh / 2 - gw / 2;
    const goalBot = oy + fh / 2 + gw / 2;

    // Background
    fctx.fillStyle = '#1b3a1e';
    fctx.fillRect(0, 0, fullW, fullH);

    // Diagonal stripes
    fctx.save();
    fctx.beginPath();
    fctx.rect(0, 0, fullW, fullH);
    fctx.clip();
    fctx.strokeStyle = 'rgba(40, 90, 40, 0.18)';
    fctx.lineWidth = 40;
    for (let i = -fullH; i < fullW + fullH; i += 80) {
      fctx.beginPath();
      fctx.moveTo(i, 0);
      fctx.lineTo(i + fullH, fullH);
      fctx.stroke();
    }
    fctx.restore();

    // Vignette
    const vg = fctx.createRadialGradient(
      fullW / 2, fullH / 2, Math.min(fullW, fullH) * 0.2,
      fullW / 2, fullH / 2, Math.max(fullW, fullH) * 0.55
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.2)');
    fctx.fillStyle = vg;
    fctx.fillRect(0, 0, fullW, fullH);

    // Field boundary lines
    fctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    fctx.lineWidth = 2;

    // Top & bottom
    fctx.beginPath();
    fctx.moveTo(ox, oy);
    fctx.lineTo(ox + fw, oy);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(ox, oy + fh);
    fctx.lineTo(ox + fw, oy + fh);
    fctx.stroke();

    // Left wall (goal gap)
    fctx.beginPath();
    fctx.moveTo(ox, oy);
    fctx.lineTo(ox, goalTop);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(ox, goalBot);
    fctx.lineTo(ox, oy + fh);
    fctx.stroke();

    // Right wall (goal gap)
    fctx.beginPath();
    fctx.moveTo(ox + fw, oy);
    fctx.lineTo(ox + fw, goalTop);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(ox + fw, goalBot);
    fctx.lineTo(ox + fw, oy + fh);
    fctx.stroke();

    // Center line
    fctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    fctx.beginPath();
    fctx.moveTo(ox + fw / 2, oy);
    fctx.lineTo(ox + fw / 2, oy + fh);
    fctx.stroke();

    // Center circle
    fctx.beginPath();
    fctx.arc(ox + fw / 2, oy + fh / 2, 80, 0, Math.PI * 2);
    fctx.stroke();

    // Center dot
    fctx.beginPath();
    fctx.arc(ox + fw / 2, oy + fh / 2, 4, 0, Math.PI * 2);
    fctx.fillStyle = 'rgba(255,255,255,0.25)';
    fctx.fill();

    // Penalty areas
    fctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    const penW = 140;
    const penH = 350;
    const penTop = oy + fh / 2 - penH / 2;
    fctx.strokeRect(ox, penTop, penW, penH);
    fctx.strokeRect(ox + fw - penW, penTop, penW, penH);

    // Goal nets
    drawGoalNet(fctx, ox - C.GOAL_DEPTH, goalTop, C.GOAL_DEPTH, gw, 'left');
    drawGoalNet(fctx, ox + fw, goalTop, C.GOAL_DEPTH, gw, 'right');

    // Goal posts
    const postR = C.GOAL_POST_RADIUS;
    const posts = [
      [ox, goalTop], [ox, goalBot],
      [ox + fw, goalTop], [ox + fw, goalBot],
    ];
    for (const [px, py] of posts) {
      fctx.beginPath();
      fctx.arc(px, py, postR, 0, Math.PI * 2);
      fctx.fillStyle = '#ccc';
      fctx.fill();
      fctx.strokeStyle = 'rgba(255,255,255,0.3)';
      fctx.lineWidth = 1.5;
      fctx.stroke();
    }

    // Halfway line markers (small ticks at the edges)
    fctx.strokeStyle = 'rgba(255,255,255,0.1)';
    fctx.lineWidth = 1;
    const midX = ox + fw / 2;
    fctx.beginPath();
    fctx.moveTo(midX, oy - 5);
    fctx.lineTo(midX, oy + 5);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(midX, oy + fh - 5);
    fctx.lineTo(midX, oy + fh + 5);
    fctx.stroke();
  }

  function drawGoalNet(c, x, y, w, h, side) {
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
    c.strokeStyle = 'rgba(200, 200, 200, 0.25)';
    c.lineWidth = 2;

    const r = 12;
    c.beginPath();
    if (side === 'left') {
      c.moveTo(x + w, y);
      c.lineTo(x + r, y);
      c.quadraticCurveTo(x, y, x, y + r);
      c.lineTo(x, y + h - r);
      c.quadraticCurveTo(x, y + h, x + r, y + h);
      c.lineTo(x + w, y + h);
    } else {
      c.moveTo(x, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x, y + h);
    }
    c.fill();
    c.stroke();

    // Net grid
    c.strokeStyle = 'rgba(200, 200, 200, 0.07)';
    c.lineWidth = 1;
    const step = 14;
    for (let gy = y + step; gy < y + h; gy += step) {
      c.beginPath();
      c.moveTo(x, gy);
      c.lineTo(x + w, gy);
      c.stroke();
    }
    for (let gx = x + step; gx < x + w; gx += step) {
      c.beginPath();
      c.moveTo(gx, y);
      c.lineTo(gx, y + h);
      c.stroke();
    }
  }

  // ── Camera ──
  function getCameraOffset(myPlayer) {
    const viewW = canvas.width;
    const viewH = canvas.height;

    // Camera centers on the player
    const playerCanvasX = C.FIELD_MARGIN + C.FIELD_W / 2 + myPlayer.x;
    const playerCanvasY = C.FIELD_MARGIN + C.FIELD_H / 2 + myPlayer.y;

    let camX, camY;

    if (fullW <= viewW) {
      // Field fits in viewport — center it
      camX = -(viewW - fullW) / 2;
    } else {
      camX = playerCanvasX - viewW / 2;
      camX = Math.max(0, Math.min(camX, fullW - viewW));
    }

    if (fullH <= viewH) {
      camY = -(viewH - fullH) / 2;
    } else {
      camY = playerCanvasY - viewH / 2;
      camY = Math.max(0, Math.min(camY, fullH - viewH));
    }

    return { camX, camY };
  }

  // ── Dynamic object drawing (per frame) ──
  function drawPlayer(px, py, player, isKicking, isMe) {
    const r = C.PLAYER_RADIUS;
    const isRed = player.t === 'red';

    // "Me" indicator - pulsing circle around own player
    if (isMe) {
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(px, py, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Glow
    const glowGrad = ctx.createRadialGradient(px, py, r * 0.3, px, py, r * 2.2);
    glowGrad.addColorStop(0, isRed ? 'rgba(255,77,90,0.12)' : 'rgba(77,142,255,0.12)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(px - r * 2.5, py - r * 2.5, r * 5, r * 5);

    // Kick ring
    if (isKicking) {
      ctx.beginPath();
      ctx.arc(px, py, r + C.KICK_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = isRed ? 'rgba(255,77,90,0.5)' : 'rgba(77,142,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Shadow
    ctx.beginPath();
    ctx.ellipse(px + 1, py + r * 0.8, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Outer circle
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, r);
    if (isRed) {
      grad.addColorStop(0, '#ff6b73');
      grad.addColorStop(1, '#d9303a');
    } else {
      grad.addColorStop(0, '#6da4ff');
      grad.addColorStop(1, '#2a6de0');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = isRed ? 'rgba(180,30,30,0.6)' : 'rgba(30,60,180,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner white circle
    ctx.beginPath();
    ctx.arc(px, py, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();

    // Label (initials inside disc)
    ctx.fillStyle = '#222';
    ctx.font = `bold ${Math.round(r * 0.65)}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.l || '??', px, py + 0.5);

    // Nick below player
    if (player.n) {
      ctx.font = `600 11px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(player.n, px + 1, py + r + 5 + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(player.n, px, py + r + 5);
    }
  }

  function drawBall(px, py) {
    const r = C.BALL_RADIUS;

    // Glow
    const glow = ctx.createRadialGradient(px, py, r * 0.5, px, py, r * 3);
    glow.addColorStop(0, 'rgba(255,255,255,0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

    // Shadow
    ctx.beginPath();
    ctx.ellipse(px + 0.5, py + r * 0.7, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, r);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(1, '#ddd');
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // ── Main render with camera ──
  function render(state, myId) {
    if (!ctx || !fieldCanvas) return;

    const viewW = canvas.width;
    const viewH = canvas.height;

    // Find my player for camera
    let cam = { camX: 0, camY: 0 };
    if (state) {
      const me = myId ? state.p.find(p => p.id === myId) : null;
      cam = getCameraOffset(me || { x: 0, y: 0 });
    }

    // Clear canvas and draw field (handles centering when field < viewport)
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.drawImage(fieldCanvas, -cam.camX, -cam.camY);

    if (!state) return;

    const kickSet = new Set(state.k || []);

    // Draw players
    for (const p of state.p) {
      const screenX = C.FIELD_MARGIN + C.FIELD_W / 2 + p.x - cam.camX;
      const screenY = C.FIELD_MARGIN + C.FIELD_H / 2 + p.y - cam.camY;

      // Skip if off screen (with margin for glow)
      if (screenX < -40 || screenX > viewW + 40 ||
          screenY < -40 || screenY > viewH + 40) continue;

      drawPlayer(screenX, screenY, p, kickSet.has(p.id), p.id === myId);
    }

    // Draw ball
    const ballScreenX = C.FIELD_MARGIN + C.FIELD_W / 2 + state.b.x - cam.camX;
    const ballScreenY = C.FIELD_MARGIN + C.FIELD_H / 2 + state.b.y - cam.camY;
    if (ballScreenX > -20 && ballScreenX < viewW + 20 &&
        ballScreenY > -20 && ballScreenY < viewH + 20) {
      drawBall(ballScreenX, ballScreenY);
    }

    // Draw ball indicator arrow if ball is off screen
    if (ballScreenX < 0 || ballScreenX > viewW ||
        ballScreenY < 0 || ballScreenY > viewH) {
      drawBallIndicator(ballScreenX, ballScreenY);
    }
  }

  function drawBallIndicator(bx, by) {
    const viewW = canvas.width;
    const viewH = canvas.height;
    // Arrow pointing towards the ball at the edge of the screen
    const cx = viewW / 2;
    const cy = viewH / 2;
    const angle = Math.atan2(by - cy, bx - cx);
    const margin = 30;

    // Clamp to screen edge
    let ix = bx, iy = by;
    if (ix < margin) ix = margin;
    if (ix > viewW - margin) ix = viewW - margin;
    if (iy < margin) iy = margin;
    if (iy > viewH - margin) iy = viewH - margin;

    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(angle);

    // Triangle arrow
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    // Small circle
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    ctx.restore();
  }

  return { init, render };
})();
