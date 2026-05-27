import * as THREE from 'three';

const geometryTypes = {
    box: {
        name: '立方体',
        create: () => new THREE.BoxGeometry(1.5, 1.5, 1.5)
    },
    sphere: {
        name: '球体',
        create: () => new THREE.SphereGeometry(1, 48, 48)
    },
    cylinder: {
        name: '圆柱体',
        create: () => new THREE.CylinderGeometry(0.8, 0.8, 1.8, 48)
    },
    cone: {
        name: '圆锥体',
        create: () => new THREE.ConeGeometry(1, 1.8, 48)
    },
    torus: {
        name: '环面',
        create: () => new THREE.TorusGeometry(1, 0.35, 24, 100)
    }
};

let currentMesh = null;
let currentGeometryType = 'box';
let multiMeshes = [];
let multiMode = false;

export function createGeometry(type) {
    const config = geometryTypes[type];
    if (!config) return null;
    return config.create();
}

export function getGeometryName(type) {
    return geometryTypes[type]?.name || '未知';
}

export function getGeometryTypes() {
    return Object.keys(geometryTypes).map(key => ({
        type: key,
        name: geometryTypes[key].name
    }));
}

export function getCurrentGeometryType() {
    return currentGeometryType;
}

export function setCurrentGeometryType(type) {
    currentGeometryType = type;
}

export function getCurrentMesh() {
    return currentMesh;
}

export function setCurrentMesh(mesh) {
    if (currentMesh) {
        currentMesh.geometry.dispose();
    }
    currentMesh = mesh;
}

export function isMultiMode() {
    return multiMode;
}

export function setMultiMode(enabled) {
    multiMode = enabled;
}

export function getMultiMeshes() {
    return multiMeshes;
}

export function setMultiMeshes(meshes) {
    multiMeshes.forEach(m => {
        if (m.geometry) m.geometry.dispose();
    });
    multiMeshes = meshes;
}

export function getGeometryStats(geometry) {
    const position = geometry.attributes.position;
    const vertices = position ? position.count : 0;
    const faces = geometry.index
        ? geometry.index.count / 3
        : vertices / 3;
    return {
        vertices: vertices,
        faces: Math.floor(faces)
    };
}

export { geometryTypes };