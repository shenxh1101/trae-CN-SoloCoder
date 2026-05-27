import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createGeometry,
    getGeometryName,
    getCurrentMesh,
    setCurrentMesh,
    getGeometryStats,
    isMultiMode,
    setMultiMode,
    getMultiMeshes,
    setMultiMeshes,
    getCurrentGeometryType,
    setCurrentGeometryType
} from './geometry.js';
import {
    createAnimatedMaterial,
    getMaterial,
    updateMaterialColor,
    setMaterialMetalness,
    setMaterialRoughness,
    setMaterialWireframe,
    createMultiMaterials,
    updateMultiMaterialColor,
    setMultiMaterialProperty
} from './material.js';
import {
    initLights,
    setAmbientLightEnabled,
    setPointLightEnabled,
    updateLights
} from './lights.js';
import {
    initControls,
    on,
    getState,
    updateStats
} from './controls.js';
import { takeScreenshot, exportOBJ } from './export.js';

let scene, camera, renderer, controls;
let clock;
let groundReflector = null;
let starField = null;
let gradientBackground = null;
let animationTime = 0;
let multiMaterials = [];

function init() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 2, 5);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.enablePan = true;

    clock = new THREE.Clock();

    initLights(scene);
    const material = createAnimatedMaterial();

    const geometry = createGeometry('box');
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    setCurrentMesh(mesh);

    createGroundReflector();
    createStarryBackground();
    createGradientBackground();

    const state = initControls();
    setupEventListeners();

    updateStatsDisplay();

    window.addEventListener('resize', onWindowResize);

    animate();
}

function createGroundReflector() {
    if (groundReflector) {
        scene.remove(groundReflector);
        groundReflector.geometry.dispose();
        groundReflector.material.dispose();
    }

    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshStandardMaterial({
        color: 0x111118,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7
    });

    groundReflector = new THREE.Mesh(geometry, material);
    groundReflector.rotation.x = -Math.PI / 2;
    groundReflector.position.y = -1.5;
    groundReflector.receiveShadow = true;
    scene.add(groundReflector);
}

function createStarryBackground() {
    if (starField) {
        scene.remove(starField);
        starField.geometry.dispose();
        starField.material.dispose();
    }

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const radius = 80 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.cos(phi);
        positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.8);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    starField = new THREE.Points(starsGeometry, starsMaterial);
    starField.visible = false;
    scene.add(starField);
}

function createGradientBackground() {
    if (gradientBackground) {
        scene.remove(gradientBackground);
        gradientBackground.geometry.dispose();
        gradientBackground.material.dispose();
    }

    const geometry = new THREE.SphereGeometry(100, 32, 32);
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(0x000428) },
            bottomColor: { value: new THREE.Color(0x004e92) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `
    });

    gradientBackground = new THREE.Mesh(geometry, material);
    gradientBackground.visible = false;
    scene.add(gradientBackground);
}

function setupEventListeners() {
    on('geometryChange', (type) => {
        setCurrentGeometryType(type);
        updateGeometry();
    });

    on('scaleChange', (scale) => {
        if (isMultiMode()) {
            getMultiMeshes().forEach(m => {
                m.scale.setScalar(scale);
            });
        } else {
            const mesh = getCurrentMesh();
            if (mesh) mesh.scale.setScalar(scale);
        }
    });

    on('metalnessChange', (value) => {
        if (isMultiMode()) {
            setMultiMaterialProperty(multiMaterials, 'metalness', value);
        } else {
            setMaterialMetalness(value);
        }
    });

    on('roughnessChange', (value) => {
        if (isMultiMode()) {
            setMultiMaterialProperty(multiMaterials, 'roughness', value);
        } else {
            setMaterialRoughness(value);
        }
    });

    on('wireframeChange', (enabled) => {
        if (isMultiMode()) {
            setMultiMaterialProperty(multiMaterials, 'wireframe', enabled);
        } else {
            setMaterialWireframe(enabled);
        }
    });

    on('animationModeChange', (mode) => {
        const state = getState();
        state.animationMode = mode;
    });

    on('autoRotateChange', (enabled) => {
        const state = getState();
        state.autoRotate = enabled;
    });

    on('ambientLightChange', (enabled) => {
        setAmbientLightEnabled(enabled);
    });

    on('pointLightChange', (enabled) => {
        setPointLightEnabled(enabled);
    });

    on('backgroundChange', (type) => {
        updateBackground(type);
    });

    on('reflectionChange', (enabled) => {
        if (groundReflector) {
            groundReflector.visible = enabled;
        }
    });

    on('multiGeometryChange', (enabled) => {
        setMultiMode(enabled);
        if (enabled) {
            createMultiGeometryGrid();
        } else {
            removeMultiGeometry();
        }
    });

    on('screenshot', () => {
        takeScreenshot(renderer, scene, camera);
    });

    on('exportObj', () => {
        if (isMultiMode()) {
            exportOBJ(getMultiMeshes(), 'multi-geometry');
        } else {
            exportOBJ(getCurrentMesh(), 'geometry');
        }
    });
}

function updateGeometry() {
    if (isMultiMode()) return;

    const type = getCurrentGeometryType();
    const oldMesh = getCurrentMesh();
    if (oldMesh) scene.remove(oldMesh);

    const geometry = createGeometry(type);
    const material = getMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const state = getState();
    mesh.scale.setScalar(state.scale);

    scene.add(mesh);
    setCurrentMesh(mesh);
    updateStatsDisplay();
}

function createMultiGeometryGrid() {
    const oldMesh = getCurrentMesh();
    if (oldMesh) scene.remove(oldMesh);

    const types = ['box', 'sphere', 'cylinder', 'cone'];
    const positions = [
        [-1.8, 1.2, 0],
        [1.8, 1.2, 0],
        [-1.8, -1.2, 0],
        [1.8, -1.2, 0]
    ];

    multiMaterials = createMultiMaterials();
    const state = getState();
    const meshes = [];

    types.forEach((type, i) => {
        const geometry = createGeometry(type);
        const mesh = new THREE.Mesh(geometry, multiMaterials[i]);
        mesh.position.set(...positions[i]);
        mesh.scale.setScalar(state.scale * 0.6);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.baseY = positions[i][1];
        mesh.userData.baseScale = state.scale * 0.6;
        scene.add(mesh);
        meshes.push(mesh);
    });

    setMultiMeshes(meshes);
    setCurrentMesh(null);
    updateMultiStats(meshes);
}

function removeMultiGeometry() {
    getMultiMeshes().forEach(m => {
        scene.remove(m);
    });
    setMultiMeshes([]);
    multiMaterials = [];

    const type = getCurrentGeometryType();
    const geometry = createGeometry(type);
    const material = getMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const state = getState();
    mesh.scale.setScalar(state.scale);

    scene.add(mesh);
    setCurrentMesh(mesh);
    updateStatsDisplay();
}

function updateBackground(type) {
    if (type === 'solid') {
        scene.background = new THREE.Color(0x0a0a0f);
        if (starField) starField.visible = false;
        if (gradientBackground) gradientBackground.visible = false;
    } else if (type === 'gradient') {
        scene.background = null;
        if (starField) starField.visible = false;
        if (gradientBackground) gradientBackground.visible = true;
    } else if (type === 'starry') {
        scene.background = new THREE.Color(0x050508);
        if (starField) starField.visible = true;
        if (gradientBackground) gradientBackground.visible = false;
    }
}

function updateStatsDisplay() {
    const mesh = getCurrentMesh();
    if (mesh && mesh.geometry) {
        const stats = getGeometryStats(mesh.geometry);
        const name = getGeometryName(getCurrentGeometryType());
        updateStats(stats.vertices, stats.faces, name);
    }
}

function updateMultiStats(meshes) {
    let totalVertices = 0;
    let totalFaces = 0;
    meshes.forEach(m => {
        if (m.geometry) {
            const stats = getGeometryStats(m.geometry);
            totalVertices += stats.vertices;
            totalFaces += stats.faces;
        }
    });
    updateStats(totalVertices, totalFaces, `${meshes.length}个几何体`);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    animationTime += delta;
    const state = getState();

    updateLights(animationTime);
    updateMaterialColor(animationTime);

    if (isMultiMode()) {
        updateMultiMaterialColor(multiMaterials, animationTime);
        const meshes = getMultiMeshes();
        meshes.forEach((mesh, i) => {
            if (state.autoRotate) {
                mesh.rotation.y += delta * (0.5 + i * 0.1);
            }

            if (state.animationMode === 'float') {
                mesh.position.y = mesh.userData.baseY + Math.sin(animationTime * 2 + i) * 0.3;
            } else if (state.animationMode === 'pulse') {
                const pulse = 1 + Math.sin(animationTime * 3 + i) * 0.15;
                mesh.scale.setScalar(mesh.userData.baseScale * pulse);
            }
        });
    } else {
        const mesh = getCurrentMesh();
        if (mesh) {
            if (state.autoRotate) {
                mesh.rotation.y += delta * 0.8;
            }

            if (state.animationMode === 'float') {
                mesh.position.y = Math.sin(animationTime * 1.5) * 0.4;
            } else if (state.animationMode === 'pulse') {
                const pulse = 1 + Math.sin(animationTime * 2) * 0.15;
                const s = state.scale;
                mesh.scale.setScalar(s * pulse);
            } else if (state.animationMode === 'rotate') {
                mesh.position.y = 0;
                mesh.scale.setScalar(state.scale);
            }
        }
    }

    if (starField && starField.visible) {
        starField.rotation.y += delta * 0.02;
    }

    controls.update();
    renderer.render(scene, camera);
}

init();