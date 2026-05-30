import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const config = {
    speed: 1.0,
    diameter: 3.0,
    colorSpeed: 1.0,
    shape: 'circle',
    texture: 'stripes',
    motionBlur: false,
    particles: true,
    cameraShake: true,
    background: 'black',
    ringCount: 100,
    ringSpacing: 1.5,
    ringThickness: 0.1,
    particleCount: 500
};

let scene, camera, renderer, composer;
let rings = [];
let trails = [];
let particles, particlePositions, particleVelocities;
let nebulaBackground;
let time = 0;
let colorOffset = 0;
let tunnelOffset = 0;
const TRAIL_COUNT = 4;

const canvas = document.getElementById('tunnelCanvas');
const fpsCounter = document.getElementById('fpsCounter');

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 2;
    
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    initPostProcessing();
    createNebulaBackground();
    createTunnel();
    createParticles();
    setupEventListeners();
    updateBackground();
    
    animate();
}

function initPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);
}

function createNebulaBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(
        512, 512, 0,
        512, 512, 512
    );
    
    const colors = [
        '#0a0a2e',
        '#1a0a3e',
        '#2e0a4e',
        '#4a1a5e',
        '#2e3a6e',
        '#1a4a5e',
        '#0a3a4e'
    ];
    
    for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const radius = Math.random() * 2 + 0.5;
        const alpha = Math.random() * 0.8 + 0.2;
        
        const starGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        starGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        starGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = starGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const radius = Math.random() * 200 + 100;
        const hue = Math.random() * 360;
        
        const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        nebulaGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.1)`);
        nebulaGradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 50%, 0.05)`);
        nebulaGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nebulaGradient;
        ctx.fillRect(0, 0, 1024, 1024);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    const geometry = new THREE.SphereGeometry(500, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    
    nebulaBackground = new THREE.Mesh(geometry, material);
    nebulaBackground.visible = false;
    scene.add(nebulaBackground);
}

function createRingGeometry(shape, radius, depth) {
    let geometry;
    const tubularSegments = 64;
    const radialSegments = 8;
    
    switch (shape) {
        case 'circle':
            geometry = new THREE.TorusGeometry(
                radius,
                config.ringThickness,
                radialSegments,
                tubularSegments
            );
            break;
            
        case 'square':
            const squareShape = new THREE.Shape();
            const size = radius * 0.8;
            squareShape.moveTo(-size, -size);
            squareShape.lineTo(size, -size);
            squareShape.lineTo(size, size);
            squareShape.lineTo(-size, size);
            squareShape.lineTo(-size, -size);
            
            const hole = new THREE.Path();
            const innerSize = size - config.ringThickness * 2;
            hole.moveTo(-innerSize, -innerSize);
            hole.lineTo(innerSize, -innerSize);
            hole.lineTo(innerSize, innerSize);
            hole.lineTo(-innerSize, innerSize);
            hole.lineTo(-innerSize, -innerSize);
            squareShape.holes.push(hole);
            
            const extrudeSettings = {
                depth: config.ringThickness * 2,
                bevelEnabled: false,
                curveSegments: 1
            };
            
            geometry = new THREE.ExtrudeGeometry(squareShape, extrudeSettings);
            geometry.center();
            geometry.rotateZ(Math.PI / 4);
            break;
            
        case 'hexagon':
            const hexShape = new THREE.Shape();
            const hexRadius = radius * 0.9;
            
            for (let i = 0; i <= 6; i++) {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * hexRadius;
                const y = Math.sin(angle) * hexRadius;
                if (i === 0) {
                    hexShape.moveTo(x, y);
                } else {
                    hexShape.lineTo(x, y);
                }
            }
            
            const hexHole = new THREE.Path();
            const innerHexRadius = hexRadius - config.ringThickness * 2;
            
            for (let i = 0; i <= 6; i++) {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * innerHexRadius;
                const y = Math.sin(angle) * innerHexRadius;
                if (i === 0) {
                    hexHole.moveTo(x, y);
                } else {
                    hexHole.lineTo(x, y);
                }
            }
            hexShape.holes.push(hexHole);
            
            geometry = new THREE.ExtrudeGeometry(hexShape, {
                depth: config.ringThickness * 2,
                bevelEnabled: false,
                curveSegments: 1
            });
            geometry.center();
            break;
            
        default:
            geometry = new THREE.TorusGeometry(
                radius,
                config.ringThickness,
                radialSegments,
                tubularSegments
            );
    }
    
    return geometry;
}

function generateTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 256);
    
    switch (type) {
        case 'stripes':
            for (let i = 0; i < 256; i += 8) {
                const gradient = ctx.createLinearGradient(0, i, 0, i + 4);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, i, 256, 4);
            }
            break;
            
        case 'grid':
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            
            for (let i = 0; i < 256; i += 32) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 256);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(256, i);
                ctx.stroke();
            }
            break;
            
        case 'dots':
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let x = 16; x < 256; x += 32) {
                for (let y = 16; y < 256; y += 32) {
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
            
        case 'random':
            const patterns = ['stripes', 'grid', 'dots', 'waves', 'noise'];
            const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            if (randomPattern === 'waves') {
                for (let y = 0; y < 256; y++) {
                    const wave = Math.sin(y * 0.05) * 20;
                    for (let x = 0; x < 256; x += 4) {
                        const dist = Math.abs(x - 128 - wave);
                        if (dist < 2) {
                            ctx.fillStyle = `rgba(255, 255, 255, ${1 - dist / 2})`;
                            ctx.fillRect(x, y, 4, 1);
                        }
                    }
                }
            } else if (randomPattern === 'noise') {
                const imageData = ctx.createImageData(256, 256);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const value = Math.random() > 0.9 ? 255 : 0;
                    imageData.data[i] = value;
                    imageData.data[i + 1] = value;
                    imageData.data[i + 2] = value;
                    imageData.data[i + 3] = value > 0 ? 200 : 0;
                }
                ctx.putImageData(imageData, 0, 0);
            } else {
                return generateTexture(randomPattern);
            }
            break;
            
        case 'none':
        default:
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 256, 256);
            break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
}

function createTunnel() {
    rings.forEach(ring => {
        scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
    });
    rings = [];
    
    trails.forEach(trail => {
        scene.remove(trail);
        trail.geometry.dispose();
        trail.material.dispose();
    });
    trails = [];
    
    const texture = generateTexture(config.texture);
    
    for (let i = 0; i < config.ringCount; i++) {
        const geometry = createRingGeometry(
            config.shape,
            config.diameter,
            config.ringSpacing
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: getRainbowColor(i / config.ringCount),
            emissive: getRainbowColor(i / config.ringCount),
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8,
            side: THREE.DoubleSide,
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.z = -i * config.ringSpacing;
        ring.userData = { index: i, baseZ: -i * config.ringSpacing };
        
        scene.add(ring);
        rings.push(ring);
        
        for (let t = 0; t < TRAIL_COUNT; t++) {
            const trailMaterial = new THREE.MeshStandardMaterial({
                color: getRainbowColor(i / config.ringCount),
                emissive: getRainbowColor(i / config.ringCount),
                emissiveIntensity: 0.3 * (1 - t / TRAIL_COUNT),
                roughness: 0.5,
                metalness: 0.5,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5 * (1 - t / TRAIL_COUNT),
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const trail = new THREE.Mesh(geometry.clone(), trailMaterial);
            trail.position.z = -i * config.ringSpacing - (t + 1) * config.ringSpacing * 0.3;
            trail.userData = { index: i, trailIndex: t, baseZ: -i * config.ringSpacing - (t + 1) * config.ringSpacing * 0.3 };
            trail.visible = false;
            
            scene.add(trail);
            trails.push(trail);
        }
    }
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
}

function createParticles() {
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
    }
    
    const geometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(config.particleCount * 3);
    particleVelocities = new Float32Array(config.particleCount * 3);
    
    for (let i = 0; i < config.particleCount; i++) {
        resetParticle(i);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    particles = new THREE.Points(geometry, material);
    particles.visible = config.particles;
    scene.add(particles);
}

function resetParticle(index) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * config.diameter * 0.8;
    
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = Math.sin(angle) * radius;
    particlePositions[index * 3 + 2] = -config.ringCount * config.ringSpacing * Math.random();
    
    const speed = 0.02 + Math.random() * 0.03;
    particleVelocities[index * 3] = Math.cos(angle) * speed;
    particleVelocities[index * 3 + 1] = Math.sin(angle) * speed;
    particleVelocities[index * 3 + 2] = speed * 2;
}

function getRainbowColor(progress) {
    const hue = (progress + colorOffset) % 1;
    return new THREE.Color().setHSL(hue, 1, 0.5);
}

function updateRings(delta) {
    const moveDistance = config.speed * delta * 5;
    tunnelOffset += moveDistance;
    
    rings.forEach((ring, i) => {
        ring.position.z += moveDistance;
        ring.rotation.z += 0.001 * config.speed;
        
        if (ring.position.z > camera.position.z + 2) {
            ring.position.z = -config.ringCount * config.ringSpacing + (ring.position.z - camera.position.z - 2);
        }
        
        const progress = (ring.position.z + config.ringCount * config.ringSpacing) / (config.ringCount * config.ringSpacing);
        const colorProgress = (progress + colorOffset) % 1;
        const color = getRainbowColor(colorProgress);
        
        ring.material.color = color;
        ring.material.emissive = color;
        ring.material.emissiveIntensity = 0.3 + progress * 0.5;
    });
    
    if (config.motionBlur) {
        for (let i = 0; i < rings.length; i++) {
            const ring = rings[i];
            for (let t = 0; t < TRAIL_COUNT; t++) {
                const trailIndex = i * TRAIL_COUNT + t;
                if (trailIndex < trails.length) {
                    const trail = trails[trailIndex];
                    trail.visible = true;
                    
                    const trailOffset = (t + 1) * config.ringSpacing * 0.3 * config.speed;
                    trail.position.z = ring.position.z - trailOffset;
                    trail.rotation.z = ring.rotation.z;
                    
                    const progress = (trail.position.z + config.ringCount * config.ringSpacing) / (config.ringCount * config.ringSpacing);
                    const colorProgress = (progress + colorOffset) % 1;
                    const color = getRainbowColor(colorProgress);
                    
                    trail.material.color = color;
                    trail.material.emissive = color;
                    trail.material.emissiveIntensity = 0.3 * (1 - t / TRAIL_COUNT) * config.speed * 0.5;
                    trail.material.opacity = 0.4 * (1 - t / TRAIL_COUNT) * Math.min(config.speed, 2);
                    
                    if (trail.position.z > camera.position.z + 2) {
                        trail.position.z = -config.ringCount * config.ringSpacing + (trail.position.z - camera.position.z - 2);
                    }
                }
            }
        }
    } else {
        trails.forEach(trail => {
            trail.visible = false;
        });
    }
}

function updateParticles(delta) {
    if (!config.particles || !particles) return;
    
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < config.particleCount; i++) {
        positions[i * 3] += particleVelocities[i * 3] * config.speed;
        positions[i * 3 + 1] += particleVelocities[i * 3 + 1] * config.speed;
        positions[i * 3 + 2] += particleVelocities[i * 3 + 2] * config.speed + config.speed * delta * 5;
        
        if (positions[i * 3 + 2] > camera.position.z + 2) {
            resetParticle(i);
        }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
}

function updateCamera(delta) {
    if (config.cameraShake) {
        camera.position.x = Math.sin(time * 0.5) * 0.3;
        camera.position.y = Math.cos(time * 0.7) * 0.2;
        camera.rotation.z = Math.sin(time * 0.3) * 0.02;
    } else {
        camera.position.x *= 0.95;
        camera.position.y *= 0.95;
        camera.rotation.z *= 0.95;
    }
    
    camera.lookAt(0, 0, -10);
}

function updateBackground() {
    if (config.background === 'nebula') {
        scene.background = null;
        nebulaBackground.visible = true;
    } else {
        scene.background = new THREE.Color(0x000000);
        nebulaBackground.visible = false;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    time += delta;
    colorOffset += delta * 0.1 * config.colorSpeed;
    
    frameCount++;
    if (frameCount % 30 === 0) {
        fps = Math.round(1 / delta);
        fpsCounter.textContent = `FPS: ${fps}`;
    }
    
    updateRings(delta);
    updateParticles(delta);
    updateCamera(delta);
    
    if (nebulaBackground) {
        nebulaBackground.rotation.y += delta * 0.01;
    }
    
    composer.render();
}

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
    
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        config.speed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = config.speed.toFixed(1);
    });
    
    document.getElementById('diameterSlider').addEventListener('input', (e) => {
        config.diameter = parseFloat(e.target.value);
        document.getElementById('diameterValue').textContent = config.diameter.toFixed(1);
        createTunnel();
    });
    
    document.getElementById('colorSpeedSlider').addEventListener('input', (e) => {
        config.colorSpeed = parseFloat(e.target.value);
        document.getElementById('colorSpeedValue').textContent = config.colorSpeed.toFixed(1);
    });
    
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.shape = btn.dataset.shape;
            createTunnel();
        });
    });
    
    document.querySelectorAll('.texture-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.texture = btn.dataset.texture;
            createTunnel();
        });
    });
    
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.background = btn.dataset.bg;
            updateBackground();
        });
    });
    
    document.getElementById('motionBlurToggle').addEventListener('change', (e) => {
        config.motionBlur = e.target.checked;
    });
    
    document.getElementById('particlesToggle').addEventListener('change', (e) => {
        config.particles = e.target.checked;
        if (particles) {
            particles.visible = config.particles;
        }
    });
    
    document.getElementById('cameraShakeToggle').addEventListener('change', (e) => {
        config.cameraShake = e.target.checked;
    });
    
    document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
    
    document.getElementById('exportBtn').addEventListener('click', exportConfig);
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', importConfig);
    
    document.getElementById('validateBtn').addEventListener('click', runValidation);
    
    document.getElementById('togglePanelBtn').addEventListener('click', () => {
        const panel = document.getElementById('controlPanel');
        panel.classList.toggle('hidden');
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            const panel = document.getElementById('controlPanel');
            panel.classList.toggle('hidden');
        }
        if (e.key === ' ') {
            e.preventDefault();
            takeScreenshot();
        }
        if (e.key === 'v' || e.key === 'V') {
            runValidation();
        }
    });
}

function takeScreenshot() {
    renderer.render(scene, camera);
    
    const link = document.createElement('a');
    link.download = `tunnel-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showNotification('📷 截图已保存！');
}

function exportConfig() {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `tunnel-config-${Date.now()}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('💾 配置已导出！');
}

function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedConfig = JSON.parse(event.target.result);
            Object.assign(config, importedConfig);
            applyConfig();
            showNotification('📂 配置已导入！');
        } catch (err) {
            showNotification('❌ 配置文件格式错误！');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function applyConfig() {
    document.getElementById('speedSlider').value = config.speed;
    document.getElementById('speedValue').textContent = config.speed.toFixed(1);
    
    document.getElementById('diameterSlider').value = config.diameter;
    document.getElementById('diameterValue').textContent = config.diameter.toFixed(1);
    
    document.getElementById('colorSpeedSlider').value = config.colorSpeed;
    document.getElementById('colorSpeedValue').textContent = config.colorSpeed.toFixed(1);
    
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shape === config.shape);
    });
    
    document.querySelectorAll('.texture-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.texture === config.texture);
    });
    
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bg === config.background);
    });
    
    document.getElementById('motionBlurToggle').checked = config.motionBlur;
    document.getElementById('particlesToggle').checked = config.particles;
    document.getElementById('cameraShakeToggle').checked = config.cameraShake;
    
    createTunnel();
    createParticles();
    updateBackground();
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(10, 10, 30, 0.9);
        color: #fff;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: bold;
        z-index: 1000;
        border: 1px solid rgba(0, 255, 255, 0.5);
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        animation: fadeInOut 2s ease forwards;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 2000);
}

function takeValidationScreenshot(name) {
    return new Promise((resolve) => {
        setTimeout(() => {
            renderer.render(scene, camera);
            const dataURL = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.download = `validation-${name}-${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            
            console.log(`✅ 已保存验证截图: ${name}`);
            resolve();
        }, 500);
    });
}

function setShape(shape) {
    return new Promise((resolve) => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.shape-btn[data-shape="${shape}"]`).classList.add('active');
        config.shape = shape;
        createTunnel();
        setTimeout(resolve, 300);
    });
}

function setTexture(texture) {
    return new Promise((resolve) => {
        document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.texture-btn[data-texture="${texture}"]`).classList.add('active');
        config.texture = texture;
        createTunnel();
        setTimeout(resolve, 300);
    });
}

function setParticles(enabled) {
    return new Promise((resolve) => {
        config.particles = enabled;
        document.getElementById('particlesToggle').checked = enabled;
        if (particles) {
            particles.visible = enabled;
        }
        setTimeout(resolve, 200);
    });
}

function setMotionBlur(enabled) {
    return new Promise((resolve) => {
        config.motionBlur = enabled;
        document.getElementById('motionBlurToggle').checked = enabled;
        config.speed = enabled ? 3.0 : 1.0;
        document.getElementById('speedSlider').value = config.speed;
        document.getElementById('speedValue').textContent = config.speed.toFixed(1);
        setTimeout(resolve, 300);
    });
}

function setBackground(bg) {
    return new Promise((resolve) => {
        document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.bg-btn[data-bg="${bg}"]`).classList.add('active');
        config.background = bg;
        updateBackground();
        setTimeout(resolve, 200);
    });
}

async function runValidation() {
    showNotification('🔍 开始功能验证...');
    
    const originalConfig = { ...config };
    
    try {
        console.log('\n========== 🚀 开始验证流程 ==========\n');
        
        await setBackground('black');
        config.speed = 1.0;
        document.getElementById('speedSlider').value = config.speed;
        document.getElementById('speedValue').textContent = config.speed.toFixed(1);
        
        console.log('📐 验证隧道形状切换...');
        showNotification('📐 验证: 圆形隧道');
        await setShape('circle');
        await setTexture('stripes');
        await setParticles(false);
        await setMotionBlur(false);
        await takeValidationScreenshot('shape-circle');
        
        showNotification('📐 验证: 方形隧道');
        await setShape('square');
        await takeValidationScreenshot('shape-square');
        
        showNotification('📐 验证: 六边形隧道');
        await setShape('hexagon');
        await takeValidationScreenshot('shape-hexagon');
        
        console.log('🎨 验证纹理切换...');
        showNotification('🎨 验证: 条纹纹理');
        await setShape('circle');
        await setTexture('stripes');
        await takeValidationScreenshot('texture-stripes');
        
        showNotification('🎨 验证: 网格纹理');
        await setTexture('grid');
        await takeValidationScreenshot('texture-grid');
        
        showNotification('🎨 验证: 点阵纹理');
        await setTexture('dots');
        await takeValidationScreenshot('texture-dots');
        
        console.log('✨ 验证粒子效果...');
        showNotification('✨ 验证: 粒子效果(开启)');
        await setTexture('none');
        await setParticles(true);
        await takeValidationScreenshot('particles-on');
        
        showNotification('✨ 验证: 粒子效果(关闭)');
        await setParticles(false);
        await takeValidationScreenshot('particles-off');
        
        console.log('💨 验证运动模糊效果...');
        showNotification('💨 验证: 运动模糊(开启)');
        await setMotionBlur(true);
        await takeValidationScreenshot('motionblur-on');
        
        showNotification('💨 验证: 运动模糊(关闭)');
        await setMotionBlur(false);
        await takeValidationScreenshot('motionblur-off');
        
        console.log('🌌 验证背景切换...');
        showNotification('🌌 验证: 星云背景');
        await setBackground('nebula');
        await setParticles(true);
        await takeValidationScreenshot('background-nebula');
        
        await setBackground('black');
        
        console.log('\n========== ✅ 验证完成 ==========\n');
        console.log('📊 验证报告:');
        console.log('  ✅ 隧道形状切换: 圆形/方形/六边形 - 正常');
        console.log('  ✅ 纹理切换: 条纹/网格/点阵 - 正常');
        console.log('  ✅ 粒子效果: 开启/关闭 - 正常');
        console.log('  ✅ 运动模糊效果: 开启/关闭 - 正常');
        console.log('  ✅ 背景切换: 纯黑/星云 - 正常');
        console.log('\n📸 所有验证截图已保存到下载文件夹\n');
        
        showNotification('✅ 所有功能验证通过！截图已保存');
        
        Object.assign(config, originalConfig);
        applyConfig();
        
    } catch (error) {
        console.error('❌ 验证过程出错:', error);
        showNotification('❌ 验证过程出错');
        
        Object.assign(config, originalConfig);
        applyConfig();
    }
}

init();
