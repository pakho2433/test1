export function setupControls(renderer, THREE) {
  const move = { x: 0, y: 0 };
  let jumpQueued = false;
  const camera = { yaw: 0.62, pitch: 0.52, distance: 12.5 };

  const joystick = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  let joystickPointer = null;

  function setJoystick(e) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.31;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    move.x = dx / max;
    move.y = dy / max;
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetJoystick() {
    move.x = 0;
    move.y = 0;
    stick.style.transform = 'translate(-50%,-50%)';
    joystickPointer = null;
  }

  joystick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystickPointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    setJoystick(e);
  }, { passive: false });

  joystick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joystickPointer) return;
    e.preventDefault();
    setJoystick(e);
  }, { passive: false });

  joystick.addEventListener('pointerup', (e) => {
    if (e.pointerId === joystickPointer) resetJoystick();
  }, { passive: false });
  joystick.addEventListener('pointercancel', resetJoystick, { passive: false });

  const jump = document.getElementById('jump');
  jump.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jumpQueued = true;
    jump.classList.add('active');
  }, { passive: false });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    jump.addEventListener(type, (e) => {
      e.preventDefault();
      jump.classList.remove('active');
    }, { passive: false });
  });

  const keys = { forward: false, back: false, left: false, right: false };
  const keyMap = {
    ArrowUp: 'forward', KeyW: 'forward',
    ArrowDown: 'back', KeyS: 'back',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      jumpQueued = true;
      e.preventDefault();
      return;
    }
    const key = keyMap[e.code];
    if (key) {
      keys[key] = true;
      e.preventDefault();
    }
  }, { passive: false });

  addEventListener('keyup', (e) => {
    const key = keyMap[e.code];
    if (key) {
      keys[key] = false;
      e.preventDefault();
    }
  }, { passive: false });

  let lookPointer = null;
  let lastX = 0;
  let lastY = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.clientX < innerWidth * 0.43) return;
    e.preventDefault();
    lookPointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  }, { passive: false });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookPointer) return;
    e.preventDefault();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camera.yaw -= dx * 0.007;
    camera.pitch = THREE.MathUtils.clamp(camera.pitch + dy * 0.005, 0.12, 1.12);
  }, { passive: false });

  const stopLook = (e) => {
    if (e.pointerId === lookPointer) lookPointer = null;
  };
  renderer.domElement.addEventListener('pointerup', stopLook);
  renderer.domElement.addEventListener('pointercancel', stopLook);

  return {
    move,
    keys,
    camera,
    consumeJump() {
      const queued = jumpQueued;
      jumpQueued = false;
      return queued;
    }
  };
}
