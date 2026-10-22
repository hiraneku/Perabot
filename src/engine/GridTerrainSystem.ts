import * as THREE from 'three';
import { DEFAULT_GRID_SETTINGS, GridSettings } from '../types/studio';

export class GridTerrainSystem {
  public readonly group = new THREE.Group();
  private settings: GridSettings = { ...DEFAULT_GRID_SETTINGS };
  private groundCollider: THREE.Mesh | null = null;
  private tileTexture: THREE.CanvasTexture | null = null;

  constructor() {
    this.group.name = '__worldGridTerrainSystem';
    this.rebuild();
  }

  public getSettings(): GridSettings {
    return { ...this.settings };
  }

  public updateSettings(patch: Partial<GridSettings>): GridSettings {
    this.settings = {
      ...this.settings,
      ...patch,
    };
    this.rebuild();
    return { ...this.settings };
  }

  public getGroundCollider(): THREE.Mesh | null {
    return this.groundCollider;
  }

  /**
   * Computes exact ground/terrain height Y at world (x, z)
   */
  public sampleHeight(x: number, z: number): number {
    const base = this.settings.elevationY;
    if (this.settings.style !== 'terrain' || this.settings.terrainPreset === 'flat') {
      return base;
    }

    const amp = this.settings.terrainAmplitude;
    const preset = this.settings.terrainPreset;

    if (preset === 'hills') {
      const h =
        amp *
        (0.52 * Math.sin(x * 0.21) * Math.cos(z * 0.19) +
          0.28 * Math.sin((x + z) * 0.31 + 0.6) +
          0.16 * Math.cos(x * 0.52 - z * 0.46));
      return base + h;
    }

    if (preset === 'valley') {
      const dist = Math.hypot(x, z);
      const t = Math.max(0, Math.min(1, (dist - 3.2) / 11));
      const smooth = t * t * (3 - 2 * t);
      const wave = 0.85 + 0.35 * Math.sin(x * 0.26) * Math.cos(z * 0.26);
      return base + smooth * amp * wave;
    }

    // 'terraced' stepped contours
    const raw =
      amp *
      (0.58 * Math.sin(x * 0.18) * Math.cos(z * 0.18) +
        0.25 * Math.sin(x * 0.33 - z * 0.27) +
        0.65);
    const stepSize = 0.5;
    const idx = Math.floor(raw / stepSize);
    const frac = raw / stepSize - idx;
    // Crisp flat terrace plateau with smooth sloped riser on the last 22%
    const riser = frac < 0.78 ? 0 : (frac - 0.78) / 0.22;
    const smoothRiser = riser * riser * (3 - 2 * riser);
    return base + (idx + smoothRiser) * stepSize - amp * 0.35;
  }

  /**
   * Computes exact unit upward surface normal of the ground/terrain at world (x, z)
   */
  public sampleNormal(x: number, z: number): THREE.Vector3 {
    if (this.settings.style !== 'terrain' || this.settings.terrainPreset === 'flat') {
      return new THREE.Vector3(0, 1, 0);
    }
    const e = 0.05;
    const hL = this.sampleHeight(x - e, z);
    const hR = this.sampleHeight(x + e, z);
    const hD = this.sampleHeight(x, z - e);
    const hU = this.sampleHeight(x, z + e);
    return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  }

  public rebuild(): void {
    this.clearChildren();
    this.group.visible = this.settings.visible;

    const size = Math.max(10, this.settings.worldSize);
    const half = size * 0.5;
    const spacing = Math.max(0.1, this.settings.spacing);
    const subdivs = Math.max(1, Math.round(this.settings.subdivisions));
    const elev = this.settings.elevationY;
    const opacity = this.settings.opacity;

    if (this.settings.style === 'terrain') {
      this.buildTerrainGround(size, spacing, opacity);
    } else if (this.settings.style === 'tile') {
      this.buildTileGround(size, spacing, subdivs, elev, opacity);
    } else if (this.settings.style === 'blueprint') {
      this.buildBlueprintGround(size, spacing, subdivs, elev, opacity);
    } else {
      this.buildWireGround(size, spacing, subdivs, elev, opacity);
    }

    if (this.settings.showAxes) {
      this.buildOriginAxes(half);
    }
  }

  private buildWireGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    // Invisible raycastable + shadow-catching plane
    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.28,
      color: '#05070a',
    });
    const plane = new THREE.Mesh(planeGeo, shadowMat);
    plane.position.y = elev - 0.002;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.group.add(plane);

    const { majorLines, minorLines } = this.createFlatGridLines(
      size,
      spacing,
      subdivs,
      elev,
      '#394357',
      '#242a37',
      opacity
    );
    if (minorLines) this.group.add(minorLines);
    this.group.add(majorLines);
  }

  private buildTileGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    const tex = this.createCheckerTileTexture(subdivs);
    const repeats = size / (spacing * 2);
    tex.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: 0.04,
      transparent: opacity < 0.99,
      opacity,
    });
    const plane = new THREE.Mesh(planeGeo, mat);
    plane.position.y = elev - 0.002;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.group.add(plane);
  }

  private buildBlueprintGround(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    opacity: number
  ): void {
    const planeGeo = new THREE.PlaneGeometry(size, size);
    planeGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: '#0e2238',
      roughness: 0.9,
      metalness: 0.05,
      transparent: opacity < 0.99,
      opacity: Math.min(1, opacity * 0.95),
    });
    const plane = new THREE.Mesh(planeGeo, mat);
    plane.position.y = elev - 0.003;
    plane.receiveShadow = true;
    plane.name = '__groundSurface';
    this.groundCollider = plane;
    this.group.add(plane);

    const { majorLines, minorLines } = this.createFlatGridLines(
      size,
      spacing,
      subdivs,
      elev,
      '#38bdf8',
      '#1d4f7a',
      opacity
    );
    if (minorLines) this.group.add(minorLines);
    this.group.add(majorLines);
  }

  private buildTerrainGround(
    size: number,
    spacing: number,
    opacity: number
  ): void {
    const segs = Math.min(128, Math.max(64, Math.round(size * 2)));
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const lowCol = new THREE.Color('#23312d');
    const midCol = new THREE.Color('#33443c');
    const highCol = new THREE.Color('#525c65');
    const tmpCol = new THREE.Color();

    const amp = Math.max(0.4, this.settings.terrainAmplitude);
    const elev = this.settings.elevationY;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.sampleHeight(x, z);
      pos.setY(i, y);

      const rel = Math.max(0, Math.min(1, (y - elev + amp) / (amp * 2)));
      if (rel < 0.5) {
        tmpCol.copy(lowCol).lerp(midCol, rel * 2);
      } else {
        tmpCol.copy(midCol).lerp(highCol, (rel - 0.5) * 2);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = '__groundSurface';
    this.groundCollider = terrainMesh;
    this.group.add(terrainMesh);

    // Draped 3D Terrain Grid Lines following the exact topography
    const half = size * 0.5;
    const maxIdx = Math.floor(half / spacing);
    const sampleStep = Math.max(0.25, size / 110);
    const linePts: number[] = [];

    for (let k = -maxIdx; k <= maxIdx; k++) {
      const coord = k * spacing;

      // Line along X at fixed Z = coord
      for (let x = -half; x < half; x += sampleStep) {
        const xNext = Math.min(half, x + sampleStep);
        linePts.push(
          x,
          this.sampleHeight(x, coord) + 0.008,
          coord,
          xNext,
          this.sampleHeight(xNext, coord) + 0.008,
          coord
        );
      }

      // Line along Z at fixed X = coord
      for (let z = -half; z < half; z += sampleStep) {
        const zNext = Math.min(half, z + sampleStep);
        linePts.push(
          coord,
          this.sampleHeight(coord, z) + 0.008,
          z,
          coord,
          this.sampleHeight(coord, zNext) + 0.008,
          zNext
        );
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: '#86efac',
      transparent: true,
      opacity: opacity * 0.36,
    });
    this.group.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  private createFlatGridLines(
    size: number,
    spacing: number,
    subdivs: number,
    elev: number,
    majorHex: string,
    minorHex: string,
    opacity: number
  ): { majorLines: THREE.LineSegments; minorLines: THREE.LineSegments | null } {
    const half = size * 0.5;
    const majorPts: number[] = [];
    const minorPts: number[] = [];

    const minorStep = spacing / subdivs;
    const totalMinorSteps = Math.min(400, Math.floor(half / minorStep));

    for (let i = -totalMinorSteps; i <= totalMinorSteps; i++) {
      const c = i * minorStep;
      const isMajor = i % subdivs === 0;
      const target = isMajor ? majorPts : minorPts;
      const y = isMajor ? elev : elev - 0.0008;

      // Parallel to X
      target.push(-half, y, c, half, y, c);
      // Parallel to Z
      target.push(c, y, -half, c, y, half);
    }

    const majorGeo = new THREE.BufferGeometry();
    majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorPts, 3));
    const majorMat = new THREE.LineBasicMaterial({
      color: majorHex,
      transparent: true,
      opacity: Math.min(1, opacity * 0.9),
    });
    const majorLines = new THREE.LineSegments(majorGeo, majorMat);

    let minorLines: THREE.LineSegments | null = null;
    if (minorPts.length > 0) {
      const minorGeo = new THREE.BufferGeometry();
      minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorPts, 3));
      const minorMat = new THREE.LineBasicMaterial({
        color: minorHex,
        transparent: true,
        opacity: Math.min(1, opacity * 0.55),
      });
      minorLines = new THREE.LineSegments(minorGeo, minorMat);
    }

    return { majorLines, minorLines };
  }

  private buildOriginAxes(half: number): void {
    const segStep = this.settings.style === 'terrain' ? 0.35 : half * 2;

    const xPts: THREE.Vector3[] = [];
    for (let x = -half; x <= half + 0.001; x += segStep) {
      const clampedX = Math.min(half, x);
      xPts.push(
        new THREE.Vector3(clampedX, this.sampleHeight(clampedX, 0) + 0.012, 0)
      );
    }
    const xGeo = new THREE.BufferGeometry().setFromPoints(xPts);
    const xMat = new THREE.LineBasicMaterial({
      color: '#ff3b57',
      transparent: true,
      opacity: 0.9,
    });
    this.group.add(new THREE.Line(xGeo, xMat));

    const zPts: THREE.Vector3[] = [];
    for (let z = -half; z <= half + 0.001; z += segStep) {
      const clampedZ = Math.min(half, z);
      zPts.push(
        new THREE.Vector3(0, this.sampleHeight(0, clampedZ) + 0.012, clampedZ)
      );
    }
    const zGeo = new THREE.BufferGeometry().setFromPoints(zPts);
    const zMat = new THREE.LineBasicMaterial({
      color: '#3898ff',
      transparent: true,
      opacity: 0.9,
    });
    this.group.add(new THREE.Line(zGeo, zMat));
  }

  private createCheckerTileTexture(subdivs: number): THREE.CanvasTexture {
    if (this.tileTexture) {
      this.tileTexture.dispose();
    }
    const res = 256;
    const half = res / 2;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;

    // 2x2 alternating tiles
    ctx.fillStyle = '#1c212c';
    ctx.fillRect(0, 0, res, res);
    ctx.fillStyle = '#242b38';
    ctx.fillRect(0, 0, half, half);
    ctx.fillRect(half, half, half, half);

    // Subtle internal subdivision lines
    if (subdivs > 1 && subdivs <= 10) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;
      const stepPx = half / subdivs;
      ctx.beginPath();
      for (let i = 1; i < subdivs * 2; i++) {
        const p = i * stepPx;
        ctx.moveTo(p, 0);
        ctx.lineTo(p, res);
        ctx.moveTo(0, p);
        ctx.lineTo(res, p);
      }
      ctx.stroke();
    }

    // Crisp major tile grout lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(res, 0);
    ctx.moveTo(0, half);
    ctx.lineTo(res, half);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, res);
    ctx.moveTo(half, 0);
    ctx.lineTo(half, res);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.tileTexture = tex;
    return tex;
  }

  private clearChildren(): void {
    this.groundCollider = null;
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      const m = child as THREE.Mesh | THREE.LineSegments | THREE.Line;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    }
  }

  public dispose(): void {
    this.clearChildren();
    if (this.tileTexture) {
      this.tileTexture.dispose();
      this.tileTexture = null;
    }
  }
}
