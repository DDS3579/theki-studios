// WebGL2 Renderer for the Pull Focus stage
// B3.1: Proper view transform (world moves by -camera)
// B3.7: Exposes projection for viewfinder rect computation
// B3.8: Yaw/pitch in view transform
// B3.11: Culling and fading
// B3.12: Blur multiplier and range as uniforms

import type { CameraState } from './camera';
import type { RenderTier } from '../gate';

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec2 v_uv;
out float v_viewZ; // For culling in JS

void main() {
  vec4 viewPos = u_view * u_model * vec4(a_position, 0.0, 1.0);
  gl_Position = u_projection * viewPos;
  v_uv = a_uv;
  v_viewZ = viewPos.z;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_texture;
uniform float u_blur; // B3.12: blur amount (0-1)
uniform float u_opacity;
uniform float u_vignette;
uniform bool u_enableBlur;
uniform float u_maxBlurLod; // B3.12: max LOD bias for blur

out vec4 fragColor;

void main() {
  // B3.12: blur uses configurable max LOD
  float lodBias = u_enableBlur ? u_blur * u_maxBlurLod : 0.0;
  vec4 texColor = texture(u_texture, v_uv, lodBias);
  
  // sRGB to linear
  vec3 color = pow(texColor.rgb, vec3(2.2));
  
  // Vignette (max 12%)
  vec2 uv = v_uv - 0.5;
  float vig = 1.0 - dot(uv, uv) * u_vignette * 2.0;
  color *= max(vig, 0.0);
  
  // Linear to sRGB
  color = pow(color, vec3(1.0 / 2.2));
  
  fragColor = vec4(color, texColor.a * u_opacity);
}
`;

interface TextureEntry {
  texture: WebGLTexture;
  loaded: boolean;
}

export interface Plane {
  textureId: string;
  depth: number; // Depth in the stack (0, 1, 2, ...) - positive = further from camera start
  x: number; // World X position
  y: number; // World Y position
  width: number; // World width
  height: number; // World height
  opacity: number;
}

export type RendererState = 'loading' | 'ready' | 'failed';

// B3.7: FOV constant exported for layout calculations
export const STAGE_FOV = Math.PI / 3.5; // ~51 degrees vertical

export class StageRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private textures: Map<string, TextureEntry> = new Map();
  private planes: Plane[] = [];
  private vao: WebGLVertexArrayObject | null = null;
  private disposed = false;
  private _state: RendererState = 'loading';

  // B2.1: quality settings
  private enableBlur = true;
  private currentDpr = 1;
  
  // B3.12: configurable blur parameters
  private maxBlurLod = 5.0;

  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;
  private uModel: WebGLUniformLocation | null = null;
  private uTexture: WebGLUniformLocation | null = null;
  private uBlur: WebGLUniformLocation | null = null;
  private uOpacity: WebGLUniformLocation | null = null;
  private uVignette: WebGLUniformLocation | null = null;
  private uEnableBlur: WebGLUniformLocation | null = null;
  private uMaxBlurLod: WebGLUniformLocation | null = null;

  // B2.2: frame time tracking
  private lastFrameTime = 0;
  
  // B3.7: cached projection and view for viewfinder computation
  private lastProjection: Float32Array | null = null;
  private lastView: Float32Array | null = null;
  private lastAspect = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private init() {
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      });
      
      if (!gl) {
        this._state = 'failed';
        return;
      }
      this.gl = gl;

      // B2.4: context loss handling
      this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

      this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      if (!this.program) {
        this._state = 'failed';
        return;
      }

      gl.useProgram(this.program);

      this.uProjection = gl.getUniformLocation(this.program, 'u_projection');
      this.uView = gl.getUniformLocation(this.program, 'u_view');
      this.uModel = gl.getUniformLocation(this.program, 'u_model');
      this.uTexture = gl.getUniformLocation(this.program, 'u_texture');
      this.uBlur = gl.getUniformLocation(this.program, 'u_blur');
      this.uOpacity = gl.getUniformLocation(this.program, 'u_opacity');
      this.uVignette = gl.getUniformLocation(this.program, 'u_vignette');
      this.uEnableBlur = gl.getUniformLocation(this.program, 'u_enableBlur');
      this.uMaxBlurLod = gl.getUniformLocation(this.program, 'u_maxBlurLod');

      this.createQuad();

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.141, 0.102, 0.071, 1.0);

      this._state = 'ready';
    } catch (err) {
      console.error('WebGL init failed:', err);
      this._state = 'failed';
    }
  }

  // B2.4: context loss handlers
  private handleContextLost = (e: Event) => {
    e.preventDefault();
    console.warn('WebGL context lost');
    this._state = 'failed';
    this.gl = null;
  };

  private handleContextRestored = () => {
    console.log('WebGL context restored, reinitializing');
    this.init();
  };

  getState(): RendererState {
    return this._state;
  }

  // B2.1: change quality settings
  setQuality(tier: RenderTier, dpr: number, enableBlur: boolean) {
    this.currentDpr = dpr;
    this.enableBlur = enableBlur;
  }

  // B2.2: get last frame time in ms
  getLastFrameTime(): number {
    return this.lastFrameTime;
  }
  
  // B3.7: get cached matrices for viewfinder projection
  getLastMatrices(): { projection: Float32Array; view: Float32Array; aspect: number } | null {
    if (!this.lastProjection || !this.lastView) return null;
    return {
      projection: this.lastProjection,
      view: this.lastView,
      aspect: this.lastAspect,
    };
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;
    
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  private createQuad() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Quad from -0.5 to 0.5 (will be scaled by model matrix)
    const vertices = new Float32Array([
      -0.5, -0.5,  0, 1,
       0.5, -0.5,  1, 1,
      -0.5,  0.5,  0, 0,
       0.5,  0.5,  1, 0,
    ]);

    const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

    const uvLoc = gl.getAttribLocation(this.program, 'a_uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  async loadTexture(id: string, url: string): Promise<void> {
    if (!this.gl || this.disposed) return;
    const gl = this.gl;

    const texture = gl.createTexture();
    if (!texture) return;

    // Placeholder
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([56, 42, 30, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.textures.set(id, { texture, loaded: false });

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });

      if (this.disposed) {
        gl.deleteTexture(texture);
        return;
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      const entry = this.textures.get(id);
      if (entry) entry.loaded = true;
    } catch (err) {
      console.warn('Texture load failed:', id, err);
    }
  }

  setPlanes(planes: Plane[]) {
    this.planes = planes;
  }

  // B3.1: Render with proper view transform
  render(
    camera: CameraState,
    blurFn: (depth: number) => number,
    planeSpacing: number = 2.5
  ): number {
    if (!this.gl || !this.program || !this.vao || this.disposed) return 0;
    const gl = this.gl;

    const startTime = performance.now();

    // B2.1: use tier-specific DPR
    const dpr = this.currentDpr;
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    const aspect = w / h;
    this.lastAspect = aspect;
    const near = 0.1;
    const far = 100;

    // B3.1: Build projection matrix
    const projection = this.perspective(STAGE_FOV, aspect, near, far);
    this.lastProjection = projection;
    gl.uniformMatrix4fv(this.uProjection, false, projection);

    // B3.1 & B3.8: Build view matrix (world moves by -camera)
    const view = this.buildView(camera);
    this.lastView = view;
    gl.uniformMatrix4fv(this.uView, false, view);
    
    // B3.12: Set blur parameters
    gl.uniform1i(this.uEnableBlur, this.enableBlur ? 1 : 0);
    gl.uniform1f(this.uMaxBlurLod, this.maxBlurLod);

    // B3.11: Sort back to front (deepest first) and cull
    const sorted = [...this.planes]
      .filter(p => p.opacity > 0.01) // Skip invisible planes
      .sort((a, b) => b.depth - a.depth);

    gl.bindVertexArray(this.vao);

    for (const plane of sorted) {
      const entry = this.textures.get(plane.textureId);
      if (!entry) continue;

      // B3.1: Plane position in world space
      // depth is the stack position, multiplied by spacing
      const planeZ = plane.depth * planeSpacing;
      
      // B3.11: Skip planes behind camera
      const viewDistance = camera.z - planeZ;
      if (viewDistance < near) continue;

      // B3.1: Model matrix is just translate + scale (no rotation)
      const model = this.buildModel(plane.x, plane.y, planeZ, plane.width, plane.height);
      
      gl.uniformMatrix4fv(this.uModel, false, model);
      
      // B3.12: Compute blur from plane depth
      const blur = blurFn(plane.depth);
      gl.uniform1f(this.uBlur, blur);
      
      // B3.11: Fade near and far planes
      let opacity = plane.opacity;
      if (viewDistance < 1.0) {
        opacity *= viewDistance; // Fade as camera approaches
      }
      gl.uniform1f(this.uOpacity, opacity);
      gl.uniform1f(this.uVignette, 0.12);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.uniform1i(this.uTexture, 0);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);

    const frameTime = performance.now() - startTime;
    this.lastFrameTime = frameTime;
    return frameTime;
  }

  // B3.1: Build view matrix (inverse of camera transform)
  private buildView(camera: CameraState): Float32Array {
    // View = Rotate(-pitch) * Rotate(-yaw) * Translate(-camera)
    // Column-major for WebGL
    
    const cy = Math.cos(-camera.yaw);
    const sy = Math.sin(-camera.yaw);
    const cp = Math.cos(-camera.pitch);
    const sp = Math.sin(-camera.pitch);
    
    // Rotation around Y (yaw)
    const ry = new Float32Array([
      cy, 0, -sy, 0,
      0, 1, 0, 0,
      sy, 0, cy, 0,
      0, 0, 0, 1,
    ]);
    
    // Rotation around X (pitch)
    const rx = new Float32Array([
      1, 0, 0, 0,
      0, cp, sp, 0,
      0, -sp, cp, 0,
      0, 0, 0, 1,
    ]);
    
    // Translation by -camera
    const t = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -camera.x, -camera.y, -camera.z, 1,
    ]);
    
    // View = Rx * Ry * T
    const ryt = this.mul4(ry, t);
    return this.mul4(rx, ryt);
  }

  // B3.1: Build model matrix (translate + scale, no rotation)
  private buildModel(
    px: number, py: number, pz: number,
    sx: number, sy: number
  ): Float32Array {
    return new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, 1, 0,
      px, py, -pz, 1, // Negative Z because camera looks down -Z
    ]);
  }

  private perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0,
    ]);
  }
  
  // 4x4 matrix multiplication (column-major)
  private mul4(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + j] * b[i * 4 + k];
        }
        out[i * 4 + j] = sum;
      }
    }
    return out;
  }

  isTextureLoaded(id: string): boolean {
    return this.textures.get(id)?.loaded ?? false;
  }

  dispose() {
    this.disposed = true;
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    if (!this.gl) return;
    const gl = this.gl;
    
    for (const entry of this.textures.values()) {
      gl.deleteTexture(entry.texture);
    }
    this.textures.clear();
    
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
  }
}
