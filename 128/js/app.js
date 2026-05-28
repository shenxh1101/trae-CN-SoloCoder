THREE.EventDispatcher = function () {};

THREE.EventDispatcher.prototype = {
	constructor: THREE.EventDispatcher,
	addEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) this._listeners = {};
		var listeners = this._listeners;
		if ( listeners[ type ] === undefined ) {
			listeners[ type ] = [];
		}
		if ( listeners[ type ].indexOf( listener ) === - 1 ) {
			listeners[ type ].push( listener );
		}
	},
	hasEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) return false;
		var listeners = this._listeners;
		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1;
	},
	removeEventListener: function ( type, listener ) {
		if ( this._listeners === undefined ) return;
		var listeners = this._listeners;
		var listenerArray = listeners[ type ];
		if ( listenerArray !== undefined ) {
			var index = listenerArray.indexOf( listener );
			if ( index !== - 1 ) {
				listenerArray.splice( index, 1 );
			}
		}
	},
	dispatchEvent: function ( event ) {
		if ( this._listeners === undefined ) return;
		var listeners = this._listeners;
		var listenerArray = listeners[ event.type ];
		if ( listenerArray !== undefined ) {
			event.target = this;
			var array = [], i = 0;
			var length = listenerArray.length;
			for ( i = 0; i < length; i ++ ) {
				array[ i ] = listenerArray[ i ];
			}
			for ( i = 0; i < length; i ++ ) {
				array[ i ].call( this, event );
			}
		}
	}
};

THREE.OrbitControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = domElement;
	this.enabled = true;
	this.target = new THREE.Vector3();
	this.enableDamping = false;
	this.dampingFactor = 0.05;
	this.enableZoom = true;
	this.zoomSpeed = 1.0;
	this.enableRotate = true;
	this.rotateSpeed = 1.0;
	this.enablePan = true;
	this.keyPanSpeed = 7.0;
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0;
	this.minDistance = 0;
	this.maxDistance = Infinity;
	this.minPolarAngle = 0;
	this.maxPolarAngle = Math.PI;
	this.minAzimuthAngle = - Infinity;
	this.maxAzimuthAngle = Infinity;

	var scope = this;
	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };
	var STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };
	this.state = STATE.NONE;
	var EPS = 0.000001;
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();
	var scale = 1;
	var panOffset = new THREE.Vector3();
	var zoomChanged = false;
	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();
	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	this.rotateLeft = function ( angle ) {
		sphericalDelta.theta -= angle;
	};

	this.rotateUp = function ( angle ) {
		sphericalDelta.phi -= angle;
	};

	var panLeft = function () {
		var v = new THREE.Vector3();
		return function panLeft( distance, objectMatrix ) {
			v.setFromMatrixColumn( objectMatrix, 0 );
			v.multiplyScalar( - distance );
			panOffset.add( v );
		};
	}();

	var panUp = function () {
		var v = new THREE.Vector3();
		return function panUp( distance, objectMatrix ) {
			v.setFromMatrixColumn( objectMatrix, 1 );
			v.multiplyScalar( distance );
			panOffset.add( v );
		};
	}();

	var pan = function ( deltaX, deltaY ) {
		var element = scope.domElement;
		if ( scope.object.isPerspectiveCamera ) {
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );
			panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
			panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
		} else if ( scope.object.isOrthographicCamera ) {
			panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
			panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );
		} else {
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
			scope.enablePan = false;
		}
	};

	this.dollyIn = function ( dollyScale ) {
		if ( dollyScale === undefined ) {
			dollyScale = Math.pow( 0.95, scope.zoomSpeed );
		}
		scale /= dollyScale;
	};

	this.dollyOut = function ( dollyScale ) {
		if ( dollyScale === undefined ) {
			dollyScale = Math.pow( 0.95, scope.zoomSpeed );
		}
		scale *= dollyScale;
	};

	this.update = function () {
		var offset = new THREE.Vector3();
		var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().inverse();
		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();

		var position = scope.object.position;
		offset.copy( position ).sub( scope.target );
		offset.applyQuaternion( quat );
		spherical.setFromVector3( offset );

		if ( scope.autoRotate && scope.state === STATE.NONE ) {
			scope.rotateLeft( getAutoRotationAngle() );
		}

		if ( zoomChanged ) {
			spherical.radius *= scale;
			zoomChanged = false;
		}

		spherical.theta += sphericalDelta.theta;
		spherical.phi += sphericalDelta.phi;

		spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );
		spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );
		spherical.phi = Math.max( EPS, Math.min( Math.PI - EPS, spherical.phi ) );
		spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

		scope.target.add( panOffset );
		offset.setFromSpherical( spherical );
		offset.applyQuaternion( quatInverse );
		position.copy( scope.target ).add( offset );
		scope.object.lookAt( scope.target );

		if ( scope.enableDamping === true ) {
			sphericalDelta.theta *= ( 1 - scope.dampingFactor );
			sphericalDelta.phi *= ( 1 - scope.dampingFactor );
			panOffset.multiplyScalar( 1 - scope.dampingFactor );
		} else {
			sphericalDelta.set( 0, 0, 0 );
			panOffset.set( 0, 0, 0 );
		}

		scale = 1;

		if ( lastPosition.distanceToSquared( scope.object.position ) > EPS || 8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {
			scope.dispatchEvent( changeEvent );
			lastPosition.copy( scope.object.position );
			lastQuaternion.copy( scope.object.quaternion );
		}
	};

	this.reset = function () {
		scope.target.set( 0, 0, 0 );
		scope.object.position.set( 0, 0, 10 );
		scope.object.lookAt( scope.target );
		scope.dispatchEvent( changeEvent );
		scope.update();
	};

	function getAutoRotationAngle() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}

	function getZoomScale() {
		return Math.pow( 0.95, scope.zoomSpeed );
	}

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		switch ( event.button ) {
			case 0:
				if ( scope.enableRotate === false ) return;
				rotateStart.set( event.clientX, event.clientY );
				scope.state = STATE.ROTATE;
				break;
			case 1:
				if ( scope.enableZoom === false ) return;
				dollyStart.set( event.clientX, event.clientY );
				scope.state = STATE.DOLLY;
				break;
			case 2:
				if ( scope.enablePan === false ) return;
				panStart.set( event.clientX, event.clientY );
				scope.state = STATE.PAN;
				break;
		}
		if ( scope.state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		var element = scope.domElement;
		switch ( scope.state ) {
			case STATE.ROTATE:
				if ( scope.enableRotate === false ) return;
				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart );
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight * scope.rotateSpeed );
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );
				rotateStart.copy( rotateEnd );
				break;
			case STATE.DOLLY:
				if ( scope.enableZoom === false ) return;
				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );
				if ( dollyDelta.y > 0 ) {
					scope.dollyIn();
				} else if ( dollyDelta.y < 0 ) {
					scope.dollyOut();
				}
				zoomChanged = true;
				dollyStart.copy( dollyEnd );
				break;
			case STATE.PAN:
				if ( scope.enablePan === false ) return;
				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );
				break;
		}
		if ( scope.state !== STATE.NONE ) {
			scope.update();
		}
	}

	function onMouseUp() {
		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		scope.state = STATE.NONE;
	}

	function onMouseWheel( event ) {
		if ( scope.enabled === false || scope.enableZoom === false || ( scope.state !== STATE.NONE && scope.state !== STATE.ROTATE ) ) return;
		event.preventDefault();
		event.stopPropagation();
		scope.dispatchEvent( startEvent );
		if ( event.deltaY < 0 ) {
			scope.dollyOut( getZoomScale() );
		} else if ( event.deltaY > 0 ) {
			scope.dollyIn( getZoomScale() );
		}
		zoomChanged = true;
		scope.update();
		scope.dispatchEvent( endEvent );
	}

	function onTouchStart( event ) {
		if ( scope.enabled === false ) return;
		switch ( event.touches.length ) {
			case 1:
				if ( scope.enableRotate === false ) return;
				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				scope.state = STATE.TOUCH_ROTATE;
				break;
			case 2:
				if ( scope.enableZoom === false && scope.enablePan === false ) return;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				panStart.set( x, y );
				scope.state = STATE.TOUCH_DOLLY_PAN;
				break;
			default:
				scope.state = STATE.NONE;
		}
		if ( scope.state !== STATE.NONE ) {
			scope.dispatchEvent( startEvent );
		}
	}

	function onTouchMove( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		event.stopPropagation();
		var element = scope.domElement;
		switch ( event.touches.length ) {
			case 1:
				if ( scope.enableRotate === false ) return;
				if ( scope.state !== STATE.TOUCH_ROTATE ) return;
				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight * scope.rotateSpeed );
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );
				rotateStart.copy( rotateEnd );
				scope.update();
				break;
			case 2:
				if ( scope.enableZoom === false && scope.enablePan === false ) return;
				if ( scope.state !== STATE.TOUCH_DOLLY_PAN ) return;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );
				if ( dollyDelta.y > 0 ) {
					scope.dollyOut();
				} else if ( dollyDelta.y < 0 ) {
					scope.dollyIn();
				}
				zoomChanged = true;
				dollyStart.copy( dollyEnd );
				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				panEnd.set( x, y );
				panDelta.subVectors( panEnd, panStart );
				pan( panDelta.x, panDelta.y );
				panStart.copy( panEnd );
				scope.update();
				break;
			default:
				scope.state = STATE.NONE;
		}
	}

	function onTouchEnd() {
		scope.dispatchEvent( endEvent );
		scope.state = STATE.NONE;
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'wheel', onMouseWheel, false );
	this.domElement.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	this.domElement.addEventListener( 'touchmove', onTouchMove, { passive: false } );
	this.domElement.addEventListener( 'touchend', onTouchEnd, false );

	this.update();
};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

class GeometryMuseum {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.geometryObjects = [];
        this.pedestals = [];
        this.spotlights = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.config = {
            rotationSpeed: 0.005,
            pedestalHue: 210,
            materialType: 'metal',
            backgroundType: 'exhibition',
            autoTourActive: false,
            autoTourIndex: 0,
            autoTourDuration: 3000
        };
        
        this.autoTourTimer = null;
        this.autoTourStartTime = 0;
        this.cameraStartPosition = new THREE.Vector3();
        this.cameraEndPosition = new THREE.Vector3();
        this.cameraStartLookAt = new THREE.Vector3();
        this.cameraEndLookAt = new THREE.Vector3();
        this.isAnimatingCamera = false;
        this.cameraAnimationProgress = 0;
        
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.reflector = null;
        this.reflectionRenderTarget = null;
        this.reflectionCamera = null;
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLights();
        this.createGround();
        this.createGeometries();
        this.setupEventListeners();
        this.animate();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.setBackground('exhibition');
    }
    
    setBackground(type) {
        this.config.backgroundType = type;
        switch(type) {
            case 'black':
                this.scene.background = new THREE.Color(0x000000);
                break;
            case 'darkblue':
                this.scene.background = new THREE.Color(0x0a1628);
                break;
            case 'exhibition':
                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(0.5, '#16213e');
                gradient.addColorStop(1, '#0f0f23');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 2, 512);
                const texture = new THREE.CanvasTexture(canvas);
                this.scene.background = texture;
                break;
        }
    }
    
    setupCamera() {
        const container = document.getElementById('scene-container');
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 12);
        this.cameraStartPosition.copy(this.camera.position.clone());
        this.cameraEndPosition.copy(this.camera.position.clone());
        this.cameraStartLookAt.set(0, 0, 0);
        this.cameraEndLookAt.set(0, 0, 0);
    }
    
    setupRenderer() {
        const container = document.getElementById('scene-container');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        container.appendChild(this.renderer.domElement);
    }
    
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
    }
    
    createGround() {
        this.reflectionRenderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth * window.devicePixelRatio,
            window.innerHeight * window.devicePixelRatio
        );
        
        this.reflectionCamera = new THREE.PerspectiveCamera();
        this.reflectionCamera.aspect = this.camera.aspect;
        
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        
        const mirrorUniforms = {
            "mirrorColor": { value: new THREE.Color(0x111118) },
            "mirrorSampler": { value: this.reflectionRenderTarget.texture },
            "baseColor": { value: new THREE.Color(0x0a0a12) },
            "reflectivity": { value: 0.6 }
        };
        
        const mirrorShader = {
            uniforms: mirrorUniforms,
            vertexShader: `
                varying vec4 vUv;
                void main() {
                    vUv = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_Position = vUv;
                }
            `,
            fragmentShader: `
                uniform vec3 mirrorColor;
                uniform sampler2D mirrorSampler;
                uniform vec3 baseColor;
                uniform float reflectivity;
                varying vec4 vUv;
                void main() {
                    vec2 uv = vUv.xy / vUv.w;
                    uv = uv * 0.5 + 0.5;
                    vec4 reflection = texture2D(mirrorSampler, uv);
                    vec3 finalColor = mix(baseColor, reflection.rgb * mirrorColor, reflectivity);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        };
        
        const groundMaterial = new THREE.ShaderMaterial({
            uniforms: mirrorShader.uniforms,
            vertexShader: mirrorShader.vertexShader,
            fragmentShader: mirrorShader.fragmentShader
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.reflector = ground;
        
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x333340,
            transparent: true,
            opacity: 0.3
        });
        
        const gridHelper = new THREE.GridHelper(50, 50, 0x444455, 0x2a2a3a);
        gridHelper.position.y = 0.02;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }
    
    createGeometries() {
        const radius = 7;
        const count = GEOMETRY_DATA.length;
        
        GEOMETRY_DATA.forEach((data, index) => {
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const pedestal = this.createPedestal(x, 0, z, data.color);
            this.pedestals.push(pedestal);
            
            const geometryObject = this.createGeometry(data, x, 1.3, z);
            this.geometryObjects.push(geometryObject);
            
            this.createSpotlight(x, 4, z, data.color);
            
            this.createLabel(data.name, x, 0.05, z);
        });
    }
    
    createPedestal(x, y, z, color) {
        const group = new THREE.Group();
        
        const baseGeometry = new THREE.CylinderGeometry(0.9, 1, 0.15, 48);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(this.config.pedestalHue / 360, 0.5, 0.3),
            roughness: 0.3,
            metalness: 0.7
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        const columnGeometry = new THREE.CylinderGeometry(0.7, 0.85, 0.8, 48);
        const column = new THREE.Mesh(columnGeometry, baseMaterial.clone());
        column.position.y = 0.475;
        column.castShadow = true;
        column.receiveShadow = true;
        group.add(column);
        
        const topGeometry = new THREE.CylinderGeometry(0.95, 0.75, 0.1, 48);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(this.config.pedestalHue / 360, 0.6, 0.4),
            roughness: 0.2,
            metalness: 0.8,
            emissive: new THREE.Color(color).multiplyScalar(0.1)
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.9;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
        
        group.position.set(x, y, z);
        this.scene.add(group);
        
        return group;
    }
    
    createGeometry(data, x, y, z) {
        const geometry = data.createGeometry();
        const material = this.createMaterial(data.color);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { data: data };
        this.scene.add(mesh);
        return mesh;
    }
    
    createMaterial(color) {
        switch(this.config.materialType) {
            case 'metal':
                return new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.2,
                    metalness: 0.8,
                    envMapIntensity: 1
                });
            case 'plastic':
                return new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.5,
                    metalness: 0.1
                });
            case 'wireframe':
                return new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: true
                });
            default:
                return new THREE.MeshStandardMaterial({ color: color });
        }
    }
    
    createSpotlight(x, y, z, color) {
        const spotlight = new THREE.SpotLight(color, 1, 10, Math.PI / 6, 0.5, 1);
        spotlight.position.set(x, y, z);
        spotlight.target.position.set(x, 0.5, z);
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 512;
        spotlight.shadow.mapSize.height = 512;
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);
        this.spotlights.push(spotlight);
        
        const pointLight = new THREE.PointLight(color, 0.5, 2);
        pointLight.position.set(x, y - 0.5, z);
        this.scene.add(pointLight);
    }
    
    createLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 256, 64);
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 254, 62);
        
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#00d4ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(1.5, 0.4, 1);
        this.scene.add(sprite);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        
        document.getElementById('material-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-material]');
            if (btn) {
                const type = btn.dataset.material;
                this.setMaterialType(type);
                this.updateButtonState('#material-buttons', btn);
            }
        });
        
        document.getElementById('background-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-bg]');
            if (btn) {
                const type = btn.dataset.bg;
                this.setBackground(type);
                this.updateButtonState('#background-buttons', btn);
            }
        });
        
        document.getElementById('hue-slider').addEventListener('input', (e) => {
            const hue = parseInt(e.target.value);
            this.setPedestalHue(hue);
            document.getElementById('hue-value').textContent = hue + '°';
        });
        
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.config.rotationSpeed = 0.005 * speed;
            document.getElementById('speed-value').textContent = speed.toFixed(1) + 'x';
        });
        
        document.getElementById('screenshot-btn').addEventListener('click', () => this.takeScreenshot());
        
        document.getElementById('autotour-btn').addEventListener('click', () => this.startAutoTour());
        
        document.getElementById('stop-tour').addEventListener('click', () => this.stopAutoTour());
        
        document.getElementById('reset-btn').addEventListener('click', () => this.resetCamera());
        
        document.getElementById('close-info').addEventListener('click', () => this.closeInfoPanel());
        
        document.getElementById('info-panel').addEventListener('click', (e) => {
            if (e.target.id === 'info-panel') {
                this.closeInfoPanel();
            }
        });
    }
    
    updateButtonState(selector, activeBtn) {
        document.querySelectorAll(selector + ' .control-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    onWindowResize() {
        const container = document.getElementById('scene-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
        this.mouse.y = - (event.clientY - rect.top) / rect.height * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.geometryObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            this.focusOnGeometry(object);
        }
    }
    
    focusOnGeometry(object) {
        const data = object.userData.data;
        if (!data) return;
        
        this.cameraStartPosition.copy(this.camera.position.clone());
        this.cameraStartLookAt.copy(this.controls.target.clone());
        
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, object.position);
        direction.normalize();
        
        const targetPos = object.position.clone().add(direction.multiplyScalar(4));
        targetPos.y += 1;
        
        this.cameraEndPosition.copy(targetPos);
        this.cameraEndLookAt.copy(object.position);
        
        this.isAnimatingCamera = true;
        this.cameraAnimationProgress = 0;
        
        this.showInfoPanel(data);
        
        if (this.config.autoTourActive) {
            clearTimeout(this.autoTourTimer);
        }
    }
    
    showInfoPanel(data) {
        document.getElementById('geo-name').textContent = data.name;
        document.getElementById('geo-name-en').textContent = data.nameEn;
        document.getElementById('geo-faces').textContent = data.faces.toLocaleString();
        document.getElementById('geo-vertices').textContent = data.vertices.toLocaleString();
        document.getElementById('geo-formula').textContent = data.volumeFormula;
        
        document.getElementById('info-panel').classList.add('show');
    }
    
    closeInfoPanel() {
        document.getElementById('info-panel').classList.remove('show');
    }
    
    setMaterialType(type) {
        this.config.materialType = type;
        this.geometryObjects.forEach((mesh, index) => {
            const data = GEOMETRY_DATA[index];
            mesh.material.dispose();
            mesh.material = this.createMaterial(data.color);
        });
    }
    
    setPedestalHue(hue) {
        this.config.pedestalHue = hue;
        this.pedestals.forEach(pedestal => {
            pedestal.children.forEach(child => {
                if (child.material) {
                    child.material.color.setHSL(hue / 360, child === pedestal.children[2] ? 0.6 : 0.5, child === pedestal.children[2] ? 0.4 : 0.3);
                }
            });
        });
    }
    
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'geometry-museum-' + Date.now() + '.png';
        link.href = dataURL;
        link.click();
    }
    
    startAutoTour() {
        this.config.autoTourActive = true;
        this.config.autoTourIndex = 0;
        document.getElementById('autotour-indicator').classList.add('show');
        this.autoTourNext();
    }
    
    autoTourNext() {
        if (!this.config.autoTourActive) return;
        
        if (this.config.autoTourIndex >= this.geometryObjects.length) {
            this.config.autoTourIndex = 0;
        }
        
        const object = this.geometryObjects[this.config.autoTourIndex];
        this.focusOnGeometryAuto(object);
        
        this.autoTourStartTime = Date.now();
        this.config.autoTourIndex++;
        
        this.autoTourTimer = setTimeout(() => {
            if (this.config.autoTourActive) this.autoTourNext();
        }, this.config.autoTourDuration);
    }
    
    focusOnGeometryAuto(object) {
        const data = object.userData.data;
        if (!data) return;
        
        this.cameraStartPosition.copy(this.camera.position.clone());
        this.cameraStartLookAt.copy(this.controls.target.clone());
        
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, object.position);
        direction.normalize();
        
        const targetPos = object.position.clone().add(direction.multiplyScalar(4));
        targetPos.y += 1;
        
        this.cameraEndPosition.copy(targetPos);
        this.cameraEndLookAt.copy(object.position);
        
        this.isAnimatingCamera = true;
        this.cameraAnimationProgress = 0;
        
        this.showInfoPanel(data);
    }
    
    stopAutoTour() {
        this.config.autoTourActive = false;
        if (this.autoTourTimer) {
            clearTimeout(this.autoTourTimer);
        }
        document.getElementById('autotour-indicator').classList.remove('show');
        this.closeInfoPanel();
    }
    
    resetCamera() {
        this.cameraStartPosition.copy(this.camera.position.clone());
        this.cameraStartLookAt.copy(this.controls.target.clone());
        this.cameraEndPosition.set(0, 8, 12);
        this.cameraEndLookAt.set(0, 0, 0);
        this.isAnimatingCamera = true;
        this.cameraAnimationProgress = 0;
        this.closeInfoPanel();
        this.stopAutoTour();
    }
    
    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (now - this.lastTime));
            document.getElementById('fps-value').textContent = this.fps;
            this.frameCount = 0;
            this.lastTime = now;
        }
    }
    
    updateReflection() {
        if (!this.reflector || !this.reflectionCamera || !this.reflectionRenderTarget) return;
        
        const normal = new THREE.Vector3(0, 1, 0);
        const reflectorWorldPosition = new THREE.Vector3();
        const cameraWorldPosition = new THREE.Vector3();
        const view = new THREE.Vector3();
        const target = new THREE.Vector3();
        
        reflectorWorldPosition.setFromMatrixPosition(this.reflector.matrixWorld);
        cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
        
        view.subVectors(cameraWorldPosition, reflectorWorldPosition);
        view.y *= -1;
        view.add(reflectorWorldPosition);
        
        this.reflectionCamera.position.copy(view);
        this.reflectionCamera.up.set(0, -1, 0);
        
        const lookTarget = this.controls.target.clone();
        lookTarget.y *= -1;
        this.reflectionCamera.lookAt(lookTarget);
        
        this.reflectionCamera.far = this.camera.far;
        this.reflectionCamera.near = this.camera.near;
        this.reflectionCamera.fov = this.camera.fov;
        this.reflectionCamera.aspect = this.camera.aspect;
        this.reflectionCamera.updateProjectionMatrix();
        
        const currentRenderTarget = this.renderer.getRenderTarget();
        this.reflector.visible = false;
        
        const originalBackground = this.scene.background;
        this.scene.background = null;
        
        this.renderer.setRenderTarget(this.reflectionRenderTarget);
        this.renderer.clear();
        this.renderer.render(this.scene, this.reflectionCamera);
        
        this.scene.background = originalBackground;
        this.renderer.setRenderTarget(currentRenderTarget);
        this.reflector.visible = true;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateFPS();
        
        this.geometryObjects.forEach(mesh => {
            mesh.rotation.y += this.config.rotationSpeed;
            mesh.rotation.x += this.config.rotationSpeed * 0.3;
        });
        
        if (this.isAnimatingCamera) {
            this.cameraAnimationProgress += 0.025;
            if (this.cameraAnimationProgress >= 1) {
                this.cameraAnimationProgress = 1;
                this.isAnimatingCamera = false;
                this.camera.position.copy(this.cameraEndPosition);
                this.controls.target.copy(this.cameraEndLookAt);
            } else {
                const t = this.easeInOutCubic(this.cameraAnimationProgress);
                this.camera.position.lerpVectors(this.cameraStartPosition, this.cameraEndPosition, t);
                this.controls.target.lerpVectors(this.cameraStartLookAt, this.cameraEndLookAt, t);
            }
        }
        
        if (this.config.autoTourActive) {
            const elapsed = Date.now() - this.autoTourStartTime;
            const progress = Math.min(elapsed / this.config.autoTourDuration, 1) * 100;
            document.getElementById('tour-progress-bar').style.width = progress + '%';
        }
        
        if (!this.isAnimatingCamera) {
            this.controls.update();
        }
        
        this.updateReflection();
        
        this.renderer.render(this.scene, this.camera);
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeometryMuseum();
});
