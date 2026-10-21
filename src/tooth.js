/* ============================================================
   tooth.js — procedural molar + scroll-driven cinematic scene
   ============================================================ */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const ENAMEL = 0xf7f3ea;
const PULP = 0xc0453f;

/* ============================================================
   Downloaded model config
   ------------------------------------------------------------
   Put your .glb file at  public/tooth.glb  and it loads here.
   (Sketchfab: "Mouth" by TaddyModels — download as glTF, rename
    to tooth.glb. CC-BY → keep the credit in the footer.)
   If the file is missing/broken, the procedural tooth is used.
   Tweak these if the model looks too big/small or rotated:
   ============================================================ */
// Simplified + Draco-compressed build of tooth.glb (59 MB → 0.9 MB) so the
// hero shows quickly. tooth-min.glb (3 MB, full-detail mesh) and the
// uncompressed public/tooth.glb are kept if you ever need to rebuild it.
const MODEL_URL = import.meta.env.BASE_URL + 'tooth-lite.glb';
// Self-hosted decoder (copied from three/examples/jsm/libs/draco/gltf) — no
// third-party CDN in the critical path, and index.html can preload it.
const DRACO_PATH = import.meta.env.BASE_URL + 'draco/';
// If the model still hasn't arrived by now, show the procedural tooth rather
// than an empty hero. The real model swaps in whenever it does land.
const FALLBACK_AFTER_MS = 8000;
const MODEL_TUNING = {
  targetSize: 2.7, // largest dimension is scaled to this many world units
  rotation: [0, -Math.PI / 1, 0], // radians [x, y, z] — turns the model's front toward the camera
  offset: [0, 0, 0], // nudge [x, y, z] after centering
  extraScale: 1, // final multiplier on top of the auto-fit
  showPulp: false, // red pulp core only makes sense for a single tooth
};

/* ---------- easing ---------- */
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Interpolate a scalar across an ordered list of keyframes { at, val },
 * applying easeInOut within each segment. `at` values are 0..1 progress.
 */
function keyed(progress, frames) {
  if (progress <= frames[0].at) return frames[0].val;
  const last = frames[frames.length - 1];
  if (progress >= last.at) return last.val;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (progress >= a.at && progress <= b.at) {
      const local = (progress - a.at) / (b.at - a.at);
      return lerp(a.val, b.val, easeInOut(local));
    }
  }
  return last.val;
}

export function createToothScene(canvas, { reducedMotion = false } = {}) {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;

  /* ---------- scene + camera ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  /* ---------- lights (bright / clinical) ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 6, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9fe0c4, 1.0);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-3, -4, 5);
  scene.add(fill);

  /* ---------- clipping plane for the cross-section ---------- */
  // Plane normal points +X; geometry with x > constant is hidden.
  const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 10); // start fully open (nothing clipped)

  /* ---------- materials ---------- */
  const enamelMat = new THREE.MeshStandardMaterial({
    color: ENAMEL,
    roughness: 0.45,
    metalness: 0.0,
    clippingPlanes: [clipPlane],
    clipShadows: true,
    side: THREE.DoubleSide, // so the sliced interior isn't see-through
    transparent: true,
    opacity: 1,
  });

  const dentinMat = new THREE.MeshStandardMaterial({
    color: 0xe9dcc4,
    roughness: 0.7,
    clippingPlanes: [clipPlane],
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  });

  // Pulp / root-canal core — NOT clipped, so slicing the enamel reveals it.
  const pulpMat = new THREE.MeshStandardMaterial({
    color: PULP,
    roughness: 0.35,
    emissive: 0x4a0f0d,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 1,
  });

  const allMats = [enamelMat, dentinMat, pulpMat];

  /* ============================================================
     Build the molar (procedural — used as fallback if no .glb)
     ============================================================ */
  const tooth = new THREE.Group();

  // Everything enamel goes in here so we can swap it out for a loaded model.
  const proceduralGroup = new THREE.Group();
  tooth.add(proceduralGroup);

  // --- Crown: rounded box-sphere ---
  const crownGeo = new RoundedBoxGeometry(1.7, 1.5, 1.7, 8, 0.62);
  const crown = new THREE.Mesh(crownGeo, enamelMat);
  crown.position.y = 0.55;
  // squash the top a touch so cusps read
  crown.scale.set(1, 0.92, 1);
  proceduralGroup.add(crown);

  // --- 4 raised cusps on top ---
  const cuspGeo = new THREE.SphereGeometry(0.42, 32, 24);
  const cuspPositions = [
    [0.42, 0, 0.42],
    [-0.42, 0, 0.42],
    [0.42, 0, -0.42],
    [-0.42, 0, -0.42],
  ];
  for (const [x, , z] of cuspPositions) {
    const cusp = new THREE.Mesh(cuspGeo, enamelMat);
    cusp.position.set(x, 1.28, z);
    cusp.scale.set(1, 0.82, 1);
    proceduralGroup.add(cusp);
  }

  // --- Neck: slight taper between crown and roots ---
  const neckGeo = new THREE.CylinderGeometry(0.72, 0.62, 0.5, 40);
  const neck = new THREE.Mesh(neckGeo, enamelMat);
  neck.position.y = -0.35;
  proceduralGroup.add(neck);

  // --- 3 curved roots splaying downward, merging into the crown ---
  function makeRoot(splayX, splayZ) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.2, 0),
      new THREE.Vector3(splayX * 0.35, -0.9, splayZ * 0.35),
      new THREE.Vector3(splayX * 0.8, -1.7, splayZ * 0.8),
      new THREE.Vector3(splayX * 1.05, -2.5, splayZ * 1.05),
    ]);
    // taper radius along length via custom frames
    const segs = 40;
    const geo = new THREE.TubeGeometry(curve, segs, 0.34, 20, false);
    // taper: scale each ring's radius by t (thicker at top)
    const pos = geo.attributes.position;
    const tubularSegments = segs;
    const radialSegments = 20;
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const taper = lerp(1.0, 0.18, t); // thin toward the tip
      const center = curve.getPointAt(t);
      for (let j = 0; j <= radialSegments; j++) {
        const idx = i * (radialSegments + 1) + j;
        const vx = pos.getX(idx);
        const vy = pos.getY(idx);
        const vz = pos.getZ(idx);
        // vector from centerline to surface
        const dx = vx - center.x;
        const dy = vy - center.y;
        const dz = vz - center.z;
        pos.setXYZ(
          idx,
          center.x + dx * taper,
          center.y + dy * taper,
          center.z + dz * taper
        );
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, enamelMat);
    mesh.position.y = -0.4;
    return mesh;
  }

  proceduralGroup.add(makeRoot(1, 0.6));
  proceduralGroup.add(makeRoot(-1, 0.6));
  proceduralGroup.add(makeRoot(0, -1));

  /* --- Inner pulp / root-canal core (reddish, revealed on slice) --- */
  const pulpGroup = new THREE.Group();

  // pulp chamber inside the crown
  const chamberGeo = new THREE.SphereGeometry(0.6, 24, 20);
  const chamber = new THREE.Mesh(chamberGeo, pulpMat);
  chamber.position.y = 0.5;
  chamber.scale.set(0.85, 0.9, 0.85);
  pulpGroup.add(chamber);

  // canals threading down each root
  function makeCanal(splayX, splayZ) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(splayX * 0.35, -0.9, splayZ * 0.35),
      new THREE.Vector3(splayX * 0.8, -1.7, splayZ * 0.8),
      new THREE.Vector3(splayX * 1.0, -2.4, splayZ * 1.0),
    ]);
    const geo = new THREE.TubeGeometry(curve, 30, 0.1, 10, false);
    const mesh = new THREE.Mesh(geo, pulpMat);
    mesh.position.y = -0.4;
    return mesh;
  }
  pulpGroup.add(makeCanal(1, 0.6));
  pulpGroup.add(makeCanal(-1, 0.6));
  pulpGroup.add(makeCanal(0, -1));

  tooth.add(pulpGroup);

  // A thin dentin shell just under the enamel for a richer sliced look
  const dentinGeo = new RoundedBoxGeometry(1.45, 1.28, 1.45, 6, 0.5);
  const dentin = new THREE.Mesh(dentinGeo, dentinMat);
  dentin.position.y = 0.55;
  dentin.scale.set(1, 0.92, 1);
  proceduralGroup.add(dentin);

  scene.add(tooth);

  // overall group used for position/scale so we don't fight local transforms
  const rig = new THREE.Group();
  rig.add(tooth);
  scene.remove(tooth);
  scene.add(rig);

  /* ============================================================
     Try to load a downloaded .glb model.
     On success it REPLACES the procedural enamel; on failure the
     procedural molar simply stays. Runs async — the render loop is
     already going, so the swap happens live when the file arrives.
     ============================================================ */
  const loadedMeshMats = []; // materials we add clipping to, disposed on teardown

  function disposeGroup(group) {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    group.parent && group.parent.remove(group);
  }

  function fitAndCenter(obj, targetSize) {
    obj.updateWorldMatrix(true, true);
    let box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.setScalar(targetSize / maxDim);
    obj.updateWorldMatrix(true, true);
    box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center); // recenter to origin
  }

  function loadModel() {
    const loader = new GLTFLoader();
    // Support Draco-compressed downloads (decoder fetched only if needed).
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    loader.setDRACOLoader(draco);

    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;
        fitAndCenter(model, MODEL_TUNING.targetSize);

        // Only slice the model in the cross-section scene when it's a single
        // tooth (showPulp). A full mouth is a hollow shell — slicing it just
        // shows an empty inside, so we leave it whole.
        model.traverse((c) => {
          if (c.isMesh && c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => {
              if (MODEL_TUNING.showPulp) {
                m.clippingPlanes = [clipPlane];
                m.clipShadows = true;
                m.side = THREE.DoubleSide;
                m.needsUpdate = true;
              }
              loadedMeshMats.push(m);
            });
          }
        });

        // wrapper carries user tuning (rotation / offset / extra scale)
        const wrap = new THREE.Group();
        wrap.rotation.set(...MODEL_TUNING.rotation);
        wrap.position.set(...MODEL_TUNING.offset);
        wrap.scale.multiplyScalar(MODEL_TUNING.extraScale);
        wrap.add(model);

        // swap: remove procedural enamel (and pulp unless explicitly wanted)
        disposeGroup(proceduralGroup);
        if (!MODEL_TUNING.showPulp) disposeGroup(pulpGroup);

        tooth.add(wrap);
        clearTimeout(fallbackTimer);
        console.info('[tooth] loaded model from', MODEL_URL);
      },
      undefined,
      () => {
        // No file / failed to parse — NOW reveal the procedural molar as a fallback.
        proceduralGroup.visible = true;
        pulpGroup.visible = true;
        console.info(
          `[tooth] no model at ${MODEL_URL} — using the procedural tooth. ` +
            'Drop your .glb at public/tooth.glb to use it.'
        );
        draco.dispose();
      }
    );
  }

  // Hide the procedural fallback while the real model downloads, so it never
  // flashes on screen — it's only revealed if the model fails to load (above).
  proceduralGroup.visible = false;
  pulpGroup.visible = false;
  const fallbackTimer = setTimeout(() => {
    proceduralGroup.visible = true;
    pulpGroup.visible = true;
  }, FALLBACK_AFTER_MS);
  loadModel();

  /* ============================================================
     Keyframes across the 3 scenes (progress 0..1)
        0.00  scene 1 (hero)     — right, gentle
        0.50  scene 2 (imaging)  — 2 turns, closer, left
        1.00  scene 3 (cross)    — centered, sliced open
     ============================================================ */
  const KF = {
    camZ: [
      { at: 0.0, val: 6.6 },
      { at: 0.5, val: 5.6 }, // gentler zoom-in (was 4.2 — too close)
      { at: 1.0, val: 6.0 },
    ],
    rotY: [
      { at: 0.0, val: 0.0 },
      { at: 0.5, val: Math.PI * 0.85 }, // gentle ~half turn by scene 2
      { at: 1.0, val: Math.PI * 1.25 }, // slow drift into the cross-section
    ],
    posX: [
      { at: 0.0, val: 2.3 }, // hero: centered in view
      { at: 0.5, val: -2.2 }, // left
      { at: 1.0, val: 2.5 }, // back to the right (content sits on the left)
    ],
    posY: [
      { at: 0.0, val: -0.1 },
      { at: 0.5, val: 0.1 },
      { at: 1.0, val: 0.0 },
    ],
    scale: [
      { at: 0.0, val: 1.0 },
      { at: 0.5, val: 1.18 },
      { at: 1.0, val: 1.12 },
    ],
    // slice: 0 = closed, 1 = fully sliced (only ramps in scene 3)
    slice: [
      { at: 0.0, val: 0.0 },
      { at: 0.62, val: 0.0 },
      { at: 1.0, val: 1.0 },
    ],
  };

  /* ---------- interaction state ---------- */
  let scrollProgress = 0; // 0..1 across the 3 scenes
  let fade = 1; // canvas opacity target (post-scenes)
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const state = { rotY: 0, posX: KF.posX[0].val, posY: 0, scale: 1, camZ: 6.2, slice: 0 };

  function setProgress(p, fadeVal) {
    scrollProgress = clamp(p, 0, 1);
    fade = clamp(fadeVal, 0, 1);
  }

  function onMouse(e) {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }
  if (!reducedMotion) window.addEventListener('mousemove', onMouse, { passive: true });

  /* ---------- responsive fit ----------
     On narrow / portrait screens the horizontal field of view shrinks, so a
     wide model balloons. Push the camera back to keep it framed, and fade the
     canvas right down so text stays readable over it. */
  let fitZoom = 1;
  let maxOpacity = 1;
  function updateResponsive() {
    const w = window.innerWidth;
    const aspect = w / window.innerHeight;
    fitZoom = clamp(1.5 / aspect, 1, 2.8); // zoom out on portrait
    maxOpacity = w < 768 ? 0.16 : 1; // faint tooth behind mobile text
  }
  updateResponsive();

  /* ---------- resize ---------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateResponsive();
  }
  window.addEventListener('resize', resize);

  /* ---------- render loop ---------- */
  let raf = 0;
  let idleT = 0;
  const targetSlicePlane = { x: 0 }; // clip constant sweeps from +2 (open) to 0 (half)

  function frame() {
    raf = requestAnimationFrame(frame);

    const p = scrollProgress;

    // targets from keyframes
    const tRotY = keyed(p, KF.rotY);
    const tPosX = keyed(p, KF.posX);
    const tPosY = keyed(p, KF.posY);
    const tScale = keyed(p, KF.scale);
    const tCamZ = keyed(p, KF.camZ);
    const tSlice = keyed(p, KF.slice);

    // gentle idle float/rotation (hero + generally) unless reduced motion
    idleT += 0.008;
    const idleRot = reducedMotion ? 0 : Math.sin(idleT) * 0.12 * (1 - p * 0.6);
    const idleFloat = reducedMotion ? 0 : Math.sin(idleT * 1.3) * 0.06 * (1 - p);

    // smooth mouse parallax
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const parX = reducedMotion ? 0 : mouse.x * 0.18;
    const parY = reducedMotion ? 0 : mouse.y * 0.14;

    // ease state toward targets for extra smoothness
    const k = reducedMotion ? 1 : 0.12;
    state.rotY = lerp(state.rotY, tRotY, k);
    state.posX = lerp(state.posX, tPosX, k);
    state.posY = lerp(state.posY, tPosY, k);
    state.scale = lerp(state.scale, tScale, k);
    state.camZ = lerp(state.camZ, tCamZ, k);
    state.slice = lerp(state.slice, tSlice, k);

    // apply transforms
    rig.position.x = state.posX + parX;
    rig.position.y = state.posY + idleFloat + parY * 0.5;
    rig.scale.setScalar(state.scale);

    // BASE_TILT = 0 → model sits at its level, front/center view at rest.
    // (raise/lower this to look slightly down/up at the model)
    const BASE_TILT = 0;
    tooth.rotation.y = state.rotY + idleRot + parX * 0.5;
    tooth.rotation.x = BASE_TILT + idleFloat * 0.4 + parY * 0.25;

    camera.position.z = state.camZ * fitZoom;

    // slice: fully-open constant is kept well outside the model's rotated
    // X-extent so scenes 1-2 never clip; only scene 3 sweeps it in to a half cut.
    clipPlane.constant = lerp(3.2, -0.05, state.slice);

    // canvas fade after the 3 scenes (and kept faint on mobile)
    const targetOpacity = fade * maxOpacity;
    const cur = parseFloat(canvas.style.opacity || '1');
    canvas.style.opacity = lerp(cur, targetOpacity, 0.1).toFixed(3);

    renderer.render(scene, camera);
  }

  frame();

  /* ---------- teardown ---------- */
  function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouse);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    allMats.forEach((m) => m.dispose());
    loadedMeshMats.forEach((m) => m.dispose());
    renderer.dispose();
  }

  return { setProgress, dispose, resize };
}
