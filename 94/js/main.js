import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

class FloatingIslands {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.bloomPass = null;
        this.controls = null;
        this.islands = [];
        this.fireflies = null;
        this.fireflyCount = 200;
        this.houseLights = [];
        this.clouds = [];
        this.water = null;
        this.waterReflector = null;
        this.isNightMode = false;
        this.autoFly = false;
        this.autoFlyAngle = 0;
        this.currentBackground = 'sky';
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clickableObjects = [];
        
        this.init();
        this.setupLights();
        this.setupPostProcessing();
        this.createIslands();
        this.createBridges();
        this.createFireflies();
        this.createClouds();
        this.createWater();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        const container = document.getElementById('canvas-container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(30, 20, 30);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2.1;
    }

    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(50, 50, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);
        
        this.moonLight = new THREE.DirectionalLight(0x6688cc, 0.3);
        this.moonLight.position.set(-30, 40, -30);
        this.moonLight.visible = false;
        this.scene.add(this.moonLight);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,
            0.4,
            0.85
        );
        this.composer.addPass(this.bloomPass);
    }

    createIsland(x, y, z, scale, name, description) {
        const islandGroup = new THREE.Group();
        islandGroup.position.set(x, y, z);
        islandGroup.userData = { name, description, isIsland: true };
        
        const topGeometry = new THREE.CylinderGeometry(4 * scale, 5 * scale, 1 * scale, 8);
        const topMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a7c39,
            roughness: 0.8,
            metalness: 0.1
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.5 * scale;
        top.castShadow = true;
        top.receiveShadow = true;
        islandGroup.add(top);
        
        const sideGeometry = new THREE.ConeGeometry(5 * scale, 4 * scale, 8, 1, true);
        const sideMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const sides = new THREE.Mesh(sideGeometry, sideMaterial);
        sides.position.y = -1.5 * scale;
        sides.rotation.y = Math.PI / 8;
        sides.castShadow = true;
        islandGroup.add(sides);
        
        this.createVines(islandGroup, scale);
        this.createHouse(islandGroup, scale);
        this.createTrees(islandGroup, scale);
        
        this.scene.add(islandGroup);
        this.islands.push(islandGroup);
        this.clickableObjects.push(islandGroup);
        
        islandGroup.traverse((child) => {
            if (child.isMesh) {
                child.userData.parentIsland = islandGroup;
                this.clickableObjects.push(child);
            }
        });
        
        return islandGroup;
    }

    createVines(islandGroup, scale) {
        const vineCount = Math.floor(8 * scale);
        for (let i = 0; i < vineCount; i++) {
            const angle = (i / vineCount) * Math.PI * 2;
            const radius = 4.5 * scale;
            
            const vineGeometry = new THREE.BufferGeometry();
            const vinePositions = [];
            const vineLength = 2 + Math.random() * 3 * scale;
            const segments = 10;
            
            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
                const y = -t * vineLength;
                const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
                vinePositions.push(x, y, z);
            }
            
            vineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vinePositions, 3));
            
            const vineMaterial = new THREE.LineBasicMaterial({ 
                color: 0x2d5a27,
                transparent: true,
                opacity: 0.8
            });
            
            const vine = new THREE.Line(vineGeometry, vineMaterial);
            islandGroup.add(vine);
        }
    }

    createHouse(islandGroup, scale) {
        const houseGroup = new THREE.Group();
        
        const houseGeometry = new THREE.BoxGeometry(2 * scale, 1.5 * scale, 2 * scale);
        const houseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xDEB887,
            roughness: 0.7
        });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.y = 1.5 * scale;
        house.castShadow = true;
        house.receiveShadow = true;
        houseGroup.add(house);
        
        const roofGeometry = new THREE.ConeGeometry(1.5 * scale, 1.2 * scale, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B0000,
            roughness: 0.6
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 2.8 * scale;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);
        
        const windowGeometry = new THREE.PlaneGeometry(0.4 * scale, 0.5 * scale);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffaa,
            emissive: 0xffffaa,
            emissiveIntensity: 0
        });
        
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0.6 * scale, 1.5 * scale, 1.01 * scale);
        houseGroup.add(window1);
        
        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(-0.6 * scale, 1.5 * scale, 1.01 * scale);
        houseGroup.add(window2);
        
        const light = new THREE.PointLight(0xffffaa, 0, 10 * scale);
        light.position.set(0, 2 * scale, 0);
        houseGroup.add(light);
        this.houseLights.push({ light, windowMaterial });
        
        islandGroup.add(houseGroup);
    }

    createTrees(islandGroup, scale) {
        const treeCount = Math.floor(3 * scale);
        for (let i = 0; i < treeCount; i++) {
            const treeGroup = new THREE.Group();
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 1 + Math.random() * 2 * scale;
            treeGroup.position.set(
                Math.cos(angle) * radius,
                1 * scale,
                Math.sin(angle) * radius
            );
            
            const trunkGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 1 * scale, 6);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 0.5 * scale;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            const leafGeometry = new THREE.SphereGeometry(0.6 * scale, 6, 6);
            const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
            leaves.position.y = 1.3 * scale;
            leaves.castShadow = true;
            treeGroup.add(leaves);
            
            islandGroup.add(treeGroup);
        }
    }

    createIslands() {
        this.createIsland(0, 5, 0, 1.2, '中心岛', '这是最大的漂浮岛屿，位于群岛的中心位置。岛上有一座温馨的小屋和茂密的树木，是整个群岛的核心区域。');
        this.createIsland(-15, 8, -5, 0.8, '翡翠岛', '这座小岛被翠绿的藤蔓覆盖，仿佛一颗漂浮在空中的翡翠。岛上生长着奇异的发光植物。');
        this.createIsland(12, 3, 10, 1, '云雾岛', '这座岛屿常年被薄雾环绕，如同仙境一般。岛上的树木高大挺拔，是观赏日落的最佳地点。');
    }

    createBridge(startIsland, endIsland) {
        const start = startIsland.position;
        const end = endIsland.position;
        
        const distance = start.distanceTo(end);
        const segments = 20;
        
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(start.x, start.y, start.z),
            new THREE.Vector3(
                (start.x + end.x) / 2,
                Math.min(start.y, end.y) - 2,
                (start.z + end.z) / 2
            ),
            new THREE.Vector3(end.x, end.y, end.z)
        );
        
        const points = curve.getPoints(segments);
        
        for (let i = 0; i < 3; i++) {
            const ropeGeometry = new THREE.BufferGeometry();
            const positions = [];
            const offset = (i - 1) * 0.3;
            
            points.forEach(point => {
                positions.push(point.x, point.y + offset, point.z);
            });
            
            ropeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            const ropeMaterial = new THREE.LineBasicMaterial({ 
                color: 0x8B7355,
                transparent: true,
                opacity: 0.9
            });
            
            const rope = new THREE.Line(ropeGeometry, ropeMaterial);
            this.scene.add(rope);
        }
        
        const plankCount = segments - 1;
        for (let i = 0; i < plankCount; i++) {
            const t = (i + 0.5) / plankCount;
            const point = curve.getPoint(t);
            const tangent = curve.getTangent(t).normalize();
            
            const plankGeometry = new THREE.BoxGeometry(0.2, 0.1, 1.5);
            const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
            const plank = new THREE.Mesh(plankGeometry, plankMaterial);
            
            plank.position.copy(point);
            plank.lookAt(point.clone().add(tangent));
            plank.rotateX(Math.PI / 2);
            
            plank.castShadow = true;
            plank.receiveShadow = true;
            this.scene.add(plank);
        }
    }

    createBridges() {
        this.createBridge(this.islands[0], this.islands[1]);
        this.createBridge(this.islands[0], this.islands[2]);
    }

    createFireflies() {
        const fireflyGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.fireflyCount * 3);
        const colors = new Float32Array(this.fireflyCount * 3);
        const sizes = new Float32Array(this.fireflyCount);
        this.fireflyBasePositions = [];
        
        for (let i = 0; i < this.fireflyCount; i++) {
            const islandIndex = Math.floor(Math.random() * this.islands.length);
            const island = this.islands[islandIndex];
            const islandPos = island.position;
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 5;
            const height = Math.random() * 8;
            
            const x = islandPos.x + Math.cos(angle) * radius;
            const y = islandPos.y + height;
            const z = islandPos.z + Math.sin(angle) * radius;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 0.5;
            
            sizes[i] = 0.1 + Math.random() * 0.15;
            
            this.fireflyBasePositions.push({ x, y, z, phase: Math.random() * Math.PI * 2 });
        }
        
        fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        fireflyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        fireflyGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const fireflyMaterial = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
        this.scene.add(this.fireflies);
    }

    updateFireflies(time) {
        if (!this.fireflies) return;
        
        const positions = this.fireflies.geometry.attributes.position.array;
        
        for (let i = 0; i < this.fireflyCount; i++) {
            const base = this.fireflyBasePositions[i];
            if (!base) continue;
            
            const speed = 0.5 + Math.sin(time * 0.001 + base.phase) * 0.3;
            
            positions[i * 3] = base.x + Math.sin(time * 0.001 * speed + base.phase) * 2;
            positions[i * 3 + 1] = base.y + Math.cos(time * 0.0015 * speed + base.phase) * 1;
            positions[i * 3 + 2] = base.z + Math.sin(time * 0.0012 * speed + base.phase) * 2;
        }
        
        this.fireflies.geometry.attributes.position.needsUpdate = true;
    }

    createClouds() {
        const cloudCount = 15;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();
            
            const puffCount = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < puffCount; j++) {
                const puffGeometry = new THREE.SphereGeometry(2 + Math.random() * 2, 8, 6);
                const puffMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.7,
                    roughness: 1
                });
                const puff = new THREE.Mesh(puffGeometry, puffMaterial);
                
                puff.position.set(
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 4
                );
                puff.scale.set(
                    1 + Math.random() * 0.5,
                    0.6 + Math.random() * 0.4,
                    1 + Math.random() * 0.5
                );
                
                cloudGroup.add(puff);
            }
            
            cloudGroup.position.set(
                (Math.random() - 0.5) * 100,
                25 + Math.random() * 20,
                (Math.random() - 0.5) * 100
            );
            
            cloudGroup.userData.speed = 0.01 + Math.random() * 0.02;
            cloudGroup.userData.originalX = cloudGroup.position.x;
            
            this.scene.add(cloudGroup);
            this.clouds.push(cloudGroup);
        }
    }

    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed;
            if (cloud.position.x > 60) {
                cloud.position.x = -60;
            }
        });
    }

    createWater() {
        const waterGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
        
        this.waterReflector = new Reflector(waterGeometry, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x88ccff
        });
        this.waterReflector.rotation.x = -Math.PI / 2;
        this.waterReflector.position.y = -15;
        this.scene.add(this.waterReflector);
        
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x4da6ff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.3,
            side: THREE.DoubleSide
        });
        
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -15;
        this.water.receiveShadow = true;
        this.scene.add(this.water);
        
        this.waterBasePositions = waterGeometry.attributes.position.array.slice();
    }

    updateWater(time) {
        if (!this.water) return;
        
        const positions = this.water.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = this.waterBasePositions[i];
            const y = this.waterBasePositions[i + 1];
            positions[i + 2] = y + Math.sin(x * 0.1 + time * 0.001) * 0.2;
        }
        
        this.water.geometry.attributes.position.needsUpdate = true;
    }

    setDayMode() {
        this.isNightMode = false;
        this.ambientLight.intensity = 0.6;
        this.sunLight.intensity = 1;
        this.moonLight.visible = false;
        
        this.houseLights.forEach(({ light, windowMaterial }) => {
            light.intensity = 0;
            windowMaterial.emissiveIntensity = 0;
        });
        
        if (this.fireflies) {
            this.fireflies.material.opacity = 0.4;
        }
        
        if (this.bloomPass) {
            this.bloomPass.strength = 0.3;
        }
        
        if (this.currentBackground === 'sky') {
            this.scene.background = new THREE.Color(0x87CEEB);
            this.scene.fog.color = new THREE.Color(0x87CEEB);
        }
    }

    setNightMode() {
        this.isNightMode = true;
        this.ambientLight.intensity = 0.2;
        this.sunLight.intensity = 0.2;
        this.moonLight.visible = true;
        
        this.houseLights.forEach(({ light, windowMaterial }) => {
            light.intensity = 2;
            windowMaterial.emissiveIntensity = 0.8;
        });
        
        if (this.fireflies) {
            this.fireflies.material.opacity = 1;
        }
        
        if (this.bloomPass) {
            this.bloomPass.strength = 1.2;
        }
        
        if (this.currentBackground === 'sky') {
            this.scene.background = new THREE.Color(0x0a0a20);
            this.scene.fog.color = new THREE.Color(0x0a0a20);
        }
    }

    setBackground(type) {
        this.currentBackground = type;
        
        document.querySelectorAll('.bg-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`bg-${type}`).classList.add('active');
        
        switch (type) {
            case 'sky':
                if (this.isNightMode) {
                    this.scene.background = new THREE.Color(0x0a0a20);
                    this.scene.fog.color = new THREE.Color(0x0a0a20);
                } else {
                    this.scene.background = new THREE.Color(0x87CEEB);
                    this.scene.fog.color = new THREE.Color(0x87CEEB);
                }
                break;
            case 'sunset':
                this.scene.background = new THREE.Color(0xff7f50);
                this.scene.fog.color = new THREE.Color(0xff7f50);
                this.sunLight.color.setHex(0xffaa77);
                this.ambientLight.color.setHex(0xffddaa);
                break;
            case 'night':
                this.scene.background = new THREE.Color(0x0a0a20);
                this.scene.fog.color = new THREE.Color(0x0a0a20);
                this.createStars();
                break;
        }
        
        if (type !== 'sunset') {
            this.sunLight.color.setHex(0xffffff);
            this.ambientLight.color.setHex(0xffffff);
        }
    }

    createStars() {
        if (this.stars) return;
        
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 150;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }

    toggleAutoFly() {
        this.autoFly = !this.autoFly;
        const btn = document.getElementById('btn-auto-fly');
        btn.textContent = this.autoFly ? '停止环绕' : '自动环绕';
        
        if (this.autoFly) {
            this.controls.enabled = false;
        } else {
            this.controls.enabled = true;
        }
    }

    updateAutoFly() {
        if (!this.autoFly) return;
        
        this.autoFlyAngle += 0.003;
        
        const radius = 35;
        const x = Math.cos(this.autoFlyAngle) * radius;
        const z = Math.sin(this.autoFlyAngle) * radius;
        const y = 20;
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 5, 0);
    }

    takeScreenshot() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        const link = document.createElement('a');
        link.download = `floating-islands-${Date.now()}.png`;
        link.href = this.renderer.domElement.toDataURL('image/png');
        link.click();
    }

    updateFireflyCount(count) {
        this.fireflyCount = count;
        this.scene.remove(this.fireflies);
        this.fireflies = null;
        this.createFireflies();
        
        if (this.isNightMode) {
            this.fireflies.material.opacity = 1;
        } else {
            this.fireflies.material.opacity = 0.4;
        }
    }

    updateFPS() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            const fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastTime));
            document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.composer) {
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        document.getElementById('btn-day').addEventListener('click', () => this.setDayMode());
        document.getElementById('btn-night').addEventListener('click', () => this.setNightMode());
        document.getElementById('btn-auto-fly').addEventListener('click', () => this.toggleAutoFly());
        document.getElementById('btn-screenshot').addEventListener('click', () => this.takeScreenshot());
        
        document.getElementById('bg-sky').addEventListener('click', () => this.setBackground('sky'));
        document.getElementById('bg-sunset').addEventListener('click', () => this.setBackground('sunset'));
        document.getElementById('bg-night').addEventListener('click', () => this.setBackground('night'));
        
        const slider = document.getElementById('particle-slider');
        const countDisplay = document.getElementById('particle-count');
        slider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            countDisplay.textContent = count;
            this.updateFireflyCount(count);
        });
        
        document.getElementById('show-fps').addEventListener('change', (e) => {
            const fpsCounter = document.getElementById('fps-counter');
            fpsCounter.classList.toggle('hidden', !e.target.checked);
        });
        
        document.getElementById('close-info').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });
        
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
    }

    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const allMeshes = [];
        this.clickableObjects.forEach(obj => {
            if (obj.isMesh) {
                allMeshes.push(obj);
            } else {
                obj.traverse(child => {
                    if (child.isMesh) allMeshes.push(child);
                });
            }
        });
        
        const intersects = this.raycaster.intersectObjects(allMeshes);
        
        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.isIsland) {
                target = target.parent;
            }
            
            if (target && target.userData.isIsland) {
                this.showInfoPanel(target.userData.name, target.userData.description);
            }
        }
    }

    showInfoPanel(title, description) {
        document.getElementById('info-title').textContent = title;
        document.getElementById('info-description').textContent = description;
        document.getElementById('info-panel').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = performance.now();
        
        this.updateFireflies(time);
        this.updateClouds();
        this.updateWater(time);
        this.updateAutoFly();
        this.updateFPS();
        
        this.islands.forEach((island, index) => {
            island.position.y += Math.sin(time * 0.001 + index) * 0.002;
            island.rotation.y += 0.0005;
        });
        
        if (!this.autoFly) {
            this.controls.update();
        }
        
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

const game = new FloatingIslands();
