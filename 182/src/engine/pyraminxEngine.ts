import {
  Piece,
  Face,
  Move,
  Direction,
  MoveType,
  Facelet,
  FaceletPosition,
  FACE_COLORS,
  TETRAHEDRON_VERTICES,
} from '../types';

const SCALE = 1.5;

function scaleVertex(v: [number, number, number], s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function addVertices(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVertices(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function multiplyVertex(v: [number, number, number], s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dotProduct(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(dotProduct(v, v));
  return [v[0] / len, v[1] / len, v[2] / len];
}

function rotatePointAroundAxis(
  point: [number, number, number],
  axis: [number, number, number],
  angle: number,
  center: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  const p = subtractVertices(point, center);
  const [x, y, z] = p;
  const [ax, ay, az] = normalize(axis);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const oneMinusCos = 1 - cos;

  const newX = (cos + ax * ax * oneMinusCos) * x + (ax * ay * oneMinusCos - az * sin) * y + (ax * az * oneMinusCos + ay * sin) * z;
  const newY = (ay * ax * oneMinusCos + az * sin) * x + (cos + ay * ay * oneMinusCos) * y + (ay * az * oneMinusCos - ax * sin) * z;
  const newZ = (az * ax * oneMinusCos - ay * sin) * x + (az * ay * oneMinusCos + ax * sin) * y + (cos + az * az * oneMinusCos) * z;

  return addVertices([newX, newY, newZ], center);
}

export function getFaceCenter(face: Face): [number, number, number] {
  const v = TETRAHEDRON_VERTICES;
  const faceVertices: { [key in Face]: Face[] } = {
    U: ['U', 'R', 'L'],
    R: ['U', 'R', 'B'],
    L: ['U', 'L', 'B'],
    B: ['R', 'L', 'B'],
  };
  const faces = faceVertices[face];
  const sum = addVertices(
    addVertices(v[faces[0]], v[faces[1]]),
    v[faces[2]]
  );
  return scaleVertex(multiplyVertex(sum, 1 / 3), SCALE);
}

export function getRotationAxis(face: Face): [number, number, number] {
  const oppositeVertex = scaleVertex(TETRAHEDRON_VERTICES[OPPOSITE_VERTEX[face]], SCALE);
  const center = getFaceCenter(face);
  return subtractVertices(center, oppositeVertex);
}

const ADJACENT_FACES: { [key in Face]: [Face, Face, Face] } = {
  U: ['R', 'L', 'B'],
  R: ['U', 'B', 'L'],
  L: ['U', 'R', 'B'],
  B: ['U', 'L', 'R'],
};

const OPPOSITE_VERTEX: { [key in Face]: Face } = {
  U: 'B',
  R: 'L',
  L: 'R',
  B: 'U',
};

const FACE_TIP_POSITIONS: { [key in Face]: { [key in Face]?: number } } = {
  U: { U: 0, R: 1, L: 2 },
  R: { R: 0, U: 1, B: 2 },
  L: { L: 0, U: 1, B: 2 },
  B: { B: 0, R: 1, L: 2 },
};

const TIP_VISIBLE_FACES: { [key in Face]: Face[] } = {
  U: ['U', 'R', 'L'],
  R: ['R', 'U', 'B'],
  L: ['L', 'U', 'B'],
  B: ['B', 'R', 'L'],
};

const EDGES: { key: string; faces: [Face, Face] }[] = [
  { key: 'U-R', faces: ['U', 'R'] },
  { key: 'U-L', faces: ['U', 'L'] },
  { key: 'U-B', faces: ['U', 'B'] },
  { key: 'R-L', faces: ['R', 'L'] },
  { key: 'R-B', faces: ['R', 'B'] },
  { key: 'L-B', faces: ['L', 'B'] },
];

const FACE_EDGE_POSITIONS: { [key in Face]: { [key: string]: number } } = {
  U: { 'U-R': 3, 'U-L': 4, 'U-B': 5 },
  R: { 'U-R': 3, 'R-L': 4, 'R-B': 5 },
  L: { 'U-L': 3, 'R-L': 4, 'L-B': 5 },
  B: { 'U-B': 3, 'R-B': 4, 'L-B': 5 },
};

export function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];
  const v = TETRAHEDRON_VERTICES;
  let pieceId = 0;

  const faces: Face[] = ['U', 'R', 'L', 'B'];

  faces.forEach(tipFace => {
    const tipPos = scaleVertex(v[tipFace], SCALE);
    const visibleFaces = TIP_VISIBLE_FACES[tipFace];
    
    const facelets: Facelet[] = visibleFaces.map(face => ({
      face,
      position: FACE_TIP_POSITIONS[face][tipFace]! as FaceletPosition,
      color: FACE_COLORS[tipFace],
    }));

    pieces.push({
      id: `tip-${pieceId++}`,
      type: 'tip',
      position: [...tipPos] as [number, number, number],
      rotation: [0, 0, 0],
      facelets: [...facelets],
      homePosition: [...tipPos] as [number, number, number],
      homeFacelets: JSON.parse(JSON.stringify(facelets)),
    });
  });

  EDGES.forEach(edge => {
    const pos = scaleVertex(
      multiplyVertex(addVertices(v[edge.faces[0]], v[edge.faces[1]]), 0.5),
      SCALE
    );
    
    const facelets: Facelet[] = edge.faces.map(face => ({
      face,
      position: FACE_EDGE_POSITIONS[face][edge.key] as FaceletPosition,
      color: FACE_COLORS[face],
    }));

    pieces.push({
      id: `edge-${pieceId++}`,
      type: 'edge',
      position: [...pos] as [number, number, number],
      rotation: [0, 0, 0],
      facelets: [...facelets],
      homePosition: [...pos] as [number, number, number],
      homeFacelets: JSON.parse(JSON.stringify(facelets)),
    });
  });

  faces.forEach(centerFace => {
    const pos = getFaceCenter(centerFace);
    
    const facelets: Facelet[] = [
      { face: centerFace, position: 6 as FaceletPosition, color: FACE_COLORS[centerFace] },
      { face: centerFace, position: 7 as FaceletPosition, color: FACE_COLORS[centerFace] },
      { face: centerFace, position: 8 as FaceletPosition, color: FACE_COLORS[centerFace] },
    ];

    pieces.push({
      id: `center-${pieceId++}`,
      type: 'center',
      position: [...pos] as [number, number, number],
      rotation: [0, 0, 0],
      facelets: [...facelets],
      homePosition: [...pos] as [number, number, number],
      homeFacelets: JSON.parse(JSON.stringify(facelets)),
    });
  });

  return pieces;
}

function getPieceDistanceAlongAxis(
  piecePos: [number, number, number],
  axisStart: [number, number, number],
  axisDir: [number, number, number]
): number {
  const v = subtractVertices(piecePos, axisStart);
  const axisNormalized = normalize(axisDir);
  return dotProduct(v, axisNormalized);
}

function shouldPieceRotate(
  piece: Piece,
  face: Face,
  type: MoveType,
  axisStart: [number, number, number],
  axisDir: [number, number, number]
): boolean {
  if (type === 'tip') {
    if (piece.type !== 'tip') return false;
    const faceVertex = scaleVertex(TETRAHEDRON_VERTICES[face], SCALE);
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - faceVertex[0], 2) +
      Math.pow(piece.position[1] - faceVertex[1], 2) +
      Math.pow(piece.position[2] - faceVertex[2], 2)
    );
    return posDist < 0.01;
  }
  
  const faceVertex = scaleVertex(TETRAHEDRON_VERTICES[face], SCALE);
  const dist = getPieceDistanceAlongAxis(piece.position, axisStart, axisDir);
  const totalLength = getPieceDistanceAlongAxis(faceVertex, axisStart, axisDir);

  if (type === 'middle') {
    return piece.type === 'edge' || (piece.type === 'center' && dist <= totalLength * 0.5);
  } else {
    const oppositeVertex = OPPOSITE_VERTEX[face];
    const oppositePos = scaleVertex(TETRAHEDRON_VERTICES[oppositeVertex], SCALE);
    if (piece.type === 'tip') {
      const tipDist = Math.sqrt(
        Math.pow(piece.position[0] - oppositePos[0], 2) +
        Math.pow(piece.position[1] - oppositePos[1], 2) +
        Math.pow(piece.position[2] - oppositePos[2], 2)
      );
      if (tipDist < 0.01) {
        return false;
      }
    }
    return true;
  }
}

function getFacePermutation(
  movingFace: Face,
  direction: Direction
): Map<Face, Face> {
  const adj = ADJACENT_FACES[movingFace];
  const permutation = new Map<Face, Face>();

  permutation.set(movingFace, movingFace);

  if (direction === 'clockwise') {
    permutation.set(adj[0], adj[2]);
    permutation.set(adj[1], adj[0]);
    permutation.set(adj[2], adj[1]);
  } else {
    permutation.set(adj[0], adj[1]);
    permutation.set(adj[1], adj[2]);
    permutation.set(adj[2], adj[0]);
  }

  return permutation;
}

function rotateFacelets(
  facelets: Facelet[],
  movingFace: Face,
  direction: Direction,
  type: MoveType
): Facelet[] {
  let facePermutation: Map<Face, Face>;
  if (type === 'tip') {
    facePermutation = getFacePermutation(movingFace, direction === 'clockwise' ? 'counterclockwise' : 'clockwise');
  } else {
    facePermutation = getFacePermutation(movingFace, direction);
  }
  
  return facelets.map(facelet => {
    const newFace = facePermutation.get(facelet.face);
    if (newFace) {
      return {
        ...facelet,
        face: newFace,
      };
    }
    return facelet;
  });
}

export function applyMove(
  pieces: Piece[],
  face: Face,
  direction: Direction,
  type: MoveType
): Piece[] {
  const TWELVE_DEG = 2 * Math.PI / 3;
  const angle = direction === 'clockwise' ? -TWELVE_DEG : TWELVE_DEG;
  
  let axisStart: [number, number, number];
  let axisDir: [number, number, number];
  
  if (type === 'tip') {
    axisStart = scaleVertex(TETRAHEDRON_VERTICES[face], SCALE);
    const oppositeVertex = scaleVertex(TETRAHEDRON_VERTICES[OPPOSITE_VERTEX[face]], SCALE);
    axisDir = subtractVertices(oppositeVertex, axisStart);
  } else {
    axisStart = scaleVertex(TETRAHEDRON_VERTICES[OPPOSITE_VERTEX[face]], SCALE);
    axisDir = getRotationAxis(face);
  }
  
  return pieces.map(piece => {
    if (!shouldPieceRotate(piece, face, type, axisStart, axisDir)) {
      return piece;
    }
    
    const newPosition = rotatePointAroundAxis(piece.position, axisDir, angle, axisStart);
    const newFacelets = rotateFacelets(piece.facelets, face, direction, type);
    
    return {
      ...piece,
      position: newPosition as [number, number, number],
      facelets: newFacelets,
    };
  });
}

export function shufflePieces(pieces: Piece[], moves: number = 20): { pieces: Piece[]; moves: Move[] } {
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const moveTypes: MoveType[] = ['tip', 'middle', 'face'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  let currentPieces = JSON.parse(JSON.stringify(pieces));
  const moveList: Move[] = [];
  
  for (let i = 0; i < moves; i++) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    const type = moveTypes[Math.floor(Math.random() * moveTypes.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    currentPieces = applyMove(currentPieces, face, direction, type);
    moveList.push({ face, direction, type });
  }
  
  return { pieces: currentPieces, moves: moveList };
}

export function checkSolved(pieces: Piece[]): boolean {
  for (const piece of pieces) {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    if (posDist > 0.01) {
      return false;
    }
    
    if (piece.facelets.length !== piece.homeFacelets.length) {
      return false;
    }
    
    for (const current of piece.facelets) {
      const home = piece.homeFacelets.find(f => f.face === current.face);
      if (!home || current.color !== home.color) {
        return false;
      }
    }
  }
  
  return true;
}

export function countCorrectTips(pieces: Piece[]): number {
  return pieces.filter(p => p.type === 'tip').filter(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    if (posDist > 0.01) return false;
    for (const current of piece.facelets) {
      const home = piece.homeFacelets.find(f => f.face === current.face);
      if (!home || current.color !== home.color) {
        return false;
      }
    }
    return true;
  }).length;
}

export function countCorrectEdges(pieces: Piece[]): number {
  return pieces.filter(p => p.type === 'edge').filter(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    if (posDist > 0.01) return false;
    for (const current of piece.facelets) {
      const home = piece.homeFacelets.find(f => f.face === current.face);
      if (!home || current.color !== home.color) {
        return false;
      }
    }
    return true;
  }).length;
}

export function isTipPositionSolved(pieces: Piece[]): boolean {
  return pieces.filter(p => p.type === 'tip').every(piece => {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    return posDist < 0.01;
  });
}

function isTipOrientationSolved(pieces: Piece[]): boolean {
  return pieces.filter(p => p.type === 'tip').every(piece => {
    for (let i = 0; i < piece.facelets.length; i++) {
      if (piece.facelets[i].face !== piece.homeFacelets[i].face ||
          piece.facelets[i].color !== piece.homeFacelets[i].color) {
        return false;
      }
    }
    return true;
  });
}

function isTipSolved(pieces: Piece[]): boolean {
  return countCorrectTips(pieces) === 4;
}

function isEdgeSolved(pieces: Piece[]): boolean {
  return countCorrectEdges(pieces) === 6;
}

function isOppositeMove(m1: Move, m2: Move): boolean {
  return m1.face === m2.face && 
         m1.type === m2.type && 
         m1.direction !== m2.direction;
}

function getStateHash(pieces: Piece[]): string {
  return pieces.map(p => {
    const posKey = `${p.position[0].toFixed(2)},${p.position[1].toFixed(2)},${p.position[2].toFixed(2)}`;
    const faceletKey = p.facelets.map(f => `${f.face}-${f.color}-${f.position}`).join('|');
    return `${p.id}:${posKey}:${faceletKey}`;
  }).join('||');
}

export function evaluateTipOrientation(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'tip')) {
    let correctCount = 0;
    for (const facelet of piece.facelets) {
      const homeFacelet = piece.homeFacelets.find(f => f.face === facelet.face);
      if (homeFacelet && homeFacelet.color === facelet.color) {
        correctCount++;
      }
    }
    score += (3 - correctCount) * 100;
    if (correctCount === 3) score -= 1000;
  }
  return score;
}

function evaluateEdge(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'edge')) {
    const posDist = Math.sqrt(
      Math.pow(piece.position[0] - piece.homePosition[0], 2) +
      Math.pow(piece.position[1] - piece.homePosition[1], 2) +
      Math.pow(piece.position[2] - piece.homePosition[2], 2)
    );
    score += posDist * 80;
    
    if (posDist < 0.01) {
      let correctCount = 0;
      for (const facelet of piece.facelets) {
        const homeFacelet = piece.homeFacelets.find(f => f.face === facelet.face);
        if (homeFacelet && homeFacelet.color === facelet.color) {
          correctCount++;
        }
      }
      score += (2 - correctCount) * 80;
      if (correctCount === 2) score -= 800;
    }
  }
  return score;
}

function evaluateCenter(pieces: Piece[]): number {
  let score = 0;
  for (const piece of pieces.filter(p => p.type === 'center')) {
    let correctCount = 0;
    for (const facelet of piece.facelets) {
      const homeFacelet = piece.homeFacelets.find(f => f.face === facelet.face);
      if (homeFacelet && homeFacelet.color === facelet.color) {
        correctCount++;
      } else {
        score += 50;
      }
    }
    if (correctCount === piece.homeFacelets.length) {
      score -= 300;
    }
  }
  return score;
}

function solvePhase(
  pieces: Piece[],
  allowedTypes: MoveType[],
  goalCheck: (p: Piece[]) => boolean,
  constraintCheck: ((p: Piece[]) => boolean) | null,
  evaluator: (p: Piece[]) => number,
  maxIterations: number
): { pieces: Piece[]; moves: Move[] } {
  const currentPieces = JSON.parse(JSON.stringify(pieces));
  const moves: Move[] = [];
  const visited = new Set<string>();
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  visited.add(getStateHash(currentPieces));
  
  let iterations = 0;
  
  while (!goalCheck(currentPieces) && iterations < maxIterations) {
    iterations++;
    
    let bestScore = evaluator(currentPieces);
    let bestMove: Move | null = null;
    let bestPieces: Piece[] | null = null;
    
    for (const face of faces) {
      for (const direction of directions) {
        for (const type of allowedTypes) {
          if (moves.length > 0 && isOppositeMove(moves[moves.length - 1], { face, direction, type })) {
            continue;
          }
          
          const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, type);
          
          if (constraintCheck && !constraintCheck(testPieces)) {
            continue;
          }
          
          const stateHash = getStateHash(testPieces);
          if (visited.has(stateHash)) {
            continue;
          }
          
          const score = evaluator(testPieces);
          if (score < bestScore - 0.001) {
            bestScore = score;
            bestMove = { face, direction, type };
            bestPieces = testPieces;
          }
        }
      }
    }
    
    if (bestMove && bestPieces) {
      for (let i = 0; i < bestPieces.length; i++) {
        currentPieces[i] = bestPieces[i];
      }
      moves.push(bestMove);
      visited.add(getStateHash(currentPieces));
    } else {
      let foundRandom = false;
      for (let tries = 0; tries < 50 && !foundRandom; tries++) {
        const face = faces[Math.floor(Math.random() * faces.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        
        if (moves.length > 0 && isOppositeMove(moves[moves.length - 1], { face, direction, type })) {
          continue;
        }
        
        const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, type);
        
        if (constraintCheck && !constraintCheck(testPieces)) {
          continue;
        }
        
        const stateHash = getStateHash(testPieces);
        if (visited.has(stateHash)) {
          continue;
        }
        
        for (let i = 0; i < testPieces.length; i++) {
          currentPieces[i] = testPieces[i];
        }
        moves.push({ face, direction, type });
        visited.add(stateHash);
        foundRandom = true;
      }
      
      if (!foundRandom) {
        break;
      }
    }
  }
  
  return { pieces: currentPieces, moves };
}

export function getTipPositionHash(pieces: Piece[]): string {
  const tipPieces = pieces.filter(p => p.type === 'tip');
  
  const sortedByPosition = [...tipPieces].sort((a, b) => {
    if (Math.abs(a.position[1] - b.position[1]) > 0.01) {
      return b.position[1] - a.position[1];
    }
    if (Math.abs(a.position[0] - b.position[0]) > 0.01) {
      return a.position[0] - b.position[0];
    }
    return a.position[2] - b.position[2];
  });
  
  return sortedByPosition.map(p => {
    return p.id;
  }).join('|');
}

export function solveTipPositionBFS(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } | null {
  const initialPieces = JSON.parse(JSON.stringify(pieces));
  
  if (isTipPositionSolved(initialPieces)) {
    return { pieces: initialPieces, moves: [] };
  }
  
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  interface State {
    pieces: Piece[];
    moves: Move[];
  }
  
  const queue: State[] = [{
    pieces: initialPieces,
    moves: [],
  }];
  
  const visited = new Set<string>();
  visited.add(getTipPositionHash(initialPieces));
  
  let iterations = 0;
  const maxIterations = 1000;
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    
    for (const face of faces) {
      for (const direction of directions) {
        const newPieces = applyMove(JSON.parse(JSON.stringify(current.pieces)), face, direction, 'face');
        const newHash = getTipPositionHash(newPieces);
        
        if (visited.has(newHash)) {
          continue;
        }
        
        const newMoves = [...current.moves, { face, direction, type: 'face' as MoveType }];
        
        if (isTipPositionSolved(newPieces)) {
          return { pieces: newPieces, moves: newMoves };
        }
        
        visited.add(newHash);
        queue.push({
          pieces: newPieces,
          moves: newMoves,
        });
      }
    }
  }
  
  return null;
}

export function solveTipOrientationGreedy(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } {
  const currentPieces = JSON.parse(JSON.stringify(pieces));
  const moves: Move[] = [];
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  for (let iter = 0; iter < 20 && !isTipOrientationSolved(currentPieces); iter++) {
    let bestScore = evaluateTipOrientation(currentPieces);
    let bestMove: Move | null = null;
    let bestPieces: Piece[] | null = null;
    
    for (const face of faces) {
      for (const direction of directions) {
        const testPieces = applyMove(JSON.parse(JSON.stringify(currentPieces)), face, direction, 'tip');
        
        if (!isTipPositionSolved(testPieces)) {
          continue;
        }
        
        const score = evaluateTipOrientation(testPieces);
        if (score < bestScore - 0.001) {
          bestScore = score;
          bestMove = { face, direction, type: 'tip' };
          bestPieces = testPieces;
        }
      }
    }
    
    if (bestMove && bestPieces) {
      for (let i = 0; i < bestPieces.length; i++) {
        currentPieces[i] = bestPieces[i];
      }
      moves.push(bestMove);
    } else {
      break;
    }
  }
  
  return { pieces: currentPieces, moves };
}

function evaluateAll(pieces: Piece[]): number {
  return evaluateCenter(pieces) + evaluateEdge(pieces) + evaluateTipOrientation(pieces) + (isTipPositionSolved(pieces) ? 0 : 100);
}

export function solvePyraminx(pieces: Piece[]): { pieces: Piece[]; moves: Move[] } {
  if (checkSolved(pieces)) {
    return { pieces: JSON.parse(JSON.stringify(pieces)), moves: [] };
  }
  
  let bestPieces: Piece[] = JSON.parse(JSON.stringify(pieces));
  let bestMoves: Move[] | null = null;
  let bestSolved = false;
  let bestScore = Infinity;
  
  const maxRestarts = 10;
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const directions: Direction[] = ['clockwise', 'counterclockwise'];
  
  for (let restart = 0; restart < maxRestarts && !bestSolved; restart++) {
    let currentPieces = JSON.parse(JSON.stringify(pieces));
    const allMoves: Move[] = [];
    
    if (restart > 0) {
      const numRandom = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numRandom; i++) {
        const face = faces[Math.floor(Math.random() * faces.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        currentPieces = applyMove(currentPieces, face, direction, 'face');
        allMoves.push({ face, direction, type: 'face' });
      }
    }
    
    const phase1 = solveTipPositionBFS(currentPieces);
    if (phase1) {
      currentPieces = phase1.pieces;
      allMoves.push(...phase1.moves);
    }
    
    if (checkSolved(currentPieces)) {
      bestPieces = currentPieces;
      bestMoves = allMoves;
      bestSolved = true;
      break;
    }
    
    const phase2 = solveTipOrientationGreedy(currentPieces);
    currentPieces = phase2.pieces;
    allMoves.push(...phase2.moves);
    
    if (checkSolved(currentPieces)) {
      bestPieces = currentPieces;
      bestMoves = allMoves;
      bestSolved = true;
      break;
    }
    
    const phase3 = solvePhase(
      currentPieces,
      ['middle'],
      isEdgeSolved,
      isTipSolved,
      evaluateEdge,
      200
    );
    currentPieces = phase3.pieces;
    allMoves.push(...phase3.moves);
    
    if (checkSolved(currentPieces)) {
      bestPieces = currentPieces;
      bestMoves = allMoves;
      bestSolved = true;
      break;
    }
    
    const phase4 = solvePhase(
      currentPieces,
      ['face', 'middle', 'tip'],
      checkSolved,
      (p) => isTipSolved(p) && isEdgeSolved(p),
      evaluateCenter,
      150
    );
    currentPieces = phase4.pieces;
    allMoves.push(...phase4.moves);
    
    if (checkSolved(currentPieces)) {
      bestPieces = currentPieces;
      bestMoves = allMoves;
      bestSolved = true;
      break;
    }
    
    const currentScore = evaluateAll(currentPieces);
    if (bestMoves === null || currentScore < bestScore || (currentScore === bestScore && allMoves.length < bestMoves.length)) {
      bestPieces = currentPieces;
      bestMoves = allMoves;
      bestScore = currentScore;
    }
  }
  
  return { pieces: bestPieces, moves: bestMoves || [] };
}

export function generateSolution(pieces: Piece[]): Move[] {
  const result = solvePyraminx(pieces);
  return result.moves;
}
