// WebGL2 Renderer for the Pull Focus stage
// B2.4: ready/failed state, context loss handling, quality changes

import type { CameraState } from './camera';
import type { RenderTier } from '../gate';

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_model;

out vec2 v_uv;

void main() {
  gl_Position = u_projection * u_model * vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_texture;
uniform float u_coc;
uniform float u_opacity;
uniform float u_vignette;
uniform bool u_enableBlur;

out vec4 fragColor;

void main() {
  // B2.1: only apply blur if enabled
  float lodBias = u_enableBlur ? u_coc * 5.0 : 0.0;
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
  z: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export type RendererState = 'loading' | 'ready' | 'failed';

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

  private uProjection: WebGLUniformLocation | null = null;
  private uModel: WebGLUniformLocation | null = null;
  private uTexture: WebGLUniformLocation | null = null;
  private uCoc: WebGLUniformLocation | null = null;
  private uOpacity: WebGLUniformLocation | null = null;
  private uVignette: WebGLUniformLocation | null = null;
  private uEnableBlur: WebGLUniformLocation | null = null;

  // B2.2: frame time tracking
  private lastFrameTime = 0;

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
      this.uModel = gl.getUniformLocation(this.program, 'u_model');
      this.uTexture = gl.getUniformLocation(this.program, 'u_texture');
      this.uCoc = gl.getUniformLocation(this.program, 'u_coc');
      this.uOpacity = gl.getUniformLocation(this.program, 'u_opacity');
      this.uVignette = gl.getUniformLocation(this.program, 'u_vignette');
      this.uEnableBlur = gl.getUniformLocation(this.program, 'u_enableBlur');

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

    const vertices = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
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

  render(camera: CameraState, focusDistance: number, cocFn: (z: number) => number): number {
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
    const fov = Math.PI / 3.5;
    const near = 0.1;
    const far = 100;

    const projection = this.perspective(fov, aspect, near, far);
    gl.uniformMatrix4fv(this.uProjection, false, projection);

    // Sort back to front
    const sorted = [...this.planes].sort((a, b) => b.z - a.z);

    gl.bindVertexArray(this.vao);

    for (const plane of sorted) {
      const entry = this.textures.get(plane.textureId);
      if (!entry) continue;

      const pz = -plane.z + camera.z;
      const model = this.buildModel(
        plane.x, plane.y, pz,
        plane.scaleX, plane.scaleY,
        camera
      );
      
      gl.uniformMatrix4fv(this.uModel, false, model);
      gl.uniform1f(this.uCoc, cocFn(plane.z));
      gl.uniform1f(this.uOpacity, plane.opacity);
      gl.uniform1f(this.uVignette, 0.12);
      gl.uniform1i(this.uEnableBlur, this.enableBlur ? 1 : 0);

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

  private buildModel(
    px: number, py: number, pz: number,
    sx: number, sy: number,
    camera: CameraState
  ): Float32Array {
    const cos = Math.cos(camera.yaw);
    const sin = Math.sin(camera.yaw);
    
    return new Float32Array([
      sx * cos, 0, sx * sin, 0,
      0, sy, 0, 0,
      -sx * sin, 0, sx * cos, 0,
      px + camera.x, py + camera.y, pz, 1,
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
