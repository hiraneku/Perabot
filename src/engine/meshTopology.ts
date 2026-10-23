import * as THREE from 'three';
import { EditableMeshData, Vec3 } from '../types/studio';

/** Polygon mesh stored in object-local coordinates. Faces retain polygon boundaries. */
export type { EditableMeshData } from '../types/studio';
export interface MeshEdge { a: number; b: number; faceIndices: number[] }

const KEY_SCALE = 100_000;
const pointKey = (p: THREE.Vector3) => `${Math.round(p.x * KEY_SCALE)},${Math.round(p.y * KEY_SCALE)},${Math.round(p.z * KEY_SCALE)}`;

/** Welds duplicate BufferGeometry vertices while retaining triangle faces as editable polygons. */
export function editableMeshFromGeometry(geometry: THREE.BufferGeometry): EditableMeshData {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute('position');
  if (!positions) throw new Error('Geometry has no position attribute');
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  const indexByKey = new Map<string, number>();
  const readIndex = (i: number) => {
    const p = new THREE.Vector3().fromBufferAttribute(positions, i);
    const key = pointKey(p);
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = vertices.length;
      vertices.push({ x: p.x, y: p.y, z: p.z });
      indexByKey.set(key, index);
    }
    return index;
  };
  for (let i = 0; i + 2 < positions.count; i += 3) {
    const face = [readIndex(i), readIndex(i + 1), readIndex(i + 2)];
    if (new Set(face).size === 3) faces.push(face);
  }
  if (source !== geometry) source.dispose();
  return { version: 1, vertices, faces };
}

export function validateEditableMesh(mesh: EditableMeshData): void {
  if (mesh.version !== 1 || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) {
    throw new Error('Unsupported editable mesh data');
  }
  for (const [i, p] of mesh.vertices.entries()) {
    if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error(`Invalid vertex ${i}`);
  }
  for (const [i, face] of mesh.faces.entries()) {
    if (face.length < 3 || face.some((v) => !Number.isInteger(v) || v < 0 || v >= mesh.vertices.length)) {
      throw new Error(`Invalid face ${i}`);
    }
    if (new Set(face).size < 3) throw new Error(`Degenerate face ${i}`);
  }
}

/** Converts polygon loops to a triangulated, indexed render geometry. */
export function geometryFromEditableMesh(mesh: EditableMeshData): THREE.BufferGeometry {
  validateEditableMesh(mesh);
  const geometry = new THREE.BufferGeometry();
  const positions = mesh.vertices.flatMap((p) => [p.x, p.y, p.z]);
  const indices: number[] = [];
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1]);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function meshEdges(mesh: EditableMeshData): MeshEdge[] {
  const edges = new Map<string, MeshEdge>();
  mesh.faces.forEach((face, faceIndex) => {
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length];
      const lo = Math.min(a, b), hi = Math.max(a, b), key = `${lo}:${hi}`;
      const edge = edges.get(key) ?? { a: lo, b: hi, faceIndices: [] };
      edge.faceIndices.push(faceIndex);
      edges.set(key, edge);
    });
  });
  return [...edges.values()];
}

export function transformMeshVertices(mesh: EditableMeshData, selected: number[], delta: Vec3): EditableMeshData {
  validateEditableMesh(mesh);
  const ids = new Set(selected);
  if ([...ids].some((i) => !Number.isInteger(i) || i < 0 || i >= mesh.vertices.length)) throw new Error('Invalid vertex selection');
  return { ...mesh, vertices: mesh.vertices.map((p, i) => ids.has(i) ? { x: p.x + delta.x, y: p.y + delta.y, z: p.z + delta.z } : { ...p }), faces: mesh.faces.map((f) => [...f]) };
}

/** Extrudes selected face regions along their area-weighted normal and creates boundary walls. */
export function extrudeMeshFaces(mesh: EditableMeshData, selectedFaceIndices: number[], distance: number): EditableMeshData {
  validateEditableMesh(mesh);
  if (!Number.isFinite(distance) || distance === 0) throw new Error('Extrusion distance must be non-zero');
  const selected = [...new Set(selectedFaceIndices)];
  if (!selected.length || selected.some((i) => !Number.isInteger(i) || i < 0 || i >= mesh.faces.length)) throw new Error('Select one or more faces');
  const selectedSet = new Set(selected);
  const normal = new THREE.Vector3();
  selected.forEach((fi) => {
    const face = mesh.faces[fi];
    const a = toVector(mesh.vertices[face[0]]);
    for (let i = 1; i < face.length - 1; i++) {
      const b = toVector(mesh.vertices[face[i]]), c = toVector(mesh.vertices[face[i + 1]]);
      normal.add(new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)));
    }
  });
  if (normal.lengthSq() < 1e-12) throw new Error('Selected faces have no stable normal');
  normal.normalize().multiplyScalar(distance);
  const boundaryEdges = new Map<string, [number, number]>();
  selected.forEach((fi) => {
    const face = mesh.faces[fi];
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (boundaryEdges.has(key)) boundaryEdges.delete(key); else boundaryEdges.set(key, [a, b]);
    });
  });
  // Keep internal shared edges internal even when selected faces are not adjacent in list order.
  for (const edge of meshEdges(mesh)) {
    const selectedUses = edge.faceIndices.filter((fi) => selectedSet.has(fi)).length;
    if (selectedUses > 1) boundaryEdges.delete(`${edge.a}:${edge.b}`);
  }
  const vertices = mesh.vertices.map((p) => ({ ...p }));
  const duplicateMap = new Map<number, number>();
  const duplicate = (v: number) => {
    let id = duplicateMap.get(v);
    if (id !== undefined) return id;
    const p = mesh.vertices[v]; id = vertices.length;
    vertices.push({ x: p.x + normal.x, y: p.y + normal.y, z: p.z + normal.z });
    duplicateMap.set(v, id); return id;
  };
  const faces = mesh.faces.filter((_, i) => !selectedSet.has(i)).map((f) => [...f]);
  selected.forEach((fi) => faces.push(mesh.faces[fi].map(duplicate)));
  for (const [a, b] of boundaryEdges.values()) faces.push([a, b, duplicate(b), duplicate(a)]);
  const result = { version: 1 as const, vertices, faces };
  validateEditableMesh(result);
  return result;
}

/** Insets one polygonal face toward its centroid, generating a surrounding rim. */
export function insetMeshFace(mesh: EditableMeshData, faceIndex: number, amount: number): EditableMeshData {
  validateEditableMesh(mesh);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Inset amount must be positive');
  const face = mesh.faces[faceIndex];
  if (!face) throw new Error('Select a face to inset');
  const center = face.reduce((acc, i) => acc.add(toVector(mesh.vertices[i])), new THREE.Vector3()).multiplyScalar(1 / face.length);
  const vertices = mesh.vertices.map((p) => ({ ...p }));
  const inner = face.map((i) => {
    const p = toVector(mesh.vertices[i]);
    const next = p.add(center.clone().sub(p).normalize().multiplyScalar(amount));
    const index = vertices.length; vertices.push({ x: next.x, y: next.y, z: next.z }); return index;
  });
  const faces = mesh.faces.map((f, i) => i === faceIndex ? [...inner] : [...f]);
  face.forEach((a, i) => faces.push([a, face[(i + 1) % face.length], inner[(i + 1) % face.length], inner[i]]));
  const result = { version: 1 as const, vertices, faces };
  validateEditableMesh(result);
  return result;
}

export function cloneEditableMesh(mesh: EditableMeshData): EditableMeshData {
  return { version: 1, vertices: mesh.vertices.map((v) => ({ ...v })), faces: mesh.faces.map((f) => [...f]) };
}

function toVector(p: Vec3): THREE.Vector3 { return new THREE.Vector3(p.x, p.y, p.z); }
