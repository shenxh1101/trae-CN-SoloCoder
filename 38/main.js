import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- 基础场景 ----------
const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 5000
);
camera.position.set(0, 45, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 18;
controls.maxDistance = 420;
controls.autoRotateSpeed = 0.45;

// ---------- 光照 ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xffd08a, 3.0, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const dirLight = new THREE.DirectionalLight(0xfff0c0, 0.35);
dirLight.position.set(60, 80, 40);
scene.add(dirLight);

// ---------- 程序化贴图 ----------
function makeEarthTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, c.height);
  grd.addColorStop(0, '#0a2a55');
  grd.addColorStop(0.5, '#135fa0');
  grd.addColorStop(1, '#0a2a55');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalAlpha = 0.95;
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * c.width;
    const cy = Math.random() * c.height;
    const rw = 60 + Math.random() * 140;
    const rh = 40 + Math.random() * 90;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
    const tone = Math.random();
    const col = tone > 0.55 ? '#2d7a3a' : (tone > 0.25 ? '#4f9b54' : '#95c76b');
    ctx.fillStyle = col;
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#7ab85a';
    for (let j = 0; j < 6; j++) {
      const rx = cx + (Math.random() - 0.5) * rw;
      const ry = cy + (Math.random() - 0.5) * rh;
      ctx.beginPath();
      ctx.arc(rx, ry, 6 + Math.random() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.95;
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(0, 0, c.width, 18);
  ctx.fillRect(0, c.height - 18, c.width, 18);
  ctx.globalAlpha = 0.5;
  const polarGr = ctx.createLinearGradient(0, 0, 0, 40);
  polarGr.addColorStop(0, 'rgba(255,255,255,0.9)');
  polarGr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = polarGr;
  ctx.fillRect(0, 0, c.width, 40);
  const polarGr2 = ctx.createLinearGradient(0, c.height - 40, 0, c.height);
  polarGr2.addColorStop(0, 'rgba(255,255,255,0)');
  polarGr2.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = polarGr2;
  ctx.fillRect(0, c.height - 40, c.width, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeMarsTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, c.height);
  grd.addColorStop(0, '#8a2d12');
  grd.addColorStop(0.5, '#b03e1a');
  grd.addColorStop(1, '#8a2d12');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const rw = 8 + Math.random() * 40;
    const rh = 6 + Math.random() * 30;
    const angle = Math.random() * Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, angle, 0, Math.PI * 2);
    const tone = Math.random();
    const col = tone > 0.6 ? '#5a1808' : (tone > 0.3 ? '#c84a20' : '#e27a44');
    ctx.fillStyle = col;
    ctx.fill();
  }
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = Math.random();
    const col = r > 0.65 ? '#4a0f04' : (r > 0.35 ? '#9c3312' : '#d65a2a');
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.25 + Math.random() * 0.55;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = 10 + Math.random() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(50,12,4,0.65)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#f0d0a8';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeSunTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#fff7c2');
  g.addColorStop(0.4, '#ffd07a');
  g.addColorStop(0.8, '#ff8a2b');
  g.addColorStop(1, '#b04a00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? '#ff5a1a' : '#ffe0a0';
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// ---------- 太阳 ----------
const sunGroup = new THREE.Group();
scene.add(sunGroup);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(8, 64, 64),
  new THREE.MeshBasicMaterial({ map: makeSunTexture() })
);
sunMesh.userData = {
  planetInfo: {
    info: { name: '太阳 (Sun)', orbitPeriod: '—', distanceAU: '0.00 AU', type: 'star' }
  }
};
sunGroup.add(sunMesh);

// 日冕光晕（半透明发光球）
const corona = new THREE.Mesh(
  new THREE.SphereGeometry(10.5, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0xffaa55,
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
sunGroup.add(corona);

const corona2 = new THREE.Mesh(
  new THREE.SphereGeometry(14, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0xff7a22,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
sunGroup.add(corona2);

// 太阳光晕 Sprite（使用内置 Canvas 生成的径向贴图）
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,220,160,1)');
  g.addColorStop(0.3, 'rgba(255,170,90,0.6)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  color: 0xffbb55,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
}));
glow.scale.set(38, 38, 1);
sunGroup.add(glow);

// ---------- 轨道环（近亮远暗渐变） ----------
function createOrbitRing(radius) {
  const segments = 256;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * 3);
  const colors = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    positions[i * 3]     = Math.cos(t) * radius;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(t) * radius;
    colors[i * 3]     = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  const line = new THREE.LineLoop(geometry, material);
  line.userData = { radius, segments };
  return line;
}

const _tmpColor = new THREE.Color();
const _tmpVec3 = new THREE.Vector3();
const _viewDir = new THREE.Vector3();
const _camPos = new THREE.Vector3();
function updateOrbitColors(ring, camera) {
  const { radius, segments } = ring.userData;
  const colors = ring.geometry.attributes.color.array;
  const pos = ring.geometry.attributes.position.array;
  const colorNear = new THREE.Color(0xffffff);
  const colorFar = new THREE.Color(0x222244);
  camera.getWorldPosition(_camPos);
  _viewDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const sunFactor = 1.0 - Math.min(radius / 55, 1.0);
  for (let i = 0; i <= segments; i++) {
    const px = pos[i * 3];
    const pz = pos[i * 3 + 2];
    _tmpVec3.set(px, 0, pz).sub(_camPos).normalize();
    const dot = _tmpVec3.dot(_viewDir);
    let alpha = (dot + 1) / 2;
    alpha = alpha * 0.7 + sunFactor * 0.3;
    _tmpColor.copy(colorNear).lerp(colorFar, 1.0 - alpha);
    colors[i * 3]     = _tmpColor.r;
    colors[i * 3 + 1] = _tmpColor.g;
    colors[i * 3 + 2] = _tmpColor.b;
  }
  ring.geometry.attributes.color.needsUpdate = true;
}

// ---------- 行星 ----------
const planetData = [
  {
    name: '地球',
    radius: 1.6,
    orbitRadius: 28,
    orbitPeriod: 12,
    material: new THREE.MeshStandardMaterial({
      map: makeEarthTexture(),
      roughness: 0.85,
      metalness: 0.05
    }),
    rotationSpeed: 0.8,
    info: { name: '地球 (Earth)', orbitPeriod: '12 秒/圈', distanceAU: '1.00 AU' }
  },
  {
    name: '火星',
    radius: 1.1,
    orbitRadius: 42,
    orbitPeriod: 18,
    material: new THREE.MeshStandardMaterial({
      map: makeMarsTexture(),
      roughness: 1.0,
      metalness: 0.0
    }),
    rotationSpeed: 0.6,
    info: { name: '火星 (Mars)', orbitPeriod: '18 秒/圈', distanceAU: '1.52 AU' }
  }
];

const planets = [];
const orbitRings = [];
planetData.forEach((p) => {
  const orbit = createOrbitRing(p.orbitRadius);
  scene.add(orbit);
  orbitRings.push(orbit);

  const pivot = new THREE.Object3D();
  scene.add(pivot);

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 48, 48), p.material);
  mesh.position.set(p.orbitRadius, 0, 0);
  mesh.userData = { planetInfo: p };
  pivot.add(mesh);

  planets.push({ data: p, pivot, mesh, orbit });
});

// ---------- 星空 ----------
function createStarfield(count = 4000, radius = 1500) {
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.85 + Math.random() * 0.15);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const b = 0.6 + Math.random() * 0.4;
    col[i * 3]     = b;
    col[i * 3 + 1] = b;
    col[i * 3 + 2] = b * (0.9 + Math.random() * 0.2);
  }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.4,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  return new THREE.Points(geom, mat);
}
scene.add(createStarfield());

// ---------- 文字标签（始终面向相机） ----------
function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = 'bold 42px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(12, 3, 1);
  return sprite;
}

const sunLabel = makeLabel('太阳  0.00 AU');
sunLabel.position.set(0, 12, 0);
sunGroup.add(sunLabel);

planets.forEach(({ data, mesh }) => {
  const label = makeLabel(`${data.name}  ${data.info.distanceAU}`);
  label.position.set(0, data.radius + 2.2, 0);
  mesh.add(label);
});

// ---------- UI 控制 ----------
const state = {
  playing: true,
  speed: 1.0,
  autoRotate: false,
  selected: null
};

const btnToggle = document.getElementById('btnToggle');
btnToggle.addEventListener('click', () => {
  state.playing = !state.playing;
  btnToggle.textContent = state.playing ? '暂停' : '播放';
  btnToggle.classList.toggle('pause', !state.playing);
});

const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
speedInput.addEventListener('input', () => {
  state.speed = parseFloat(speedInput.value);
  speedVal.textContent = state.speed.toFixed(1) + 'x';
});

const autoRotateInput = document.getElementById('autoRotate');
autoRotateInput.addEventListener('change', () => {
  state.autoRotate = autoRotateInput.checked;
  controls.autoRotate = state.autoRotate;
  controls.autoRotateSpeed = 0.45;
});

// 初始化 UI 状态
speedInput.value = state.speed;
speedVal.textContent = state.speed.toFixed(1) + 'x';
autoRotateInput.checked = state.autoRotate;
controls.autoRotate = state.autoRotate;

// ---------- 点击拾取 ----------
const infoEl = document.getElementById('info');
const infoTitle = document.getElementById('infoName');
const infoName = document.getElementById('infoPlanetName');
const infoOrbit = document.getElementById('infoOrbitPeriod');
const infoDist = document.getElementById('infoDistance');
const infoClose = document.getElementById('infoClose');
infoClose.addEventListener('click', () => { infoEl.style.display = 'none'; });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownX = 0, pointerDownY = 0;

function onPointerDown(e) {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
}
function onPointerUp(e) {
  const dx = Math.abs(e.clientX - pointerDownX);
  const dy = Math.abs(e.clientY - pointerDownY);
  if (dx > 4 || dy > 4) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = planets.map(p => p.mesh).concat([sunMesh]);
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj === sunMesh) {
      const info = {
        name: '太阳 (Sun)',
        type: '恒星',
        orbitPeriod: '—',
        distanceAU: '0.00 AU'
      };
      console.log('[点击] 太阳 (Sun) —— 太阳系中心恒星 | 类型: 恒星 | 距太阳: 0.00 AU');
      infoTitle.textContent = '恒星信息';
      infoName.textContent = info.name;
      infoOrbit.textContent = info.orbitPeriod;
      infoDist.textContent = info.distanceAU;
      infoEl.style.display = 'block';
      infoEl.style.borderColor = 'rgba(255, 180, 80, 0.6)';
      infoTitle.style.color = '#ffb347';
    } else {
      const data = obj.userData.planetInfo;
      const info = data.info;
      console.log(`[点击] ${info.name} | 类型: 行星 | 公转周期: ${info.orbitPeriod} | 距太阳: ${info.distanceAU}`);
      infoTitle.textContent = '行星信息';
      infoName.textContent = info.name;
      infoOrbit.textContent = info.orbitPeriod;
      infoDist.textContent = info.distanceAU;
      infoEl.style.display = 'block';
      infoEl.style.borderColor = 'rgba(120, 180, 255, 0.5)';
      infoTitle.style.color = '#8fb8ff';
    }
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);

// ---------- 动画循环 ----------
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  if (state.playing) {
    const factor = state.speed * dt;
    sunMesh.rotation.y += 0.25 * factor;
    corona.rotation.y += 0.15 * factor;
    corona2.rotation.y -= 0.1 * factor;

    planets.forEach(({ data, pivot, mesh }) => {
      const omega = (Math.PI * 2) / data.orbitPeriod;
      pivot.rotation.y += omega * factor;
      mesh.rotation.y += data.rotationSpeed * factor;
    });
  }

  // 更新轨道渐变（靠近太阳/相机方向更亮）
  orbitRings.forEach(ring => updateOrbitColors(ring, camera));

  // 光晕脉动
  const pulse = 1 + Math.sin(t * 1.5) * 0.04;
  corona.scale.setScalar(pulse);
  corona2.scale.setScalar(pulse * 1.03);
  glow.material.opacity = 0.9 + Math.sin(t * 2) * 0.1;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---------- 响应式 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
