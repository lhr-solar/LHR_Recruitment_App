import type { ModelFormat } from "@/lib/student-options";

// The browser side of public/workers/model-preview.js, which describes the mesh format.

export type PreviewError = "unreadable" | "too_detailed";
export type MeshGroup = { color: [number, number, number]; positions: Float32Array; indices: Uint32Array };
export type ModelMesh = { flat: boolean; groups: MeshGroup[] };

// Converts in a worker, so the page stays responsive through a minute-long STEP conversion.
export function makeModelPreview(file: File, format: ModelFormat): Promise<{ preview: ArrayBuffer } | { error: PreviewError }> {
  return new Promise((resolve) => {
    const worker = new Worker("/workers/model-preview.js");
    const finish = (result: { preview: ArrayBuffer } | { error: PreviewError }) => {
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "done") finish({ preview: event.data.preview });
      else finish({ error: event.data.reason === "too_detailed" ? "too_detailed" : "unreadable" });
    };
    // A worker that dies (usually out of memory) reports here rather than posting a message.
    worker.onerror = () => finish({ error: "too_detailed" });
    worker.postMessage({ file, format });
  });
}

// Fetches a preview, reporting progress when the size is known.
export async function loadModelMesh(url: string, onProgress: (fraction: number) => void, signal: AbortSignal): Promise<ModelMesh | null> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok || !response.body) return null;

  const total = Number(response.headers.get("content-length")) || 0;
  let loaded = 0;
  const counted = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        if (total) onProgress(Math.min(1, loaded / total));
        controller.enqueue(chunk);
      },
    }),
  );
  // Students upload the preview, so one that inflates far past any real mesh is cut off.
  let inflated = 0;
  const capped = (counted as ReadableStream<BufferSource>).pipeThrough(new DecompressionStream("gzip")).pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        inflated += chunk.byteLength;
        if (inflated > MAX_MESH_BYTES) controller.error(new Error("Preview too large"));
        else controller.enqueue(chunk);
      },
    }),
  );
  return readModelMesh(await new Response(capped).arrayBuffer());
}

const MAX_MESH_BYTES = 160 * 1024 * 1024;

function readModelMesh(buffer: ArrayBuffer): ModelMesh | null {
  if (buffer.byteLength < 16) return null;
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== "LHRM" || view.getUint32(4, true) !== 1) return null;

  const groups: MeshGroup[] = [];
  let offset = 16;
  for (let g = view.getUint32(12, true); g > 0; g--) {
    if (offset + 20 > buffer.byteLength) return null;
    const color: [number, number, number] = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    const vertices = view.getUint32(offset + 12, true);
    const count = view.getUint32(offset + 16, true);
    offset += 20;
    if (offset + vertices * 12 + count * 4 > buffer.byteLength) return null;
    const positions = new Float32Array(buffer, offset, vertices * 3);
    offset += vertices * 12;
    const indices = new Uint32Array(buffer, offset, count);
    offset += count * 4;
    if (count % 3 !== 0 || indices.some((index) => index >= vertices)) return null;
    groups.push({ color, positions, indices });
  }
  return { flat: (view.getUint32(8, true) & 1) === 1, groups };
}
