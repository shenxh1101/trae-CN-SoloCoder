import * as THREE from 'three';

let material = null;

export function createAnimatedMaterial() {
    material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.3,
        wireframe: false,
        side: THREE.DoubleSide
    });

    material.userData = {
        time: 0,
        baseHue: 0.55
    };

    return material;
}

export function getMaterial() {
    return material;
}

export function updateMaterialColor(time) {
    if (!material) return;

    const t = time * 0.3;
    const hue1 = (t) % 1;
    const hue2 = (t + 0.33) % 1;
    const hue3 = (t + 0.67) % 1;

    const color1 = new THREE.Color().setHSL(hue1, 0.8, 0.5);
    const color2 = new THREE.Color().setHSL(hue2, 0.8, 0.5);
    const color3 = new THREE.Color().setHSL(hue3, 0.8, 0.5);

    const finalColor = new THREE.Color();
    finalColor.add(color1).add(color2).add(color3).multiplyScalar(1 / 3);

    material.color.copy(finalColor);
    material.emissive.copy(finalColor).multiplyScalar(0.3);
}

export function setMaterialMetalness(value) {
    if (material) material.metalness = value;
}

export function setMaterialRoughness(value) {
    if (material) material.roughness = value;
}

export function setMaterialWireframe(enabled) {
    if (material) material.wireframe = enabled;
}

export function createMultiMaterials() {
    const materials = [];
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa66bff];

    for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: colors[i],
            metalness: 0.5,
            roughness: 0.3,
            wireframe: false
        });
        mat.userData = { index: i, baseColor: colors[i] };
        materials.push(mat);
    }

    return materials;
}

export function updateMultiMaterialColor(materials, time) {
    materials.forEach((mat, i) => {
        const t = time * 0.3 + i * 0.25;
        const hue = (t) % 1;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        mat.color.copy(color);
        mat.emissive.copy(color).multiplyScalar(0.3);
    });
}

export function setMultiMaterialProperty(materials, property, value) {
    materials.forEach(mat => {
        mat[property] = value;
    });
}