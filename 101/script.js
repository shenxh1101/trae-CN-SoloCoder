const monthData = [
    { name: '一月', icon: '❄️', days: 31, solar: '小寒、大寒', zodiac: '摩羯座、水瓶座', color: 0x4a90d9 },
    { name: '二月', icon: '🌸', days: 28, solar: '立春、雨水', zodiac: '水瓶座、双鱼座', color: 0xff9999 },
    { name: '三月', icon: '🌱', days: 31, solar: '惊蛰、春分', zodiac: '双鱼座、白羊座', color: 0x7cb342 },
    { name: '四月', icon: '🌺', days: 30, solar: '清明、谷雨', zodiac: '白羊座、金牛座', color: 0xff7043 },
    { name: '五月', icon: '🌹', days: 31, solar: '立夏、小满', zodiac: '金牛座、双子座', color: 0xe91e63 },
    { name: '六月', icon: '☀️', days: 30, solar: '芒种、夏至', zodiac: '双子座、巨蟹座', color: 0xffc107 },
    { name: '七月', icon: '🌻', days: 31, solar: '小暑、大暑', zodiac: '巨蟹座、狮子座', color: 0xff9800 },
    { name: '八月', icon: '🌙', days: 31, solar: '立秋、处暑', zodiac: '狮子座、处女座', color: 0x7e57c2 },
    { name: '九月', icon: '🍂', days: 30, solar: '白露、秋分', zodiac: '处女座、天秤座', color: 0x8d6e63 },
    { name: '十月', icon: '🍁', days: 31, solar: '寒露、霜降', zodiac: '天秤座、天蝎座', color: 0xd84315 },
    { name: '十一月', icon: '⛄', days: 30, solar: '立冬、小雪', zodiac: '天蝎座、射手座', color: 0x90a4ae },
    { name: '十二月', icon: '🎄', days: 31, solar: '大雪、冬至', zodiac: '射手座、摩羯座', color: 0x2e7d32 }
];

let scene, camera, renderer, composer, bloomPass;
let dodecahedron, dodecahedronGroup;
let particles, particleSystem;
let faceMeshes = [];
let faceLabels = [];
let faceOriginalPositions = [];
let faceAnimations = [];

let isAutoRotate = true;
let isGlowEffect = true;
let displayMode = 'name';
let currentMaterialType = 'solid';
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let raycaster, mouse;
let hoveredFaceIndex = -1;

const currentMonth = new Date().getMonth();

const materials = {
    solid: null,
    wireframe: null,
    transparent: null
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('container').appendChild(renderer.domElement);

    setupPostProcessing();
    setupLights();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    createMaterials();
    createDodecahedron();
    createParticleSystem();
    updateStats();
    updateCurrentDate();
    setupEventListeners();
    animate();
}

function setupPostProcessing() {
    composer = new THREE.EffectComposer(renderer);
    
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 0.8;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    const pointLight1 = new THREE.PointLight(0xffd700, 1.5, 50);
    pointLight1.position.set(3, 2, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x667eea, 1, 50);
    pointLight2.position.set(-3, -2, 2);
    scene.add(pointLight2);

    const spotLight = new THREE.SpotLight(0xff6b6b, 0.8, 30, Math.PI / 6, 0.5);
    spotLight.position.set(0, 5, 0);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);
}

function createMaterials() {
    materials.solid = new THREE.MeshStandardMaterial({
        color: 0x2a2a5a,
        metalness: 0.3,
        roughness: 0.5,
        emissive: 0x1a1a3a,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
    });

    materials.wireframe = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });

    materials.transparent = new THREE.MeshPhysicalMaterial({
        color: 0x4a4a8a,
        metalness: 0.2,
        roughness: 0.3,
        transmission: 0.5,
        transparent: true,
        opacity: 0.6,
        thickness: 0.5,
        side: THREE.DoubleSide
    });
}

function createDodecahedron() {
    const geometry = new THREE.DodecahedronGeometry(2, 0);
    
    dodecahedronGroup = new THREE.Group();
    scene.add(dodecahedronGroup);

    dodecahedron = new THREE.Mesh(geometry, materials.solid);
    dodecahedronGroup.add(dodecahedron);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLines = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2, transparent: true, opacity: 0.6 })
    );
    dodecahedron.add(edgeLines);

    const faceNormals = calculateUniqueFaceNormals(geometry);
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    faceNormals.forEach((normal, index) => {
        const monthIndex = index % 12;
        const data = monthData[monthIndex];
        
        const faceGeometry = createPentagonFace(normal, 2.0);
        const faceMaterial = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.userData.monthIndex = monthIndex;
        faceMesh.userData.originalPosition = faceMesh.position.clone();
        faceMesh.userData.normal = normal.clone();
        dodecahedron.add(faceMesh);
        faceMeshes.push(faceMesh);
        faceOriginalPositions.push(faceMesh.position.clone());
        faceAnimations.push({ targetOffset: 0, currentOffset: 0 });

        const labelTexture = createMonthLabel(ctx, data, monthIndex === currentMonth);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthTest: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        const labelOffset = normal.clone().multiplyScalar(2.35);
        sprite.position.copy(labelOffset);
        sprite.scale.set(1.5, 1.5, 1);
        sprite.userData.monthIndex = monthIndex;
        sprite.userData.originalPosition = sprite.position.clone();
        sprite.userData.normal = normal.clone();
        dodecahedron.add(sprite);
        faceLabels.push(sprite);
    });
}

function calculateUniqueFaceNormals(geometry) {
    const normals = [];
    const positions = geometry.attributes.position;
    const seenNormals = [];

    for (let i = 0; i < positions.count; i += 3) {
        const v1 = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
        const v2 = new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
        const v3 = new THREE.Vector3(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));

        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        let isDuplicate = false;
        for (const seen of seenNormals) {
            if (normal.distanceTo(seen) < 0.01 || normal.distanceTo(seen.clone().negate()) < 0.01) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            normals.push(normal);
            seenNormals.push(normal.clone());
        }

        if (normals.length >= 12) break;
    }

    if (normals.length < 12) {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const dodecaNormals = [
            new THREE.Vector3(1, 1, 1).normalize(),
            new THREE.Vector3(1, 1, -1).normalize(),
            new THREE.Vector3(1, -1, 1).normalize(),
            new THREE.Vector3(1, -1, -1).normalize(),
            new THREE.Vector3(-1, 1, 1).normalize(),
            new THREE.Vector3(-1, 1, -1).normalize(),
            new THREE.Vector3(-1, -1, 1).normalize(),
            new THREE.Vector3(-1, -1, -1).normalize(),
            new THREE.Vector3(0, goldenRatio, 1/goldenRatio).normalize(),
            new THREE.Vector3(0, goldenRatio, -1/goldenRatio).normalize(),
            new THREE.Vector3(0, -goldenRatio, 1/goldenRatio).normalize(),
            new THREE.Vector3(0, -goldenRatio, -1/goldenRatio).normalize()
        ];
        return dodecaNormals;
    }

    return normals;
}

function createPentagonFace(normal, radius) {
    const shape = new THREE.Shape();
    const pentagonRadius = 0.7;
    
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * pentagonRadius;
        const y = Math.sin(angle) * pentagonRadius;
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const vertex = new THREE.Vector3(
            position.getX(i),
            position.getY(i),
            position.getZ(i)
        );
        vertex.applyQuaternion(quaternion);
        vertex.add(normal.clone().multiplyScalar(radius));
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
}

function createMonthLabel(ctx, data, isCurrentMonth) {
    ctx.clearRect(0, 0, 512, 512);
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(30, 30, 60, 0.95)');
    gradient.addColorStop(0.7, 'rgba(20, 20, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(10, 10, 30, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isCurrentMonth ? '#ffd700' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isCurrentMonth ? 12 : 4;
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '120px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.icon, 256, 200);

    ctx.font = 'bold 56px "Microsoft YaHei", Arial';
    ctx.fillStyle = isCurrentMonth ? '#ffd700' : '#ffffff';
    ctx.shadowColor = isCurrentMonth ? '#ffd700' : 'transparent';
    ctx.shadowBlur = isCurrentMonth ? 20 : 0;
    if (displayMode === 'name') {
        ctx.fillText(data.name, 256, 320);
    } else {
        ctx.fillText(data.days + '天', 256, 320);
    }
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(ctx.canvas);
    texture.needsUpdate = true;
    return texture;
}

function createParticleSystem() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        const radius = 15 + Math.random() * 35;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        const colorType = Math.random();
        if (colorType < 0.25) {
            colors[i3] = 1;
            colors[i3 + 1] = 0.84;
            colors[i3 + 2] = 0;
        } else if (colorType < 0.5) {
            colors[i3] = 0.4;
            colors[i3 + 1] = 0.5;
            colors[i3 + 2] = 1;
        } else if (colorType < 0.75) {
            colors[i3] = 1;
            colors[i3 + 1] = 0.6;
            colors[i3 + 2] = 0.8;
        } else {
            colors[i3] = 1;
            colors[i3 + 1] = 1;
            colors[i3 + 2] = 1;
        }

        sizes[i] = Math.random() * 3 + 0.5;
        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function updateMaterial(type) {
    currentMaterialType = type;
    switch (type) {
        case 'solid':
            dodecahedron.material = materials.solid;
            break;
        case 'wireframe':
            dodecahedron.material = materials.wireframe;
            break;
        case 'transparent':
            dodecahedron.material = materials.transparent;
            break;
    }
}

function updateDisplayMode() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    faceLabels.forEach((sprite, index) => {
        const monthIndex = sprite.userData.monthIndex;
        const data = monthData[monthIndex];
        const isCurrentMonth = monthIndex === currentMonth;
        
        sprite.material.map = createMonthLabel(ctx, data, isCurrentMonth);
        sprite.material.needsUpdate = true;
    });
}

function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(faceMeshes);

    if (intersects.length > 0) {
        const faceIndex = faceMeshes.indexOf(intersects[0].object);
        if (faceIndex !== hoveredFaceIndex && faceIndex !== -1) {
            if (hoveredFaceIndex !== -1) {
                faceAnimations[hoveredFaceIndex].targetOffset = 0;
            }
            hoveredFaceIndex = faceIndex;
            faceAnimations[hoveredFaceIndex].targetOffset = 0.3;
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (hoveredFaceIndex !== -1) {
            faceAnimations[hoveredFaceIndex].targetOffset = 0;
            hoveredFaceIndex = -1;
        }
        document.body.style.cursor = 'default';
    }
}

function updateFaceAnimations() {
    faceAnimations.forEach((anim, index) => {
        anim.currentOffset += (anim.targetOffset - anim.currentOffset) * 0.15;
        
        if (Math.abs(anim.currentOffset - anim.targetOffset) > 0.001) {
            const faceMesh = faceMeshes[index];
            const label = faceLabels[index];
            const normal = faceMesh.userData.normal;
            
            const newPos = faceOriginalPositions[index].clone().add(
                normal.clone().multiplyScalar(anim.currentOffset)
            );
            faceMesh.position.copy(newPos);
            
            const labelNewPos = label.userData.originalPosition.clone().add(
                label.userData.normal.clone().multiplyScalar(anim.currentOffset)
            );
            label.position.copy(labelNewPos);
        }
    });
}

function takeScreenshot() {
    renderer.render(scene, camera);
    
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    link.download = `dodecahedron-calendar-${timestamp}.png`;
    link.href = dataURL;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateStats() {
    document.getElementById('vertex-count').textContent = dodecahedron.geometry.attributes.position.count;
    document.getElementById('face-count').textContent = 12;
}

function updateCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
    };
    document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', options);
}

function resetView() {
    targetRotation = { x: 0, y: 0 };
    currentRotation = { x: 0, y: 0 };
    dodecahedronGroup.rotation.set(0, 0, 0);
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    
    document.getElementById('display-mode').addEventListener('change', (e) => {
        displayMode = e.target.value;
        updateDisplayMode();
    });
    
    document.getElementById('material-type').addEventListener('change', (e) => {
        updateMaterial(e.target.value);
    });
    
    document.getElementById('auto-rotate').addEventListener('change', (e) => {
        isAutoRotate = e.target.checked;
    });
    
    document.getElementById('glow-effect').addEventListener('change', (e) => {
        isGlowEffect = e.target.checked;
        bloomPass.enabled = isGlowEffect;
    });
    
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('screenshot').addEventListener('click', takeScreenshot);
    
    document.getElementById('close-info').addEventListener('click', closeMonthInfo);
    document.getElementById('month-info').addEventListener('click', (e) => {
        if (e.target.id === 'month-info') closeMonthInfo();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(e) {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotation.y += deltaX * 0.005;
        targetRotation.x += deltaY * 0.005;

        previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    checkHover();
}

function onMouseUp() {
    isDragging = false;
}

function onClick(e) {
    if (isDragging) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...faceMeshes, ...faceLabels]);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const monthIndex = obj.userData.monthIndex;
        if (monthIndex !== undefined) {
            showMonthInfo(monthIndex);
        }
    }
}

function showMonthInfo(index) {
    const data = monthData[index];
    document.getElementById('info-month').textContent = data.name;
    document.getElementById('info-days').textContent = data.days + ' 天';
    document.getElementById('info-solar').textContent = data.solar;
    document.getElementById('info-zodiac').textContent = data.zodiac;
    document.getElementById('month-info').classList.remove('hidden');
}

function closeMonthInfo() {
    document.getElementById('month-info').classList.add('hidden');
}

function animate() {
    requestAnimationFrame(animate);

    if (isAutoRotate && !isDragging) {
        targetRotation.y += 0.003;
    }

    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

    dodecahedronGroup.rotation.x = currentRotation.x;
    dodecahedronGroup.rotation.y = currentRotation.y;

    updateFaceAnimations();

    if (particleSystem) {
        particleSystem.rotation.y += 0.0002;
        
        const sizes = particleSystem.geometry.attributes.size.array;
        const phases = particleSystem.geometry.attributes.phase.array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < sizes.length; i++) {
            const baseSize = particleSystem.geometry.attributes.size.array[i];
            particleSystem.material.opacity = 0.6 + Math.sin(time * 2 + phases[i]) * 0.3;
        }
    }

    faceLabels.forEach(sprite => {
        sprite.lookAt(camera.position);
    });

    if (isGlowEffect) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

init();
