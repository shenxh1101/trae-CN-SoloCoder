const GEOMETRY_DATA = [
    {
        id: 'cube',
        name: '立方体',
        nameEn: 'Cube',
        faces: 6,
        vertices: 8,
        volumeFormula: 'V = a³',
        color: 0x00d4ff,
        createGeometry: () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
        scale: 1
    },
    {
        id: 'sphere',
        name: '球体',
        nameEn: 'Sphere',
        faces: 1024,
        vertices: 515,
        volumeFormula: 'V = 4/3πr³',
        color: 0x7b2fff,
        createGeometry: () => new THREE.SphereGeometry(0.75, 32, 32),
        scale: 1
    },
    {
        id: 'cylinder',
        name: '圆柱体',
        nameEn: 'Cylinder',
        faces: 576,
        vertices: 291,
        volumeFormula: 'V = πr²h',
        color: 0xff2d92,
        createGeometry: () => new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32),
        scale: 1
    },
    {
        id: 'cone',
        name: '圆锥体',
        nameEn: 'Cone',
        faces: 544,
        vertices: 275,
        volumeFormula: 'V = 1/3πr²h',
        color: 0xffd700,
        createGeometry: () => new THREE.ConeGeometry(0.6, 1.2, 32),
        scale: 1
    },
    {
        id: 'torus',
        name: '环面体',
        nameEn: 'Torus',
        faces: 1536,
        vertices: 770,
        volumeFormula: 'V = 2π²Rr²',
        color: 0x00ff88,
        createGeometry: () => new THREE.TorusGeometry(0.55, 0.2, 16, 48),
        scale: 1
    },
    {
        id: 'dodecahedron',
        name: '十二面体',
        nameEn: 'Dodecahedron',
        faces: 12,
        vertices: 20,
        volumeFormula: 'V ≈ 7.663a³',
        color: 0xff6b35,
        createGeometry: () => new THREE.DodecahedronGeometry(0.7),
        scale: 1
    }
];
