class CubeAlbumApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.cube = null;
        this.cubeEdges = null;
        this.faceMeshes = [];
        this.faceData = [];
        this.starfield = null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredFace = null;
        
        this.rotationSpeed = 0.01;
        this.starfieldEnabled = true;
        this.materialMode = 'standard';
        this.currentModalIndex = 0;
        
        this.initialCameraPosition = new THREE.Vector3(0, 0, 5);
        
        this.faceNames = ['前面', '后面', '左面', '右面', '上面', '下面'];
        
        this.defaultImages = [
            this.generateGradientImage('#ff6b6b', '#ee5a24', '1'),
            this.generateGradientImage('#48dbfb', '#0abde3', '2'),
            this.generateGradientImage('#1dd1a1', '#10ac84', '3'),
            this.generateGradientImage('#feca57', '#ff9f43', '4'),
            this.generateGradientImage('#5f27cd', '#341f97', '5'),
            this.generateGradientImage('#ff9ff3', '#f368e0', '6')
        ];
        
        this.selectedFaceForUpload = 0;
        
        this.init();
    }
    
    generateGradientImage(color1, color2, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 256);
        
        ctx.font = '30px Arial';
        ctx.fillText('3D Cube Album', 256, 350);
        
        return canvas.toDataURL();
    }
    
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLighting();
        this.createStarfield();
        this.createCube();
        this.setupEventListeners();
        this.animate();
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
    }
    
    createCamera() {
        const container = document.getElementById('scene-container');
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.copy(this.initialCameraPosition);
    }
    
    createRenderer() {
        const container = document.getElementById('scene-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    }
    
    createControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 15;
        this.controls.enablePan = false;
    }
    
    createLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight1.position.set(5, 5, 5);
        directionalLight1.castShadow = true;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0x60a5fa, 0.5);
        directionalLight2.position.set(-5, -5, -5);
        this.scene.add(directionalLight2);
        
        const pointLight = new THREE.PointLight(0xa78bfa, 0.5, 20);
        pointLight.position.set(0, 3, 0);
        this.scene.add(pointLight);
    }
    
    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 2000;
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        
        for (let i = 0; i < starsCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;
            positions[i + 1] = (Math.random() - 0.5) * 100;
            positions[i + 2] = (Math.random() - 0.5) * 100;
            
            const color = new THREE.Color();
            color.setHSL(0.6 + Math.random() * 0.2, 0.8, 0.8 + Math.random() * 0.2);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.starfield = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starfield);
    }
    
    createCube() {
        this.cube = new THREE.Group();
        
        const cubeSize = 2;
        const facePositions = [
            { pos: [0, 0, cubeSize / 2], rot: [0, 0, 0] },
            { pos: [0, 0, -cubeSize / 2], rot: [0, Math.PI, 0] },
            { pos: [-cubeSize / 2, 0, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [cubeSize / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },
            { pos: [0, cubeSize / 2, 0], rot: [-Math.PI / 2, 0, 0] },
            { pos: [0, -cubeSize / 2, 0], rot: [Math.PI / 2, 0, 0] }
        ];
        
        const textureLoader = new THREE.TextureLoader();
        
        for (let i = 0; i < 6; i++) {
            const faceGeometry = new THREE.PlaneGeometry(cubeSize * 0.98, cubeSize * 0.98);
            const texture = textureLoader.load(this.defaultImages[i]);
            
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 1,
                metalness: 0.1,
                roughness: 0.5
            });
            
            const faceMesh = new THREE.Mesh(faceGeometry, material);
            faceMesh.position.set(...facePositions[i].pos);
            faceMesh.rotation.set(...facePositions[i].rot);
            faceMesh.userData.faceIndex = i;
            
            this.cube.add(faceMesh);
            this.faceMeshes.push(faceMesh);
            
            this.faceData.push({
                index: i,
                name: this.faceNames[i],
                texture: texture,
                imageData: this.defaultImages[i],
                material: material
            });
        }
        
        const edgesGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.6
        });
        this.cubeEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(edgesGeometry),
            edgesMaterial
        );
        this.cube.add(this.cubeEdges);
        
        this.scene.add(this.cube);
    }
    
    setupEventListeners() {
        const container = document.getElementById('scene-container');
        
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('click', (e) => this.onMouseClick(e));
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent = this.rotationSpeed.toFixed(3);
        });
        
        document.getElementById('star-toggle').addEventListener('change', (e) => {
            this.starfieldEnabled = e.target.checked;
            if (this.starfield) {
                this.starfield.visible = this.starfieldEnabled;
            }
        });
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setMaterialMode(e.target.dataset.mode);
            });
        });
        
        document.getElementById('screenshot-btn').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('reset-view-btn').addEventListener('click', () => this.resetView());
        document.getElementById('download-zip-btn').addEventListener('click', () => this.downloadZip());
        
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('upload-panel').classList.toggle('show');
        });
        
        document.getElementById('close-upload').addEventListener('click', () => {
            document.getElementById('upload-panel').classList.remove('show');
        });
        
        document.querySelectorAll('.face-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedFaceForUpload = parseInt(e.target.dataset.face);
            });
        });
        
        document.querySelector('.face-btn[data-face="0"]').classList.add('active');
        
        document.getElementById('select-file-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));
        
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-prev').addEventListener('click', () => this.navigateModal(-1));
        document.getElementById('modal-next').addEventListener('click', () => this.navigateModal(1));
        
        document.getElementById('image-modal').addEventListener('click', (e) => {
            if (e.target.id === 'image-modal') {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('image-modal');
            if (modal.classList.contains('show')) {
                if (e.key === 'ArrowLeft') this.navigateModal(-1);
                if (e.key === 'ArrowRight') this.navigateModal(1);
                if (e.key === 'Escape') this.closeModal();
            }
        });
    }
    
    onMouseMove(event) {
        const container = document.getElementById('scene-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.faceMeshes);
        
        if (this.hoveredFace !== null && (intersects.length === 0 || intersects[0].object !== this.hoveredFace)) {
            this.resetFaceMaterial(this.hoveredFace);
            this.hoveredFace = null;
            container.style.cursor = 'grab';
        }
        
        if (intersects.length > 0) {
            const face = intersects[0].object;
            if (this.hoveredFace !== face) {
                this.hoveredFace = face;
                this.applyHoverEffect(face);
                container.style.cursor = 'pointer';
            }
        }
    }
    
    onMouseClick(event) {
        if (this.hoveredFace !== null) {
            const faceIndex = this.hoveredFace.userData.faceIndex;
            this.openModal(faceIndex);
        }
    }
    
    applyHoverEffect(faceMesh) {
        const material = faceMesh.material;
        
        if (this.materialMode === 'standard') {
            material.emissive = new THREE.Color(0x60a5fa);
            material.emissiveIntensity = 0.3;
        } else if (this.materialMode === 'transparent') {
            material.opacity = 0.5;
        } else if (this.materialMode === 'wireframe') {
            material.emissive = new THREE.Color(0xa78bfa);
            material.emissiveIntensity = 0.5;
        }
    }
    
    resetFaceMaterial(faceMesh) {
        const material = faceMesh.material;
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
        
        if (this.materialMode === 'transparent') {
            material.opacity = 0.7;
        } else {
            material.opacity = 1;
        }
    }
    
    setMaterialMode(mode) {
        this.materialMode = mode;
        
        this.faceData.forEach((faceData, index) => {
            const material = faceData.material;
            
            material.wireframe = false;
            material.opacity = 1;
            material.transparent = true;
            
            if (mode === 'wireframe') {
                material.wireframe = true;
                material.color = new THREE.Color(0x60a5fa);
            } else if (mode === 'transparent') {
                material.opacity = 0.7;
                material.color = new THREE.Color(0xffffff);
            } else {
                material.color = new THREE.Color(0xffffff);
            }
            
            material.needsUpdate = true;
        });
    }
    
    openModal(faceIndex) {
        this.currentModalIndex = faceIndex;
        this.updateModalImage();
        document.getElementById('image-modal').classList.add('show');
    }
    
    closeModal() {
        document.getElementById('image-modal').classList.remove('show');
    }
    
    navigateModal(direction) {
        this.currentModalIndex = (this.currentModalIndex + direction + 6) % 6;
        this.updateModalImage();
    }
    
    updateModalImage() {
        const faceData = this.faceData[this.currentModalIndex];
        document.getElementById('modal-image').src = faceData.imageData;
        document.getElementById('modal-caption').textContent = faceData.name;
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            const previewArea = document.getElementById('preview-area');
            previewArea.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = imageData;
            previewArea.appendChild(previewImg);
            
            this.updateFaceTexture(this.selectedFaceForUpload, imageData);
        };
        reader.readAsDataURL(file);
    }
    
    updateFaceTexture(faceIndex, imageData) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(imageData, (texture) => {
            const faceData = this.faceData[faceIndex];
            
            if (faceData.texture) {
                faceData.texture.dispose();
            }
            
            faceData.texture = texture;
            faceData.imageData = imageData;
            faceData.material.map = texture;
            faceData.material.needsUpdate = true;
            
            setTimeout(() => {
                document.getElementById('upload-panel').classList.remove('show');
            }, 500);
        });
    }
    
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `cube-album-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }
    
    resetView() {
        this.camera.position.copy(this.initialCameraPosition);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    async downloadZip() {
        const zip = new JSZip();
        
        for (let i = 0; i < this.faceData.length; i++) {
            const faceData = this.faceData[i];
            
            const base64Data = faceData.imageData.split(',')[1];
            const fileName = `${faceData.name.replace(/面$/, '')}.png`;
            
            zip.file(fileName, base64Data, { base64: true });
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `cube-album-${Date.now()}.zip`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }
    
    onWindowResize() {
        const container = document.getElementById('scene-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.cube) {
            this.cube.rotation.y += this.rotationSpeed;
        }
        
        if (this.starfield && this.starfieldEnabled) {
            this.starfield.rotation.y += 0.0002;
            this.starfield.rotation.x += 0.0001;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CubeAlbumApp();
});
