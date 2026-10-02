// WebGL2 Renderer - new opacity/blur formulas
import type { CameraState } from './camera';
import type { RenderTier } from '../gate';
import type { PlaneLayout } from './layout';
import {
  PLANE_SPACING,
  CULL_DISTANCE,
  BLUR_DIVISOR,
  BLUR_PASSED_MULTIPLIER,
  FADE_START,
  FADE_END,
  PASSED_FADE_RATE,
  PASSED_FADE_END,
  STAGE_FOV,
} from './constants';

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec2 v_uv;

void main() {
  vec4 viewPos = u_view * u_model * vec4(a_position, 0.0, 1.0);
  gl_Position = u_projection * viewPos;
  v_uv = a_uv;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_texture;
uniform float u_blur;
uniform float u_opacity;
uniform float u_vignette;
uniform bool u_enableBlur;
uniform float u_maxBlurLod;

out vec4 fragColor;

void main() {
  float lodBias = u_enableBlur ? min(u_blur * u_maxBlurLod, 3.0) : 0.0;
  vec4 texColor = texture(u_texture, v_uv, lodBias);
  
  vec2 uv = v_uv - 0.5;
  float vig = 1.0 - dot(uv, uv) * u_vignette * 2.0;
  
  fragColor = vec4(texColor.rgb * max(vig, 0.0), texColor.a * u_opacity);
}
`;

interface TextureEntry {
  texture: WebGLTexture;
  loaded: boolean;
  failed: boolean;
  fadeProgress: number;
  url: string; // B12.32: Store URL for context restore
  id: string; // B12.32: Store ID for context restore
}

export interface Plane {
  textureId: string;
  index: number; // Photo index in chapter
  layout: PlaneLayout;
}

export type RendererState = 'loading' | 'ready' | 'failed';

export class StageRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private textures: Map<string, TextureEntry> = new Map();
  private sortedPlanes: Plane[] = [];
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private ibo: WebGLBuffer | null = null;
  private disposed = false;
  private _state: RendererState = 'loading';
  private contextRestoreTimeout: number | null = null; // B12.32
  private contextListenersAdded = false; // B12.32

  private enableBlur = true;
  private currentDpr = 1;
  private maxBlurLod = 5.0;

  private projectionMatrix = new Float32Array(16);
  private viewMatrix = new Float32Array(16);
  private modelMatrix = new Float32Array(16);
  private tempMatrix1 = new Float32Array(16);
  private tempMatrix2 = new Float32Array(16);

  private cachedAspect = 0;
  private projectionDirty = true;

  private dirty = true;
  private lastCamera: CameraState | null = null;
  private lastFocus = 0;
  private lastGroupOpacity = 1;

  private resizeObserver: ResizeObserver | null = null;
  private cachedWidth = 0;
  private cachedHeight = 0;

  private textureLoadQueue: Array<{ id: string; url: string; priority: number }> = [];
  private activeTextureLoads = 0;
  private maxConcurrentLoads = 2;

  private abortControllers: Map<string, AbortController> = new Map();
  private failedTextureCount = 0;
  private onTooManyFailures?: () => void;
  private onFirstTextureReady?: () => void;

  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;
  private uModel: WebGLUniformLocation | null = null;
  private uTexture: WebGLUniformLocation | null = null;
  private uBlur: WebGLUniformLocation | null = null;
  private uOpacity: WebGLUniformLocation | null = null;
  private uVignette: WebGLUniformLocation | null = null;
  private uEnableBlur: WebGLUniformLocation | null = null;
  private uMaxBlurLod: WebGLUniformLocation | null = null;

  private lastFrameTime = 0;
  private lastProjection: Float32Array | null = null;
  private lastView: Float32Array | null = null;
  private lastAspect = 1;

  constructor(canvas: HTMLCanvasElement, tier: RenderTier = 'A0') {
    this.canvas = canvas;
    // B12.34: Initialize cached size from canvas client size
    this.cachedWidth = canvas.clientWidth;
    this.cachedHeight = canvas.clientHeight;
    this.init(tier);
    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width !== this.cachedWidth || height !== this.cachedHeight) {
          this.cachedWidth = width;
          this.cachedHeight = height;
          this.projectionDirty = true;
          this.markDirty();
        }
      }
    });
    this.resizeObserver.observe(this.canvas);
  }

  private init(tier: RenderTier) {
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: tier === 'A0' ? 'high-performance' : 'default',
      });

      if (!gl) {
        this._state = 'failed';
        return;
      }
      this.gl = gl;

      // B12.32: Only add listeners once in constructor, not on every init
      if (!this.contextListenersAdded) {
        this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
        this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
        this.contextListenersAdded = true;
      }

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

      gl.uniform1i(this.uTexture, 0);
      gl.uniform1f(this.uVignette, 0.12);

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

  // B12.32: Context loss handling - don't mark as failed, pause drawing
  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this._state = 'loading'; // Pause, don't fail
    this.gl = null;
    // B12.32: Start restore timeout
    this.contextRestoreTimeout = window.setTimeout(() => {
      if (this._state === 'loading' && this.onTooManyFailures) {
        this._state = 'failed';
        this.onTooManyFailures();
      }
    }, 5000);
  };

  // B12.32: Context restore - rebuild everything and re-queue textures
  private handleContextRestored = () => {
    if (this.contextRestoreTimeout) {
      clearTimeout(this.contextRestoreTimeout);
      this.contextRestoreTimeout = null;
    }
    
    // Re-initialize WebGL
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'default',
    });
    
    if (!gl) {
      this._state = 'failed';
      if (this.onTooManyFailures) this.onTooManyFailures();
      return;
    }
    
    this.gl = gl;
    
    // Rebuild program and buffers
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    if (!this.program) {
      this._state = 'failed';
      if (this.onTooManyFailures) this.onTooManyFailures();
      return;
    }
    
    gl.useProgram(this.program);
    
    // Re-get uniform locations
    this.uProjection = gl.getUniformLocation(this.program, 'u_projection');
    this.uView = gl.getUniformLocation(this.program, 'u_view');
    this.uModel = gl.getUniformLocation(this.program, 'u_model');
    this.uTexture = gl.getUniformLocation(this.program, 'u_texture');
    this.uBlur = gl.getUniformLocation(this.program, 'u_blur');
    this.uOpacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.uVignette = gl.getUniformLocation(this.program, 'u_vignette');
    this.uEnableBlur = gl.getUniformLocation(this.program, 'u_enableBlur');
    this.uMaxBlurLod = gl.getUniformLocation(this.program, 'u_maxBlurLod');
    
    gl.uniform1i(this.uTexture, 0);
    gl.uniform1f(this.uVignette, 0.12);
    
    this.createQuad();
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.141, 0.102, 0.071, 1.0);
    
    // B12.32: Re-queue all textures from stored URLs
    for (const entry of this.textures.values()) {
      entry.texture = gl.createTexture()!;
      entry.loaded = false;
      entry.failed = false;
      entry.fadeProgress = 0;
      
      // Re-upload placeholder
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([56, 42, 30, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      // Re-queue load
      this.queueTextureLoad(entry.id, entry.url, 0);
    }
    
    this._state = 'ready';
    this.markDirty();
    
    // B12.32: Wake ticker to resume rendering
    if (typeof window !== 'undefined' && (window as any).ticker) {
      (window as any).ticker.wake();
    }
  };

  getState(): RendererState {
    return this._state;
  }

  setQuality(_tier: RenderTier, dpr: number, enableBlur: boolean) {
    this.currentDpr = dpr;
    this.enableBlur = enableBlur;
    this.markDirty();
  }

  getLastFrameTime(): number {
    return this.lastFrameTime;
  }

  getLastMatrices(): { projection: Float32Array; view: Float32Array; aspect: number } | null {
    if (!this.lastProjection || !this.lastView) return null;
    return {
      projection: this.lastProjection,
      view: this.lastView,
      aspect: this.lastAspect,
    };
  }

  // B12.25: Project a plane's corners to screen coordinates using cached matrices
  // This ensures the viewfinder uses the exact same transformation as the renderer
  projectPlaneToScreen(
    layout: PlaneLayout,
    photoZ: number
  ): { left: number; top: number; width: number; height: number } | null {
    if (!this.lastProjection || !this.lastView) return null;

    const projection = this.lastProjection;
    const view = this.lastView;

    // Plane corners in world space (centered at layout.x, layout.y, photoZ)
    const halfW = layout.width / 2;
    const halfH = layout.height / 2;
    const corners = [
      [layout.x - halfW, layout.y - halfH, photoZ], // top-left
      [layout.x + halfW, layout.y - halfH, photoZ], // top-right
      [layout.x + halfW, layout.y + halfH, photoZ], // bottom-right
      [layout.x - halfW, layout.y + halfH, photoZ], // bottom-left
    ];

    // Transform each corner through view and projection
    const screenCorners = corners.map(corner => {
      // View transform
      const vx = view[0] * corner[0] + view[4] * corner[1] + view[8] * corner[2] + view[12];
      const vy = view[1] * corner[0] + view[5] * corner[1] + view[9] * corner[2] + view[13];
      const vz = view[2] * corner[0] + view[6] * corner[1] + view[10] * corner[2] + view[14];
      const vw = view[3] * corner[0] + view[7] * corner[1] + view[11] * corner[2] + view[15];

      // Projection transform
      const px = projection[0] * vx + projection[4] * vy + projection[8] * vz + projection[12] * vw;
      const py = projection[1] * vx + projection[5] * vy + projection[9] * vz + projection[13] * vw;
      const pw = projection[3] * vx + projection[7] * vy + projection[11] * vz + projection[15] * vw;

      // Perspective divide and convert to screen coordinates
      const ndcX = px / pw;
      const ndcY = py / pw;

      // NDC to screen: [-1, 1] -> [0, screenWidth/Height]
      const screenX = (ndcX + 1) * 0.5 * this.cachedWidth;
      const screenY = (1 - ndcY) * 0.5 * this.cachedHeight; // Flip Y

      return [screenX, screenY];
    });

    // Find bounding box
    const xs = screenCorners.map(c => c[0]);
    const ys = screenCorners.map(c => c[1]);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  markDirty() {
    this.dirty = true;
  }

  setOnTooManyFailures(callback: () => void) {
    this.onTooManyFailures = callback;
  }

  setOnFirstTextureReady(callback: () => void) {
    this.onFirstTextureReady = callback;
  }

  isTextureLoading(): boolean {
    return this.activeTextureLoads > 0;
  }

  // B12.33: Check if renderer needs frames (for ticker activity check)
  needsFrames(): boolean {
    if (this.activeTextureLoads > 0) return true;
    if (this.projectionDirty) return true;
    // Check if any texture is fading in
    for (const entry of this.textures.values()) {
      if (entry.loaded && entry.fadeProgress < 1) return true;
    }
    return false;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
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
      -0.5, -0.5, 0, 1,
      0.5, -0.5, 1, 1,
      -0.5, 0.5, 0, 0,
      0.5, 0.5, 1, 0,
    ]);

    const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

    const uvLoc = gl.getAttribLocation(this.program, 'a_uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  queueTextureLoad(id: string, url: string, priority: number = 0) {
    this.textureLoadQueue.push({ id, url, priority });
    this.textureLoadQueue.sort((a, b) => a.priority - b.priority);
    this.processTextureQueue();
  }

  private processTextureQueue() {
    while (
      this.activeTextureLoads < this.maxConcurrentLoads &&
      this.textureLoadQueue.length > 0
    ) {
      const item = this.textureLoadQueue.shift();
      if (item) {
        this.activeTextureLoads++;
        this.loadTexture(item.id, item.url, item.priority === 0).finally(() => {
          this.activeTextureLoads--;
          this.processTextureQueue();
        });
      }
    }
  }

  private async loadTexture(id: string, url: string, isFirst: boolean): Promise<void> {
    if (!this.gl || this.disposed) return;
    const gl = this.gl;

    const texture = gl.createTexture();
    if (!texture) return;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([56, 42, 30, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.textures.set(id, { texture, loaded: false, failed: false, fadeProgress: 0, url, id });

    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        // B12.35: Use AbortSignal.timeout to avoid timer leak
        const timeoutSignal = AbortSignal.timeout(10000);
        const combinedSignal = AbortSignal.any([abortController.signal, timeoutSignal]);
        
        const response = await fetch(url, { signal: combinedSignal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        if (this.disposed) {
          gl.deleteTexture(texture);
          return;
        }

        // B12.30: Don't resize - preserve aspect ratio and original dimensions
        const bitmap = await createImageBitmap(blob, {
          colorSpaceConversion: 'none',
          resizeQuality: 'high',
        });

        if (this.disposed) {
          gl.deleteTexture(texture);
          bitmap.close(); // B12.30: Release bitmap
          return;
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // B12.30: Release bitmap after upload to GPU
        bitmap.close();

        const entry = this.textures.get(id);
        if (entry) {
          entry.loaded = true;
          entry.fadeProgress = 0;
        }

        this.abortControllers.delete(id);
        this.markDirty();

        // Notify when first texture is ready
        if (isFirst && this.onFirstTextureReady) {
          this.onFirstTextureReady();
        }

        return;
      } catch (err) {
        // B12.31: Don't count aborted loads or disposed renderer as failures
        if (this.disposed || (err instanceof Error && err.name === 'AbortError')) {
          this.abortControllers.delete(id);
          return;
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
        } else {
          const entry = this.textures.get(id);
          if (entry) {
            entry.failed = true;
          }
          this.failedTextureCount++;
          this.abortControllers.delete(id);

          if (this.failedTextureCount > 3 && this.onTooManyFailures) {
            this.onTooManyFailures();
          }

          // If first texture failed, notify
          if (isFirst && this.onTooManyFailures) {
            this.onTooManyFailures();
          }
          return;
        }
      }
    }
  }

  setPlanes(planes: Plane[]) {
    this.sortedPlanes = [...planes].sort((a, b) => b.index - a.index);
    this.markDirty();
  }

  render(
    camera: CameraState,
    focus: number,
    groupOpacity: number
  ): number {
    if (!this.gl || !this.program || !this.vao || this.disposed) return 0;
    
    // B12.34: Skip rendering if size is zero
    if (this.cachedWidth === 0 || this.cachedHeight === 0) return 0;

    const cameraChanged = !this.lastCamera ||
      this.lastCamera.x !== camera.x ||
      this.lastCamera.y !== camera.y ||
      this.lastCamera.z !== camera.z ||
      this.lastCamera.yaw !== camera.yaw;

    const focusChanged = this.lastFocus !== focus;
    const opacityChanged = this.lastGroupOpacity !== groupOpacity;

    if (!this.dirty && !cameraChanged && !focusChanged && !opacityChanged) {
      return 0;
    }

    this.lastCamera = { ...camera };
    this.lastFocus = focus;
    this.lastGroupOpacity = groupOpacity;
    this.dirty = false;

    const gl = this.gl;
    const startTime = performance.now();

    const dpr = this.currentDpr;
    const w = Math.floor(this.cachedWidth * dpr);
    const h = Math.floor(this.cachedHeight * dpr);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.projectionDirty = true;
    }

    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    const aspect = w / h;
    this.lastAspect = aspect;

    if (this.projectionDirty || aspect !== this.cachedAspect) {
      this.perspective(STAGE_FOV, aspect, 0.1, 100, this.projectionMatrix);
      this.cachedAspect = aspect;
      this.projectionDirty = false;
      this.lastProjection = this.projectionMatrix;
    }
    gl.uniformMatrix4fv(this.uProjection, false, this.projectionMatrix);

    this.buildView(camera, this.viewMatrix);
    this.lastView = this.viewMatrix;
    gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);

    gl.uniform1i(this.uEnableBlur, this.enableBlur ? 1 : 0);
    gl.uniform1f(this.uMaxBlurLod, this.maxBlurLod);

    gl.bindVertexArray(this.vao);

    for (const plane of this.sortedPlanes) {
      const entry = this.textures.get(plane.textureId);
      if (!entry || entry.failed) continue;

      if (entry.loaded && entry.fadeProgress < 1) {
        entry.fadeProgress = Math.min(1, entry.fadeProgress + 0.016 * 2);
        this.dirty = true;
      }

      // Compute distance from camera to photo
      const photoZ = -plane.index * PLANE_SPACING;
      const distance = camera.z - photoZ;

      // Cull if too close
      if (distance < CULL_DISTANCE) continue;

      // Compute s = photo index - focus
      const s = plane.index - focus;

      // Compute opacity
      let opacity: number;
      if (s >= 0) {
        // Ahead of focus
        if (s <= FADE_START) {
          opacity = 1;
        } else if (s >= FADE_END) {
          opacity = 0;
        } else {
          opacity = 1 - (s - FADE_START) / (FADE_END - FADE_START);
        }
      } else {
        // Behind focus (passed)
        opacity = Math.max(0, 1 + PASSED_FADE_RATE * s);
        if (s < PASSED_FADE_END) {
          opacity = 0;
        }
      }

      // Apply group opacity
      opacity *= groupOpacity;

      // Apply texture fade
      opacity *= entry.fadeProgress;

      if (opacity < 0.01) continue;

      // Compute blur
      const absS = Math.abs(s);
      let blur = absS / BLUR_DIVISOR;
      if (s < 0) {
        blur *= BLUR_PASSED_MULTIPLIER;
      }

      // Build model matrix
      this.buildModel(
        plane.layout.x,
        plane.layout.y,
        photoZ,
        plane.layout.width,
        plane.layout.height,
        this.modelMatrix
      );
      gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);

      gl.uniform1f(this.uBlur, blur);
      gl.uniform1f(this.uOpacity, opacity);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);

    const frameTime = performance.now() - startTime;
    this.lastFrameTime = frameTime;
    return frameTime;
  }

  // B12.23: Fixed view matrix construction
  // Order: translation * yaw * pitch (applied right to left)
  // Uses separate scratch matrices to avoid aliasing
  private buildView(camera: CameraState, out: Float32Array) {
    const cy = Math.cos(-camera.yaw);
    const sy = Math.sin(-camera.yaw);
    const cp = Math.cos(-camera.pitch);
    const sp = Math.sin(-camera.pitch);

    // Step 1: Translation by -camera position
    const translation = this.tempMatrix1;
    translation.set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -camera.x, -camera.y, -camera.z, 1,
    ]);

    // Step 2: Yaw rotation (around Y axis)
    const yaw = this.tempMatrix2;
    yaw.set([
      cy, 0, -sy, 0,
      0, 1, 0, 0,
      sy, 0, cy, 0,
      0, 0, 0, 1,
    ]);

    // Step 3: Pitch rotation (around X axis) - use a separate buffer
    const pitch = new Float32Array([
      1, 0, 0, 0,
      0, cp, sp, 0,
      0, -sp, cp, 0,
      0, 0, 0, 1,
    ]);

    // Combine: view = pitch * yaw * translation
    // First: yaw * translation -> tempMatrix1
    this.mul4Into(yaw, translation, this.tempMatrix1);
    // Then: pitch * (yaw * translation) -> out
    this.mul4Into(pitch, this.tempMatrix1, out);
  }

  private buildModel(
    px: number, py: number, pz: number,
    sx: number, sy: number,
    out: Float32Array
  ) {
    out.set([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, 1, 0,
      px, py, pz, 1,
    ]);
  }

  private perspective(fov: number, aspect: number, near: number, far: number, out: Float32Array) {
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    out.set([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0,
    ]);
  }

  private mul4Into(a: Float32Array, b: Float32Array, out: Float32Array) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + j] * b[i * 4 + k];
        }
        out[i * 4 + j] = sum;
      }
    }
  }

  isTextureLoaded(id: string): boolean {
    return this.textures.get(id)?.loaded ?? false;
  }

  dispose() {
    this.disposed = true;

    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

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

    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.ibo) gl.deleteBuffer(this.ibo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);

    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
    }

    this.gl = null;
  }
}
