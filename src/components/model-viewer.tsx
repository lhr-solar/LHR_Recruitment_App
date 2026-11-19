"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadModelMesh } from "@/lib/model-preview";

// Draws a portfolio model's preview mesh. It renders only when the view changes, so an open
// viewer costs nothing while the recruiter reads.
export default function ModelViewer({ url, title }: { url: string; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const resetView = useRef<() => void>(() => {});
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const abort = new AbortController();
    let cleanup = () => {};

    loadModelMesh(url, setProgress, abort.signal)
      .then((mesh) => {
        if (abort.signal.aborted) return;
        if (!mesh || mesh.groups.length === 0) return setState("error");
        cleanup = draw(container, mesh, (reset) => (resetView.current = reset));
        setState("ready");
      })
      .catch(() => {
        if (!abort.signal.aborted) setState("error");
      });

    return () => {
      abort.abort();
      cleanup();
    };
  }, [url]);

  return (
    <div className="model-viewer">
      <div ref={host} className="model-canvas" role="img" aria-label={`3D model: ${title}`} data-state={state} />
      {state === "loading" && (
        <div className="model-status" role="status">
          <span className="spinner" aria-hidden="true" />
          {progress > 0 && progress < 1 ? `Loading model ${Math.round(progress * 100)}%` : "Loading model"}
        </div>
      )}
      {state === "error" && (
        <div className="model-status" role="alert">
          This model couldn&apos;t be shown. Download the file to open it in your CAD tool.
        </div>
      )}
      {state === "ready" && (
        <div className="model-toolbar">
          <p className="field-hint">Drag to rotate, scroll or pinch to zoom, right-drag or two fingers to pan.</p>
          <button type="button" className="btn btn-secondary" onClick={() => resetView.current()}>
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}

function draw(container: HTMLElement, mesh: NonNullable<Awaited<ReturnType<typeof loadModelMesh>>>, onReset: (reset: () => void) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const model = new THREE.Group();
  for (const group of mesh.groups) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(group.positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(group.indices, 1));
    if (!mesh.flat) geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(...group.color, THREE.SRGBColorSpace),
      roughness: 0.6,
      metalness: 0.05,
      flatShading: mesh.flat,
      // Board exports are open surfaces; their insides show through gaps.
      side: THREE.DoubleSide,
    });
    model.add(new THREE.Mesh(geometry, material));
  }
  scene.add(model);

  // CAD is Z-up. A light rides with the camera so the side facing the recruiter is always lit.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1e-6);
  const camera = new THREE.PerspectiveCamera(35, 1, radius / 100, radius * 100);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a99a6, 1.4));
  const headlight = new THREE.DirectionalLight(0xffffff, 1.8);
  headlight.position.set(0.5, 1, 1);
  camera.add(headlight);
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.zoomToCursor = true;
  const render = () => renderer.render(scene, camera);
  controls.addEventListener("change", render);

  const reset = () => {
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    camera.position.copy(center).add(new THREE.Vector3(1, -1.2, 0.9).normalize().multiplyScalar(distance));
    controls.target.copy(center);
    controls.update();
    render();
  };

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  reset();
  onReset(reset);

  return () => {
    observer.disconnect();
    controls.dispose();
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
