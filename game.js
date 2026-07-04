import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { setupControls } from './controls.js';

const errorBox = document.getElementById('error');
window.addEventListener('error', (e) => {
  errorBox.style.display = 'block';
  errorBox.textContent = `載入錯誤：\n${e.message}\n\n請重新整理頁面。`;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b2e);
scene.fog = new THREE.Fog(0x11113f, 24, 72);

const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 130);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa9c9ff, 0x24153f, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dc, 1.65);
sun.position.set(8, 15, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
scene.add(sun);

const fill = new THREE.PointLight(0x8075ff, 4.5, 24, 2);
fill.position.set(-7, 7, 4);
scene.add(fill);

const starPositions = [];
for (let i = 0; i < 600; i += 1) {
  const radius = 36 + Math.random() * 54;
  const angle = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 55;
  starPositions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}
const starFieldGeometry = new THREE.BufferGeometry();
starFieldGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starField = new THREE.Points(
  starFieldGeometry,
  new THREE.PointsMaterial({ color: 0xbfd5ff, size: 0.11, transparent: true, opacity: 0.72, depthWrite: false })
);
scene.add(starField);

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10,12,45,.82)';
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.lineWidth = 9;
  roundedRectPath(ctx, 18, 18, 476, 114, 30);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '900 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 75);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(4.6, 1.35, 1);
  return sprite;
}

const platforms = [];
function addPlatform(x, y, z, width, depth, color, label) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.04,
    emissive: new THREE.Color(color).multiplyScalar(0.035),
    emissiveIntensity: 0.25
  });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, 0.68, depth, 5, 0.18), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45),
      transparent: true,
      opacity: 0.48
    })
  );
  mesh.add(rim);

  const tag = makeLabel(label, color);
  tag.position.set(x, y + 1.75, z);
  scene.add(tag);
  platforms.push({ x, y, z, width, depth, top: y + 0.34 });
}

addPlatform(0, 0, 0, 5.8, 4.8, 0x6d72d9, '起點');
addPlatform(-3.2, 1.15, -4.1, 4.2, 3.2, 0xd8a642, '月光');
addPlatform(0.8, 2.25, -7.1, 4.1, 3.2, 0xd75fa8, '花島');
addPlatform(4.8, 3.35, -4.2, 4.1, 3.2, 0x4ebbd6, '雲台');
addPlatform(6, 4.45, 0.5, 4.2, 3.2, 0x866bd9, '星橋');
addPlatform(2.1, 5.55, 4.3, 4.5, 3.4, 0x55c792, '終點');

const player = new THREE.Group();
scene.add(player);
const white = new THREE.MeshStandardMaterial({ color: 0xf1f0ff, roughness: 0.5 });
const lilac = new THREE.MeshStandardMaterial({ color: 0x9b8ddd, roughness: 0.48, emissive: 0x160f35, emissiveIntensity: 0.12 });
const dark = new THREE.MeshStandardMaterial({ color: 0x17132b, roughness: 0.6 });

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), lilac);
body.scale.y = 1.12;
body.position.y = 0.72;
body.castShadow = true;
player.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), white);
head.position.y = 1.65;
head.castShadow = true;
player.add(head);

const cap = new THREE.Mesh(
  new THREE.ConeGeometry(0.37, 0.58, 18),
  new THREE.MeshStandardMaterial({ color: 0xe8b84d, roughness: 0.48 })
);
cap.position.y = 2.24;
cap.rotation.z = -0.12;
player.add(cap);

const pom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), white);
pom.position.set(-0.05, 2.54, 0);
player.add(pom);

[-0.18, 0.18].forEach((x) => {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
  eye.position.set(x, 1.76, 0.47);
  player.add(eye);
});

const scarf = new THREE.Mesh(
  new THREE.TorusGeometry(0.43, 0.08, 10, 28),
  new THREE.MeshStandardMaterial({ color: 0xd9558f, roughness: 0.45 })
);
scarf.rotation.x = Math.PI / 2;
scarf.position.y = 1.3;
player.add(scarf);

const tail = new THREE.Group();
for (let i = 0; i < 5; i += 1) {
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13 - i * 0.012, 12, 9), i % 2 ? white : lilac);
  orb.position.set(0, i * 0.22, 0);
  tail.add(orb);
}
tail.position.set(0.56, 0.88, -0.2);
tail.rotation.z = -1.03;
player.add(tail);

const spawn = new THREE.Vector3(0, 0.35, 0);
const velocity = new THREE.Vector3();
player.position.copy(spawn);
let grounded = true;
let started = false;
let won = false;
let collected = 0;

const scoreEl = document.getElementById('score');
const hintEl = document.getElementById('hint');

const starShape = new THREE.Shape();
for (let i = 0; i < 10; i += 1) {
  const angle = -Math.PI / 2 + i * Math.PI / 5;
  const radius = i % 2 === 0 ? 0.42 : 0.2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  if (i === 0) starShape.moveTo(x, y);
  else starShape.lineTo(x, y);
}
starShape.closePath();
const pickupGeometry = new THREE.ExtrudeGeometry(starShape, {
  depth: 0.14,
  bevelEnabled: true,
  bevelSize: 0.05,
  bevelThickness: 0.05,
  bevelSegments: 2
});
pickupGeometry.center();

const pickupData = [
  [-3.2, 2.25, -4.1],
  [0.8, 3.35, -7.1],
  [4.8, 4.45, -4.2],
  [6, 5.55, 0.5],
  [2.1, 6.65, 4.3]
];
const pickups = pickupData.map(([x, y, z]) => {
  const mesh = new THREE.Mesh(
    pickupGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.3, metalness: 0.1, emissive: 0x6f3d00, emissiveIntensity: 0.35 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return { mesh, baseY: y, collected: false };
});

const portal = new THREE.Group();
portal.position.set(2.1, 6.65, 4.3);
scene.add(portal);
const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.28, metalness: 0.45, emissive: 0x0d1220, emissiveIntensity: 0.1 });
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.11, 14, 48), ringMaterial);
portal.add(ring);
const core = new THREE.Mesh(
  new THREE.CircleGeometry(0.76, 40),
  new THREE.MeshBasicMaterial({ color: 0x55d9aa, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false })
);
core.position.z = -0.02;
portal.add(core);

const controls = setupControls(renderer, THREE);

document.getElementById('start').onclick = () => {
  started = true;
  document.getElementById('overlay').style.display = 'none';
};

function resetPlayer() {
  player.position.copy(spawn);
  velocity.set(0, 0, 0);
  grounded = true;
  hintEl.textContent = '掉下去了，已回到起點。';
  setTimeout(() => {
    if (!won) hintEl.textContent = '左邊搖桿移動，右邊畫面拖動視角。';
  }, 1300);
}

function showWin() {
  won = true;
  started = false;
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('card');
  card.innerHTML = '<h1>成功過關！</h1><p>Joystick 移動與 360° 自由視角已正常運作。</p><button id="restart">再玩一次</button>';
  overlay.style.display = 'grid';
  document.getElementById('restart').onclick = () => location.reload();
}

const clock = new THREE.Clock();
const desiredCamera = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const moveVector = new THREE.Vector3();

function updatePlayer(dt) {
  if (!started || won) return;

  const keyboardX = (controls.keys.right ? 1 : 0) - (controls.keys.left ? 1 : 0);
  const keyboardY = (controls.keys.back ? 1 : 0) - (controls.keys.forward ? 1 : 0);
  let sx = Math.abs(controls.move.x) > 0.05 ? controls.move.x : keyboardX;
  let sy = Math.abs(controls.move.y) > 0.05 ? controls.move.y : keyboardY;
  const strength = Math.min(1, Math.hypot(sx, sy));
  if (strength > 0.01) {
    sx /= strength;
    sy /= strength;
  }

  const yaw = controls.camera.yaw;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  moveVector.set(
    rightX * sx + forwardX * (-sy),
    0,
    rightZ * sx + forwardZ * (-sy)
  );
  if (moveVector.lengthSq() > 1) moveVector.normalize();

  const accel = grounded ? 13 : 6.5;
  const maxSpeed = 4.7 * Math.max(0.35, strength);
  velocity.x += moveVector.x * accel * strength * dt;
  velocity.z += moveVector.z * accel * strength * dt;
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed > maxSpeed) {
    velocity.x *= maxSpeed / speed;
    velocity.z *= maxSpeed / speed;
  }

  const drag = grounded ? Math.pow(0.002, dt) : Math.pow(0.22, dt);
  if (strength < 0.05) {
    velocity.x *= drag;
    velocity.z *= drag;
  }

  if (controls.consumeJump() && grounded) {
    velocity.y = 7.1;
    grounded = false;
  }

  velocity.y -= 17 * dt;
  const previousY = player.position.y;
  player.position.addScaledVector(velocity, dt);
  grounded = false;

  if (velocity.y <= 0) {
    for (const p of platforms) {
      const inside =
        Math.abs(player.position.x - p.x) <= p.width * 0.5 - 0.15 &&
        Math.abs(player.position.z - p.z) <= p.depth * 0.5 - 0.15;
      if (inside && previousY >= p.top - 0.12 && player.position.y <= p.top + 0.09) {
        player.position.y = p.top;
        velocity.y = 0;
        grounded = true;
        break;
      }
    }
  }

  const moveSpeed = Math.hypot(velocity.x, velocity.z);
  if (moveSpeed > 0.12) player.rotation.y = Math.atan2(velocity.x, velocity.z);
  body.position.y = 0.72 + (grounded && moveSpeed > 0.2 ? Math.sin(performance.now() * 0.012) * 0.03 : 0);
  tail.rotation.x = Math.sin(performance.now() * 0.006) * 0.22;
  if (player.position.y < -10) resetPlayer();

  pickups.forEach((item, i) => {
    if (item.collected) return;
    item.mesh.rotation.y += dt * 1.8;
    item.mesh.position.y = item.baseY + Math.sin(performance.now() * 0.002 + i) * 0.12;
    const dx = player.position.x - item.mesh.position.x;
    const dy = player.position.y + 1 - item.mesh.position.y;
    const dz = player.position.z - item.mesh.position.z;
    if (dx * dx + dy * dy + dz * dz < 1.33) {
      item.collected = true;
      item.mesh.visible = false;
      collected += 1;
      scoreEl.textContent = `⭐ ${collected} / 5`;
      hintEl.textContent = collected === 5 ? '終點已啟動！走進綠色光圈。' : `已收集 ${collected} 顆星星。`;
      if (collected === 5) {
        ringMaterial.color.set(0x55c792);
        ringMaterial.emissive.set(0x123c2b);
        ringMaterial.emissiveIntensity = 0.45;
        core.material.opacity = 0.34;
      }
    }
  });

  portal.rotation.y += dt * 0.55;
  if (collected === 5) {
    const dx = player.position.x - portal.position.x;
    const dy = player.position.y + 1 - portal.position.y;
    const dz = player.position.z - portal.position.z;
    if (dx * dx + dy * dy + dz * dz < 1.82) showWin();
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
  updatePlayer(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});
