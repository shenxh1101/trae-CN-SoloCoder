import * as THREE from 'three';

let ambientLight = null;
let pointLight = null;
let pointLight2 = null;
let scene = null;

export function initLights(sceneRef) {
    scene = sceneRef;

    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    pointLight = new THREE.PointLight(0x00d4ff, 2, 20);
    pointLight.position.set(5, 5, 5);
    pointLight.castShadow = true;
    scene.add(pointLight);

    pointLight2 = new THREE.PointLight(0xb400ff, 1.5, 20);
    pointLight2.position.set(-5, 3, -5);
    scene.add(pointLight2);

    return { ambientLight, pointLight, pointLight2 };
}

export function setAmbientLightEnabled(enabled) {
    if (ambientLight) ambientLight.visible = enabled;
}

export function setPointLightEnabled(enabled) {
    if (pointLight) pointLight.visible = enabled;
    if (pointLight2) pointLight2.visible = enabled;
}

export function getAmbientLight() {
    return ambientLight;
}

export function getPointLight() {
    return pointLight;
}

export function updateLights(time) {
    if (pointLight) {
        const radius = 5;
        pointLight.position.x = Math.cos(time * 0.5) * radius;
        pointLight.position.z = Math.sin(time * 0.5) * radius;
        pointLight.position.y = 3 + Math.sin(time * 0.3) * 2;
    }
    if (pointLight2) {
        const radius = 6;
        pointLight2.position.x = Math.cos(time * 0.3 + Math.PI) * radius;
        pointLight2.position.z = Math.sin(time * 0.3 + Math.PI) * radius;
        pointLight2.position.y = 2 + Math.sin(time * 0.4 + 1) * 2;
    }
}