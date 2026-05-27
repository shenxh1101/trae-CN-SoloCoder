let scene, camera, renderer, prism, edges, glowMesh, bboxHelper, starField;
let autoRotate = true;
let shadowsEnabled = false;
let bboxVisible = false;
let currentMaterialMode = 'solid';
let currentBg = 'black';
let selectedFace = null;
let selectedFaceTriangles = [];
let raycaster, mouse;
let isDragging = false;
let dragStartPos = { x: 0, y: 0 };
let hasDragged = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { theta: 0, phi: Math.PI / 4 };
let cameraDistance = 5;

const config = {
    sides: 6,
    height: 2,
    radius: 1,
    glowIntensity: 0.5
};

const VALID_RANGES = {
    sides: { min: 3, max: 6 },
    height: { min: 0.5, max: 5 },
    radius: { min: 0.3, max: 2.5 },
    glowIntensity: { min: 0, max: 1 }
};

const sideColors = [
    0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4,
    0xffeaa7, 0xdfe6e9, 0xff7675, 0x74b9ff
];

const baseColor = 0xffd700;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function init() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();
    
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 3, -5);
    scene.add(pointLight);
    
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    createPrism();
    setupEventListeners();
    animate();
}

function createPrism() {
    if (prism) scene.remove(prism);
    if (edges) scene.remove(edges);
    if (glowMesh) scene.remove(glowMesh);
    if (bboxHelper) scene.remove(bboxHelper);
    
    selectedFace = null;
    selectedFaceTriangles = [];
    hideFaceInfo();
    
    const geometry = new THREE.CylinderGeometry(
        config.radius, config.radius, config.height, config.sides, 1, false
    );
    
    const count = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;
    const halfHeight = config.height / 2;
    
    for (let i = 0; i < count; i++) {
        const y = positions.getY(i);
        const color = new THREE.Color();
        
        if (Math.abs(y - halfHeight) < 0.01 || Math.abs(y + halfHeight) < 0.01) {
            color.setHex(baseColor);
        } else {
            const angle = Math.atan2(positions.getZ(i), positions.getX(i));
            let sideIndex = Math.floor((angle + Math.PI) / (2 * Math.PI) * config.sides);
            sideIndex = ((sideIndex % config.sides) + config.sides) % config.sides;
            color.setHex(sideColors[sideIndex % sideColors.length]);
        }
        
        colors.setXYZ(i, color.r, color.g, color.b);
    }
    
    let material;
    if (currentMaterialMode === 'solid') {
        material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            metalness: 0.3,
            roughness: 0.4,
            side: THREE.DoubleSide
        });
    } else if (currentMaterialMode === 'transparent') {
        material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
    } else {
        material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            wireframe: true,
            side: THREE.DoubleSide
        });
    }
    
    prism = new THREE.Mesh(geometry, material);
    prism.castShadow = true;
    prism.receiveShadow = true;
    scene.add(prism);
    
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        linewidth: 2,
        transparent: true,
        opacity: 0.9
    });
    edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edges);
    
    if (currentMaterialMode !== 'wireframe') {
        createGlowEffect();
    } else {
        glowMesh = null;
    }
    
    if (bboxVisible) {
        createBoundingBox();
    }
    
    updateStats();
    calculateFaceAreas();
}

function createGlowEffect() {
    const glowGeometry = new THREE.CylinderGeometry(
        config.radius * 1.15, config.radius * 1.15, config.height * 1.1, config.sides
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: config.glowIntensity * 0.25,
        side: THREE.BackSide,
        depthWrite: false
    });
    glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);
}

function createBoundingBox() {
    const box = new THREE.Box3().setFromObject(prism);
    const bboxGeometry = new THREE.BoxGeometry(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
    );
    const bboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.08,
        wireframe: false,
        depthWrite: false
    });
    bboxHelper = new THREE.Mesh(bboxGeometry, bboxMaterial);
    bboxHelper.position.copy(prism.position);
    scene.add(bboxHelper);
    
    const wireframeGeometry = new THREE.EdgesGeometry(bboxGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    bboxHelper.add(wireframe);
}

function createStarField() {
    if (starField) scene.remove(starField);
    
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const radius = 80 + Math.random() * 80;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        const brightness = 0.5 + Math.random() * 0.5;
        const hue = Math.random();
        let color;
        if (hue < 0.7) {
            color = new THREE.Color(0xffffff);
        } else if (hue < 0.85) {
            color = new THREE.Color(0xaaccff);
        } else {
            color = new THREE.Color(0xffddaa);
        }
        colors[i3] = color.r * brightness;
        colors[i3 + 1] = color.g * brightness;
        colors[i3 + 2] = color.b * brightness;
        
        sizes[i] = 0.3 + Math.random() * 0.8;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });
    
    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
    camera.position.y = cameraDistance * Math.cos(cameraAngle.phi);
    camera.position.z = cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
    camera.lookAt(0, 0, 0);
}

function updateStats() {
    const geometry = prism.geometry;
    const vertexCount = geometry.attributes.position.count;
    const faceCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;
    
    const edgeCount = config.sides * 3;
    
    document.getElementById('vertex-count').textContent = vertexCount;
    document.getElementById('edge-count').textContent = edgeCount;
    document.getElementById('face-count').textContent = Math.floor(faceCount);
}

let faceAreas = [];

function calculateFaceAreas() {
    faceAreas = [];
    
    const sideLength = 2 * config.radius * Math.sin(Math.PI / config.sides);
    const sideArea = config.height * sideLength;
    for (let i = 0; i < config.sides; i++) {
        faceAreas.push(sideArea);
    }
    
    const baseArea = 0.5 * config.sides * config.radius * config.radius * Math.sin(2 * Math.PI / config.sides);
    faceAreas.push(baseArea);
    faceAreas.push(baseArea);
}

function getFaceTriangles(faceIndex) {
    const geometry = prism.geometry;
    const index = geometry.index;
    const positions = geometry.attributes.position;
    const halfHeight = config.height / 2;
    
    if (!index) return [];
    
    const triangles = [];
    const numTriangles = index.count / 3;
    
    for (let t = 0; t < numTriangles; t++) {
        const i0 = index.getX(t * 3);
        const i1 = index.getX(t * 3 + 1);
        const i2 = index.getX(t * 3 + 2);
        
        const y0 = positions.getY(i0);
        const y1 = positions.getY(i1);
        const y2 = positions.getY(i2);
        
        const avgY = (y0 + y1 + y2) / 3;
        const isTop = Math.abs(avgY - halfHeight) < 0.1;
        const isBottom = Math.abs(avgY + halfHeight) < 0.1;
        
        if (faceIndex < config.sides) {
            if (!isTop && !isBottom) {
                const x0 = positions.getX(i0), z0 = positions.getZ(i0);
                const x1 = positions.getX(i1), z1 = positions.getZ(i1);
                const x2 = positions.getX(i2), z2 = positions.getZ(i2);
                
                const angle0 = Math.atan2(z0, x0);
                const angle1 = Math.atan2(z1, x1);
                const angle2 = Math.atan2(z2, x2);
                
                let si0 = Math.floor((angle0 + Math.PI) / (2 * Math.PI) * config.sides);
                let si1 = Math.floor((angle1 + Math.PI) / (2 * Math.PI) * config.sides);
                let si2 = Math.floor((angle2 + Math.PI) / (2 * Math.PI) * config.sides);
                
                si0 = ((si0 % config.sides) + config.sides) % config.sides;
                si1 = ((si1 % config.sides) + config.sides) % config.sides;
                si2 = ((si2 % config.sides) + config.sides) % config.sides;
                
                if (si0 === faceIndex && si1 === faceIndex && si2 === faceIndex) {
                    triangles.push(t);
                }
            }
        } else if (faceIndex === config.sides) {
            if (isTop) {
                triangles.push(t);
            }
        } else if (faceIndex === config.sides + 1) {
            if (isBottom) {
                triangles.push(t);
            }
        }
    }
    
    return triangles;
}

function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    renderer.domElement.addEventListener('click', onMouseClick);
    
    document.getElementById('prism-type').addEventListener('change', (e) => {
        const newSides = parseInt(e.target.value);
        config.sides = clamp(newSides, VALID_RANGES.sides.min, VALID_RANGES.sides.max);
        e.target.value = config.sides;
        createPrism();
    });
    
    document.getElementById('height-slider').addEventListener('input', (e) => {
        config.height = clamp(parseFloat(e.target.value), VALID_RANGES.height.min, VALID_RANGES.height.max);
        e.target.value = config.height;
        document.getElementById('height-value').textContent = config.height.toFixed(1);
        createPrism();
    });
    
    document.getElementById('radius-slider').addEventListener('input', (e) => {
        config.radius = clamp(parseFloat(e.target.value), VALID_RANGES.radius.min, VALID_RANGES.radius.max);
        e.target.value = config.radius;
        document.getElementById('radius-value').textContent = config.radius.toFixed(1);
        createPrism();
    });
    
    document.getElementById('glow-slider').addEventListener('input', (e) => {
        config.glowIntensity = clamp(parseFloat(e.target.value), VALID_RANGES.glowIntensity.min, VALID_RANGES.glowIntensity.max);
        e.target.value = config.glowIntensity;
        document.getElementById('glow-value').textContent = config.glowIntensity.toFixed(1);
        if (glowMesh && currentMaterialMode !== 'wireframe') {
            glowMesh.material.opacity = config.glowIntensity * 0.25;
        }
    });
    
    document.querySelectorAll('[data-material]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-material]').forEach(b => {
                b.classList.remove('active', 'primary');
                b.classList.add('secondary');
            });
            btn.classList.add('active', 'primary');
            btn.classList.remove('secondary');
            currentMaterialMode = btn.dataset.material;
            createPrism();
        });
    });
    
    document.querySelectorAll('[data-bg]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-bg]').forEach(b => {
                b.classList.remove('active', 'primary');
                b.classList.add('secondary');
            });
            btn.classList.add('active', 'primary');
            btn.classList.remove('secondary');
            currentBg = btn.dataset.bg;
            changeBackground(currentBg);
        });
    });
    
    document.getElementById('shadow-toggle').addEventListener('click', (e) => {
        shadowsEnabled = !shadowsEnabled;
        e.target.textContent = `阴影: ${shadowsEnabled ? '开' : '关'}`;
        e.target.classList.toggle('active', shadowsEnabled);
        e.target.classList.toggle('primary', shadowsEnabled);
        e.target.classList.toggle('secondary', !shadowsEnabled);
        renderer.shadowMap.enabled = shadowsEnabled;
        if (prism) {
            prism.castShadow = shadowsEnabled;
            prism.receiveShadow = shadowsEnabled;
        }
    });
    
    document.getElementById('rotation-toggle').addEventListener('click', (e) => {
        autoRotate = !autoRotate;
        e.target.classList.toggle('active', autoRotate);
        e.target.classList.toggle('primary', autoRotate);
        e.target.classList.toggle('secondary', !autoRotate);
    });
    
    document.getElementById('bbox-toggle').addEventListener('click', (e) => {
        bboxVisible = !bboxVisible;
        e.target.textContent = `包围盒: ${bboxVisible ? '开' : '关'}`;
        e.target.classList.toggle('active', bboxVisible);
        e.target.classList.toggle('primary', bboxVisible);
        e.target.classList.toggle('secondary', !bboxVisible);
        
        if (bboxVisible) {
            createBoundingBox();
        } else if (bboxHelper) {
            scene.remove(bboxHelper);
            bboxHelper = null;
        }
    });
    
    document.getElementById('export-btn').addEventListener('click', exportConfig);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', importConfig);
    
    document.getElementById('screenshot-btn').addEventListener('click', takeScreenshot);
    
    window.addEventListener('resize', onWindowResize);
}

function changeBackground(type) {
    if (starField) {
        scene.remove(starField);
        starField = null;
    }
    
    switch(type) {
        case 'black':
            scene.background = new THREE.Color(0x000000);
            break;
        case 'darkblue':
            scene.background = new THREE.Color(0x0a0a2e);
            break;
        case 'stars':
            scene.background = new THREE.Color(0x000011);
            createStarField();
            break;
    }
}

function onMouseDown(event) {
    isDragging = true;
    hasDragged = false;
    dragStartPos = { x: event.clientX, y: event.clientY };
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (!isDragging) return;
    
    const dx = event.clientX - dragStartPos.x;
    const dy = event.clientY - dragStartPos.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
    }
    
    if (hasDragged) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        
        cameraAngle.theta += deltaX * 0.005;
        cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi + deltaY * 0.005));
        
        updateCameraPosition();
        
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onMouseUp() {
    isDragging = false;
}

function onMouseWheel(event) {
    cameraDistance = Math.max(2, Math.min(15, cameraDistance + event.deltaY * 0.01));
    updateCameraPosition();
}

function onMouseClick(event) {
    if (hasDragged) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(prism);
    
    if (intersects.length > 0) {
        const face = intersects[0].face;
        const positions = prism.geometry.attributes.position;
        const halfHeight = config.height / 2;
        
        const y0 = positions.getY(face.a);
        const y1 = positions.getY(face.b);
        const y2 = positions.getY(face.c);
        const avgY = (y0 + y1 + y2) / 3;
        
        const isTop = Math.abs(avgY - halfHeight) < 0.1;
        const isBottom = Math.abs(avgY + halfHeight) < 0.1;
        
        let faceIndex;
        
        if (isTop) {
            faceIndex = config.sides;
        } else if (isBottom) {
            faceIndex = config.sides + 1;
        } else {
            const x0 = positions.getX(face.a), z0 = positions.getZ(face.a);
            const angle = Math.atan2(z0, x0);
            let sideIndex = Math.floor((angle + Math.PI) / (2 * Math.PI) * config.sides);
            sideIndex = ((sideIndex % config.sides) + config.sides) % config.sides;
            faceIndex = sideIndex;
        }
        
        highlightFace(faceIndex);
        showFaceInfo(faceIndex);
    } else {
        resetHighlight();
        hideFaceInfo();
    }
}

function highlightFace(faceIndex) {
    resetHighlight();
    selectedFace = faceIndex;
    selectedFaceTriangles = getFaceTriangles(faceIndex);
    
    const geometry = prism.geometry;
    const index = geometry.index;
    const colors = geometry.attributes.color;
    
    const highlightColor = new THREE.Color(0xffff66);
    
    selectedFaceTriangles.forEach(t => {
        const i0 = index.getX(t * 3);
        const i1 = index.getX(t * 3 + 1);
        const i2 = index.getX(t * 3 + 2);
        
        [i0, i1, i2].forEach(idx => {
            colors.setXYZ(idx, highlightColor.r, highlightColor.g, highlightColor.b);
        });
    });
    
    colors.needsUpdate = true;
}

function resetHighlight() {
    if (!prism) return;
    
    selectedFace = null;
    selectedFaceTriangles = [];
    
    const colors = prism.geometry.attributes.color;
    const positions = prism.geometry.attributes.position;
    const halfHeight = config.height / 2;
    
    for (let i = 0; i < colors.count; i++) {
        const y = positions.getY(i);
        const color = new THREE.Color();
        
        if (Math.abs(y - halfHeight) < 0.01 || Math.abs(y + halfHeight) < 0.01) {
            color.setHex(baseColor);
        } else {
            const angle = Math.atan2(positions.getZ(i), positions.getX(i));
            let sideIndex = Math.floor((angle + Math.PI) / (2 * Math.PI) * config.sides);
            sideIndex = ((sideIndex % config.sides) + config.sides) % config.sides;
            color.setHex(sideColors[sideIndex % sideColors.length]);
        }
        
        colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
}

function showFaceInfo(faceIndex) {
    const infoPanel = document.getElementById('face-info');
    const area = faceAreas[faceIndex] ? faceAreas[faceIndex].toFixed(3) : 'N/A';
    
    let faceName;
    if (faceIndex < config.sides) {
        faceName = `侧面 ${faceIndex + 1}`;
    } else if (faceIndex === config.sides) {
        faceName = '上底面';
    } else {
        faceName = '下底面';
    }
    
    document.getElementById('face-index').textContent = faceName;
    document.getElementById('face-area').textContent = area + ' 平方单位';
    infoPanel.style.display = 'block';
}

function hideFaceInfo() {
    document.getElementById('face-info').style.display = 'none';
}

function exportConfig() {
    const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        config: {
            sides: config.sides,
            height: config.height,
            radius: config.radius,
            glowIntensity: config.glowIntensity
        },
        settings: {
            materialMode: currentMaterialMode,
            background: currentBg,
            autoRotate: autoRotate,
            shadows: shadowsEnabled,
            bbox: bboxVisible
        },
        camera: {
            theta: cameraAngle.theta,
            phi: cameraAngle.phi,
            distance: cameraDistance
        }
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            const cfg = data.config || data;
            const settings = data.settings || data;
            
            config.sides = clamp(parseInt(cfg.sides) || 6, VALID_RANGES.sides.min, VALID_RANGES.sides.max);
            config.height = clamp(parseFloat(cfg.height) || 2, VALID_RANGES.height.min, VALID_RANGES.height.max);
            config.radius = clamp(parseFloat(cfg.radius) || 1, VALID_RANGES.radius.min, VALID_RANGES.radius.max);
            config.glowIntensity = clamp(parseFloat(cfg.glowIntensity) || 0.5, VALID_RANGES.glowIntensity.min, VALID_RANGES.glowIntensity.max);
            
            document.getElementById('prism-type').value = config.sides;
            document.getElementById('height-slider').value = config.height;
            document.getElementById('height-value').textContent = config.height.toFixed(1);
            document.getElementById('radius-slider').value = config.radius;
            document.getElementById('radius-value').textContent = config.radius.toFixed(1);
            document.getElementById('glow-slider').value = config.glowIntensity;
            document.getElementById('glow-value').textContent = config.glowIntensity.toFixed(1);
            
            if (settings.materialMode) {
                currentMaterialMode = settings.materialMode;
                document.querySelectorAll('[data-material]').forEach(btn => {
                    btn.classList.remove('active', 'primary');
                    btn.classList.add('secondary');
                    if (btn.dataset.material === currentMaterialMode) {
                        btn.classList.add('active', 'primary');
                        btn.classList.remove('secondary');
                    }
                });
            }
            
            if (settings.background) {
                currentBg = settings.background;
                changeBackground(currentBg);
                document.querySelectorAll('[data-bg]').forEach(btn => {
                    btn.classList.remove('active', 'primary');
                    btn.classList.add('secondary');
                    if (btn.dataset.bg === currentBg) {
                        btn.classList.add('active', 'primary');
                        btn.classList.remove('secondary');
                    }
                });
            }
            
            if (data.camera) {
                cameraAngle.theta = data.camera.theta || 0;
                cameraAngle.phi = data.camera.phi || Math.PI / 4;
                cameraDistance = data.camera.distance || 5;
                updateCameraPosition();
            }
            
            autoRotate = settings.autoRotate !== false;
            shadowsEnabled = settings.shadows || false;
            bboxVisible = settings.bbox || false;
            
            document.getElementById('rotation-toggle').classList.toggle('active', autoRotate);
            document.getElementById('rotation-toggle').classList.toggle('primary', autoRotate);
            document.getElementById('rotation-toggle').classList.toggle('secondary', !autoRotate);
            
            document.getElementById('shadow-toggle').textContent = `阴影: ${shadowsEnabled ? '开' : '关'}`;
            document.getElementById('shadow-toggle').classList.toggle('active', shadowsEnabled);
            document.getElementById('shadow-toggle').classList.toggle('primary', shadowsEnabled);
            document.getElementById('shadow-toggle').classList.toggle('secondary', !shadowsEnabled);
            
            document.getElementById('bbox-toggle').textContent = `包围盒: ${bboxVisible ? '开' : '关'}`;
            document.getElementById('bbox-toggle').classList.toggle('active', bboxVisible);
            document.getElementById('bbox-toggle').classList.toggle('primary', bboxVisible);
            document.getElementById('bbox-toggle').classList.toggle('secondary', !bboxVisible);
            
            createPrism();
            renderer.shadowMap.enabled = shadowsEnabled;
            
        } catch (err) {
            console.error('Import error:', err);
            alert('配置文件解析失败！请确保文件格式正确。');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function takeScreenshot() {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `prism-screenshot-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (autoRotate && prism) {
        prism.rotation.y += 0.01;
        edges.rotation.y += 0.01;
        if (glowMesh) glowMesh.rotation.y += 0.01;
        if (bboxHelper) bboxHelper.rotation.y += 0.01;
    }
    
    if (starField) {
        starField.rotation.y += 0.0001;
    }
    
    renderer.render(scene, camera);
}

init();
