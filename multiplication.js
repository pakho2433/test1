import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { setupControls } from './controls.js';

const TOTAL_LEVELS = 10;
const errorBox = document.getElementById('error');
window.addEventListener('error', (event) => {
  errorBox.style.display = 'block';
  errorBox.textContent = `載入錯誤：\n${event.message}\n\n請重新整理頁面。`;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07102f);
scene.fog = new THREE.Fog(0x101542, 24, 78);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 140);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.84;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xaecfff, 0x24143c, 1.35));
const sun = new THREE.DirectionalLight(0xffefd8, 1.8);
sun.position.set(9, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

const fill = new THREE.PointLight(0x617cff, 5, 28, 2);
fill.position.set(-8, 7, 6);
scene.add(fill);

const starPositions = [];
for (let i = 0; i < 700; i += 1) {
  const radius = 38 + Math.random() * 58;
  const angle = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 60;
  starPositions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starField = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xc3ddff, size: 0.11, transparent: true, opacity: 0.72, depthWrite: false })
);
scene.add(starField);

const stageGroup = new THREE.Group();
scene.add(stageGroup);
let platforms = [];

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function makeNumberLabel(text, color, scale = 2.2) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(7,12,42,.9)';
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.lineWidth = 9;
  roundedRect(ctx, 16, 16, 224, 128, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 86px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), 128, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(scale * 1.55, scale, 1);
  return sprite;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

function clearStage() {
  platforms = [];
  while (stageGroup.children.length) {
    const child = stageGroup.children.pop();
    disposeObject(child);
  }
}

function addPlatform({ x, y, z, width, depth, color, answer = null, correct = false, start = false }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  stageGroup.add(group);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.05,
    emissive: new THREE.Color(color).multiplyScalar(0.03),
    emissiveIntensity: 0.22
  });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, 0.7, depth, 5, 0.2), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), transparent: true, opacity: 0.55 })
  );
  mesh.add(edge);

  if (answer !== null) {
    const label = makeNumberLabel(answer, color);
    label.position.y = 1.8;
    group.add(label);
  } else if (start) {
    const label = makeNumberLabel('GO', 0x7fa1ff, 1.45);
    label.position.y = 1.55;
    group.add(label);
  }

  const platform = {
    group,
    mesh,
    material,
    x,
    z,
    width,
    depth,
    answer,
    correct,
    start,
    active: true,
    falling: false,
    fallVelocity: 0,
    resolved: false
  };
  platforms.push(platform);
  return platform;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateQuestion() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const correct = a * b;
  const optionCount = Math.random() < 0.5 ? 3 : 4;
  const values = new Set([correct]);
  let guard = 0;

  while (values.size < optionCount && guard < 100) {
    guard += 1;
    const method = Math.floor(Math.random() * 3);
    let candidate;
    if (method === 0) candidate = correct + (Math.floor(Math.random() * 13) - 6);
    else if (method === 1) candidate = a * (1 + Math.floor(Math.random() * 9));
    else candidate = b * (1 + Math.floor(Math.random() * 9));
    candidate = Math.max(1, Math.min(81, candidate));
    if (candidate !== correct) values.add(candidate);
  }

  return { a, b, correct, options: shuffle([...values]) };
}

const platformColors = [0xef6aa8, 0x54bfe2, 0xe8ad43, 0x836fe0];
function buildStage(question) {
  clearStage();
  addPlatform({ x: 0, y: 0, z: 2.8, width: 5.2, depth: 3.8, color: 0x6678d9, start: true });

  const xPositions = question.options.length === 3 ? [-3.5, 0, 3.5] : [-4.8, -1.6, 1.6, 4.8];
  question.options.forEach((answer, index) => {
    addPlatform({
      x: xPositions[index],
      y: 0,
      z: -4.7 - (index % 2) * 0.35,
      width: question.options.length === 3 ? 2.9 : 2.65,
      depth: 2.9,
      color: platformColors[index],
      answer,
      correct: answer === question.correct
    });
  });
}

const player = new THREE.Group();
scene.add(player);
const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ff, roughness: 0.5 });
const purple = new THREE.MeshStandardMaterial({ color: 0x9184dc, roughness: 0.48, emissive: 0x151031, emissiveIntensity: 0.12 });
const dark = new THREE.MeshStandardMaterial({ color: 0x161329, roughness: 0.65 });

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), purple);
body.scale.y = 1.12;
body.position.y = 0.72;
body.castShadow = true;
player.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), white);
head.position.y = 1.65;
head.castShadow = true;
player.add(head);

const crown = new THREE.Mesh(
  new THREE.ConeGeometry(0.42, 0.58, 5),
  new THREE.MeshStandardMaterial({ color: 0xf0bb45, roughness: 0.42 })
);
crown.position.y = 2.28;
crown.rotation.y = Math.PI / 5;
player.add(crown);

[-0.18, 0.18].forEach((x) => {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
  eye.position.set(x, 1.76, 0.47);
  player.add(eye);
});

const cape = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 0.9, 0.08),
  new THREE.MeshStandardMaterial({ color: 0xd94e75, roughness: 0.48 })
);
cape.position.set(0, 0.8, -0.58);
cape.rotation.x = -0.18;
player.add(cape);

const spawn = new THREE.Vector3(0, 0.36, 2.8);
const velocity = new THREE.Vector3();
player.position.copy(spawn);

const controls = setupControls(renderer, THREE);
const questionEl = document.getElementById('question');
const hintEl = document.getElementById('hint');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');

let level = 1;
let mistakes = 0;
let currentQuestion = generateQuestion();
let grounded = true;
let jumpCount = 0;
let started = false;
let transitioning = false;
let failed = false;

function updateHud() {
  questionEl.textContent = `${currentQuestion.a} × ${currentQuestion.b} = ?`;
  statusEl.textContent = `第 ${level}/${TOTAL_LEVELS} 關｜錯誤 ${mistakes}`;
}

function showToast(message, type) {
  toastEl.textContent = message;
  toastEl.className = `${type} show`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toastEl.className = '';
  }, 900);
}

function resetPlayer() {
  player.position.copy(spawn);
  velocity.set(0, 0, 0);
  grounded = true;
  jumpCount = 0;
  failed = false;
}

function retryQuestion() {
  buildStage(currentQuestion);
  resetPlayer();
  hintEl.textContent = '再試一次：跳到正確答案平台。';
}

function nextLevel() {
  if (level >= TOTAL_LEVELS) {
    showVictory();
    return;
  }
  level += 1;
  currentQuestion = generateQuestion();
  buildStage(currentQuestion);
  resetPlayer();
  transitioning = false;
  updateHud();
  hintEl.textContent = '答對了！新一關開始。';
}

function showVictory() {
  transitioning = true;
  started = false;
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('card');
  card.innerHTML = `<h1>乘法王！</h1><p>你完成了 ${TOTAL_LEVELS} 關個位數乘法。<br>錯誤次數：${mistakes}</p><button id="restart">再玩一次</button>`;
  overlay.style.display = 'grid';
  document.getElementById('restart').onclick = () => location.reload();
}

function resolveAnswer(platform) {
  if (platform.resolved || transitioning || failed) return;
  platform.resolved = true;

  if (platform.correct) {
    transitioning = true;
    platform.material.color.set(0x49d987);
    platform.material.emissive.set(0x123c2a);
    platform.material.emissiveIntensity = 0.45;
    showToast('答對！下一關', 'correct');
    hintEl.textContent = `${platform.answer} 正確！`;
    velocity.set(0, 0, 0);
    setTimeout(nextLevel, 750);
  } else {
    mistakes += 1;
    updateHud();
    failed = true;
    platform.active = false;
    platform.falling = true;
    platform.material.color.set(0xd64555);
    platform.material.emissive.set(0x3b0810);
    platform.material.emissiveIntensity = 0.4;
    showToast('答錯！平台踩空', 'wrong');
    hintEl.textContent = `${platform.answer} 不正確，平台消失！`;
  }
}

function updateFallingPlatforms(dt) {
  platforms.forEach((platform) => {
    if (!platform.falling) return;
    platform.fallVelocity -= 18 * dt;
    platform.group.position.y += platform.fallVelocity * dt;
    platform.group.rotation.z += dt * 0.7;
    if (platform.group.position.y < -18) platform.group.visible = false;
  });
}

const clock = new THREE.Clock();
const desiredCamera = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const moveVector = new THREE.Vector3();

function updatePlayer(dt) {
  if (!started || transitioning) return;

  const keyboardX = (controls.keys.right ? 1 : 0) - (controls.keys.left ? 1 : 0);
  const keyboardY = (controls.keys.back ? 1 : 0) - (controls.keys.forward ? 1 : 0);
  let sx = Math.abs(controls.move.x) > 0.05 ? controls.move.x : keyboardX;
  let sy = Math.abs(controls.move.y) > 0.05 ? controls.move.y : keyboardY;
  let strength = Math.min(1, Math.hypot(sx, sy));

  if (failed) {
    sx = 0;
    sy = 0;
    strength = 0;
  } else if (strength > 0.01) {
    sx /= strength;
    sy /= strength;
  }

  const yaw = controls.camera.yaw;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  moveVector.set(rightX * sx + forwardX * (-sy), 0, rightZ * sx + forwardZ * (-sy));
  if (moveVector.lengthSq() > 1) moveVector.normalize();

  const accel = grounded ? 14 : 7;
  const maxSpeed = 5.2 * Math.max(0.38, strength);
  velocity.x += moveVector.x * accel * strength * dt;
  velocity.z += moveVector.z * accel * strength * dt;
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizontalSpeed > maxSpeed) {
    velocity.x *= maxSpeed / horizontalSpeed;
    velocity.z *= maxSpeed / horizontalSpeed;
  }

  const drag = grounded ? Math.pow(0.0015, dt) : Math.pow(0.2, dt);
  if (strength < 0.05) {
    velocity.x *= drag;
    velocity.z *= drag;
  }

  const wantsJump = controls.consumeJump();
  if (wantsJump && !failed && jumpCount < 2) {
    velocity.y = jumpCount === 0 ? 7.2 : 6.7;
    grounded = false;
    jumpCount += 1;
    if (jumpCount === 2) showToast('二段跳！', 'correct');
  }

  velocity.y -= 17.5 * dt;
  const previousY = player.position.y;
  player.position.addScaledVector(velocity, dt);
  grounded = false;

  if (!failed && velocity.y <= 0) {
    for (const platform of platforms) {
      if (!platform.active) continue;
      const top = platform.group.position.y + 0.35;
      const inside =
        Math.abs(player.position.x - platform.x) <= platform.width * 0.5 - 0.12 &&
        Math.abs(player.position.z - platform.z) <= platform.depth * 0.5 - 0.12;
      if (inside && previousY >= top - 0.15 && player.position.y <= top + 0.1) {
        player.position.y = top;
        velocity.y = 0;
        grounded = true;
        jumpCount = 0;
        if (platform.answer !== null) resolveAnswer(platform);
        break;
      }
    }
  }

  const moveSpeed = Math.hypot(velocity.x, velocity.z);
  if (moveSpeed > 0.12) player.rotation.y = Math.atan2(velocity.x, velocity.z);
  body.position.y = 0.72 + (grounded && moveSpeed > 0.2 ? Math.sin(performance.now() * 0.013) * 0.03 : 0);
  cape.rotation.x = -0.18 - Math.min(0.45, moveSpeed * 0.06) + Math.sin(performance.now() * 0.009) * 0.04;

  if (player.position.y < -9) {
    if (failed) retryQuestion();
    else {
      resetPlayer();
      hintEl.textContent = '跳失了，再試一次。';
    }
  }
}

function updateCamera(dt) {
  lookTarget.set(player.position.x, player.position.y + 1.15, player.position.z);
  const horizontal = Math.cos(controls.camera.pitch) * controls.camera.distance;
  desiredCamera.set(
    lookTarget.x + Math.sin(controls.camera.yaw) * horizontal,
    lookTarget.y + Math.sin(controls.camera.pitch) * controls.camera.distance,
    lookTarget.z + Math.cos(controls.camera.yaw) * horizontal
  );
  camera.position.lerp(desiredCamera, 1 - Math.pow(0.0015, dt));
  camera.lookAt(lookTarget);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  starField.rotation.y += dt * 0.006;
  updateFallingPlatforms(dt);
  updatePlayer(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}

currentQuestion = generateQuestion();
buildStage(currentQuestion);
updateHud();
resetPlayer();

document.getElementById('start').onclick = () => {
  started = true;
  document.getElementById('overlay').style.display = 'none';
};

animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});
