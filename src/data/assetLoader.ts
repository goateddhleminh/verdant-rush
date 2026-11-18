import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadAllGameData } from './gameData';
import { audioManager } from '../audio/audioManager';

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

const textureCache = new Map<string, THREE.Texture>();
const gltfCache = new Map<string, GLTF>();
const gltfPromiseCache = new Map<string, Promise<GLTF>>();

export function loadTextureCached(
  path: string,
  options?: { srgb?: boolean; repeat?: [number, number]; anisotropy?: number }
): Promise<THREE.Texture> {
  const url = path.startsWith('/') ? path : `/assets/${path}`;
  const existing = textureCache.get(url);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    textureLoader.load(
      url,
      (tex) => {
        if (options?.srgb !== false) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        if (options?.repeat) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(options.repeat[0], options.repeat[1]);
        }
        if (options?.anisotropy) {
          tex.anisotropy = options.anisotropy;
        }
        tex.needsUpdate = true;
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      () => {
        // Fallback 1x1 white texture so rendering never breaks
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 2, 2);
        }
        const fallback = new THREE.CanvasTexture(canvas);
        textureCache.set(url, fallback);
        resolve(fallback);
      }
    );
  });
}

export function getCachedTexture(path: string): THREE.Texture | undefined {
  const url = path.startsWith('/') ? path : `/assets/${path}`;
  return textureCache.get(url);
}

export function loadGltfCached(path: string): Promise<GLTF> {
  const url = path.startsWith('/') ? path : `/assets/${path}`;
  const existing = gltfCache.get(url);
  if (existing) return Promise.resolve(existing);

  const pending = gltfPromiseCache.get(url);
  if (pending) return pending;

  const promise = new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        // Ensure vertex colors never overflow shader values
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            if (m.geometry?.attributes?.color) {
              const c = m.geometry.attributes.color;
              if (!c.normalized && c.array instanceof Uint8Array) {
                c.normalized = true;
                c.needsUpdate = true;
              }
            }
          }
        });
        gltfCache.set(url, gltf);
        resolve(gltf);
      },
      undefined,
      (err) => {
        gltfPromiseCache.delete(url);
        reject(err);
      }
    );
  });
  gltfPromiseCache.set(url, promise);
  return promise;
}

export function getCachedGltf(path: string): GLTF | undefined {
  const url = path.startsWith('/') ? path : `/assets/${path}`;
  return gltfCache.get(url);
}

/**
 * Resolves a prop model ID (like 'pine-a', 'bush-a', 'rock-a', 'deer', 'cabin', 'fence-wood')
 * to its path under /assets/models/environment/...
 */
const ENVIRONMENT_MODEL_FOLDERS: Record<string, string> = {
  // animals
  'butterfly-blue': 'animals',
  'butterfly-orange': 'animals',
  'deer': 'animals',
  'fawn': 'animals',
  'rabbit': 'animals',
  'seagull': 'animals',
  'songbird-blue': 'animals',
  'songbird-red': 'animals',
  // buildings
  'birdhouse': 'buildings',
  'cabin': 'buildings',
  'covered-bridge': 'buildings',
  'dock': 'buildings',
  'rowboat': 'buildings',
  'tent': 'buildings',
  'waterfall': 'buildings',
  'wooden-bridge': 'buildings',
  // bushes
  'bush-a': 'bushes',
  'bush-autumn': 'bushes',
  'bush-b': 'bushes',
  'bush-flowering': 'bushes',
  // flora
  'fern': 'flora',
  'flowers-blue': 'flora',
  'flowers-pink': 'flora',
  'flowers-purple': 'flora',
  'flowers-red': 'flora',
  'flowers-white': 'flora',
  'flowers-yellow': 'flora',
  'grass-dry': 'flora',
  'grass-tall': 'flora',
  'grass-tuft': 'flora',
  'mushroom-cream': 'flora',
  'mushroom-red': 'flora',
  'reeds': 'flora',
  // props
  'bench': 'props',
  'fallen-log': 'props',
  'falling-branch': 'props',
  'hay-bale': 'props',
  'log-pile': 'props',
  'pebbles': 'props',
  'pumpkin-cart': 'props',
  'pumpkin': 'props',
  'stump': 'props',
  // rocks
  'boulder-a': 'rocks',
  'boulder-b': 'rocks',
  'boulder-c': 'rocks',
  'cliff-chunk': 'rocks',
  'rock-a': 'rocks',
  'rock-b': 'rocks',
  'rock-c': 'rocks',
  'rock-cluster': 'rocks',
  'rock-d': 'rocks',
  'rock-e': 'rocks',
  // terrain
  'cloud-1': 'terrain',
  'cloud-2': 'terrain',
  'cloud-3': 'terrain',
  'hill-a': 'terrain',
  'hill-autumn': 'terrain',
  'mountain-far': 'terrain',
  'mountain-green': 'terrain',
  'mountain-rock': 'terrain',
  // track
  'boost-pad': 'track',
  'checkpoint-gate': 'track',
  'chevron-sign': 'track',
  'fence-wood': 'track',
  'guardrail': 'track',
  'jump-ramp': 'track',
  'kerb': 'track',
  'lamp-post': 'track',
  'leaf-patch': 'track',
  'puddle': 'track',
  'signpost': 'track',
  'start-finish-arch': 'track',
  'stone-wall': 'track',
  // trees
  'birch-a': 'trees',
  'birch-b': 'trees',
  'birch-c': 'trees',
  'dead-tree': 'trees',
  'maple-gold': 'trees',
  'maple-green': 'trees',
  'maple-orange': 'trees',
  'maple-red': 'trees',
  'oak-amber': 'trees',
  'oak-big': 'trees',
  'oak-green': 'trees',
  'pine-a': 'trees',
  'pine-b': 'trees',
  'pine-c': 'trees',
  'pine-dark': 'trees',
  'sapling': 'trees',
  'spruce-a': 'trees',
  'spruce-b': 'trees',
  'spruce-c': 'trees',
};

export function getEnvironmentModelPath(modelId: string): string {
  const folder = ENVIRONMENT_MODEL_FOLDERS[modelId] || 'props';
  return `/assets/models/environment/${folder}/${modelId}.glb`;
}

/**
 * Bootstraps all essential game data, textures, core vehicle models, and audio
 * while reporting smooth progress for the LoadingScreen.
 */
export async function bootstrapAssets(
  onProgress: (percent: number, statusText: string) => void
): Promise<void> {
  onProgress(5, 'Reading forest blueprints...');
  const data = await loadAllGameData((loaded, total, label) => {
    onProgress(5 + Math.round((loaded / total) * 25), label);
  });

  // Load core textures
  const textureTasks: { path: string; opts?: any; label: string }[] = [
    { path: 'images/sky-day.jpg', opts: { srgb: true }, label: 'Painting sunlit sky...' },
    { path: 'textures/tex-asphalt.jpg', opts: { srgb: true, repeat: [1, 1], anisotropy: 8 }, label: 'Laying forest road...' },
    { path: 'textures/tex-forest-floor.jpg', opts: { srgb: true, repeat: [60, 60], anisotropy: 8 }, label: 'Growing moss & ferns...' },
    { path: 'textures/tex-gravel.jpg', opts: { srgb: true, repeat: [16, 16], anisotropy: 4 }, label: 'Spreading gravel shoulders...' },
    { path: 'textures/tex-grass.jpg', opts: { srgb: true, repeat: [80, 80], anisotropy: 4 }, label: 'Planting meadow grass...' },
    { path: 'textures/tex-water-normal.png', opts: { srgb: false, repeat: [12, 12] }, label: 'Rippling streams & lakes...' },
    ...data.theme.particles.map((p) => ({
      path: p,
      opts: { srgb: true },
      label: 'Gathering drifting leaves & pollen...',
    })),
  ];

  for (let i = 0; i < textureTasks.length; i++) {
    const t = textureTasks[i];
    onProgress(30 + Math.round((i / textureTasks.length) * 25), t.label);
    await loadTextureCached(t.path, t.opts);
  }

  // Preload starter/core vehicles + wheel styles + Emerald Valley map so first render is instant
  const modelUrls = [
    'models/vehicles/cars/moss-hatch.glb',
    'models/vehicles/cars/ember-coupe.glb',
    'models/vehicles/cars/timberline-4x4.glb',
    'models/vehicles/bikes/fern-250.glb',
    'models/vehicles/bikes/hawk-adventure.glb',
    'models/vehicles/bikes/pebble-trials.glb',
    ...data.theme.wheelStyles.map((w) => w.model),
    'models/maps/emerald-valley.glb',
  ];

  for (let i = 0; i < modelUrls.length; i++) {
    onProgress(
      55 + Math.round((i / modelUrls.length) * 25),
      'Preparing vehicles & Emerald Valley...'
    );
    try {
      await loadGltfCached(modelUrls[i]);
    } catch {
      // Fallback procedural mesh will be used if any fails
    }
  }

  // Preload audio buffers
  await audioManager.init(data.audio, (loaded, total) => {
    onProgress(80 + Math.round((loaded / total) * 20), 'Tuning birdsong & engines...');
  });

  onProgress(100, 'Take a deep breath. Ready!');
}
