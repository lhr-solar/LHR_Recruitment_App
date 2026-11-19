// Turns a STEP or STL file into the small mesh recruiters load, off the main thread. It runs once,
// in the student's browser at upload, so Partners never download or convert the CAD file itself.
//
// Mesh format, little-endian, gzipped: "LHRM", u32 version (1), u32 flags (1 = flat shading),
// u32 group count, then per colour group: f32 r, g, b, u32 vertex count, u32 index count,
// f32 positions[vertices * 3], u32 indices[count].

const OCCT = "/vendor/occt-import-js-0.0.23/";
const SIMPLIFIER = "/vendor/meshoptimizer-1.3.0/meshopt_simplifier.js";
const DEFAULT_COLOR = [0.62, 0.65, 0.69];
// Enough detail to read a part or a board, and still quick to open on a recruiter's laptop.
const MAX_PREVIEW_TRIANGLES = 1500000;

let occt = null;

onmessage = async (event) => {
  const { file, format } = event.data;
  try {
    // The file's bytes aren't kept past parsing, so a big STL doesn't hold them through the weld.
    const model = format === "step" ? await readStep(new Uint8Array(await file.arrayBuffer())) : readStl(new Uint8Array(await file.arrayBuffer()));
    if (!model) return postMessage({ type: "error", reason: "unreadable" });
    let triangles = model.groups.reduce((sum, group) => sum + group.indices.length / 3, 0);
    // OpenCascade returns empty parts, rather than failing, when a model outgrows its 2 GB of memory.
    if (triangles === 0) return postMessage({ type: "error", reason: format === "step" ? "too_detailed" : "unreadable" });

    if (triangles > MAX_PREVIEW_TRIANGLES) triangles = await simplify(model, triangles);

    const packed = pack(model);
    const preview = await new Response(new Blob([packed]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    postMessage({ type: "done", preview, triangles }, [preview]);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const outOfMemory = error instanceof RangeError || /memory|OOM|Aborted/i.test(message);
    postMessage({ type: "error", reason: outOfMemory ? "too_detailed" : "unreadable" });
  }
};

async function readStep(bytes) {
  if (!occt) {
    importScripts(OCCT + "occt-import-js.js");
    occt = await occtimportjs({ locateFile: (name) => OCCT + name });
  }
  const result = occt.ReadStepFile(bytes, null);
  if (!result.success) return null;

  // One draw call per colour instead of one per part: board exports have thousands of parts.
  const groups = new Map();
  for (const mesh of result.meshes) {
    const positions = mesh.attributes.position.array;
    const index = mesh.index.array;
    const faces = mesh.brep_faces && mesh.brep_faces.length ? mesh.brep_faces : [{ first: 0, last: index.length / 3 - 1, color: null }];
    const remaps = new Map();

    for (const face of faces) {
      const color = face.color || mesh.color || DEFAULT_COLOR;
      const key = color.map((c) => Math.round(c * 255)).join(",");
      let group = groups.get(key);
      if (!group) groups.set(key, (group = { color, positions: [], indices: [] }));
      let remap = remaps.get(key);
      if (!remap) remaps.set(key, (remap = new Int32Array(positions.length / 3).fill(-1)));

      for (let i = face.first * 3; i <= face.last * 3 + 2; i++) {
        const vertex = index[i];
        if (remap[vertex] === -1) {
          remap[vertex] = group.positions.length / 3;
          group.positions.push(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]);
        }
        group.indices.push(remap[vertex]);
      }
    }
  }

  return { flat: false, groups: [...groups.values()].filter((group) => group.indices.length > 0) };
}

function readStl(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = bytes.byteLength >= 84 ? view.getUint32(80, true) : -1;
  let corners;

  // Binary STL is exactly 84 + 50 bytes a triangle. Some exporters still start the header with
  // "solid", so the size decides, not the first word.
  if (count >= 0 && 84 + count * 50 === bytes.byteLength) {
    corners = new Float32Array(count * 9);
    for (let t = 0; t < count; t++) {
      const offset = 84 + t * 50 + 12;
      for (let j = 0; j < 9; j++) corners[t * 9 + j] = view.getFloat32(offset + j * 4, true);
    }
  } else {
    const text = new TextDecoder().decode(bytes);
    if (!/^\s*solid/.test(text)) return null;
    const values = [];
    for (const match of text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) values.push(+match[1], +match[2], +match[3]);
    values.length -= values.length % 9;
    corners = Float32Array.from(values);
  }

  return weld(corners);
}

// Corners shared between triangles become one vertex, which roughly halves the preview. An
// open-addressing table over the coordinates' bits keeps a 250 MB file to a few hundred MB of memory.
function weld(corners) {
  const bits = new Uint32Array(corners.buffer, corners.byteOffset, corners.length);
  let size = 1;
  while (size < (corners.length / 3) * 2) size *= 2;
  const table = new Int32Array(size).fill(-1);
  const positions = new Float32Array(corners.length);
  const kept = new Uint32Array(positions.buffer);
  const indices = new Uint32Array(corners.length / 3);
  let vertices = 0;
  let count = 0;

  for (let t = 0; t < corners.length; t += 9) {
    let finite = true;
    for (let j = t; j < t + 9; j++) if (!Number.isFinite(corners[j])) finite = false;
    if (!finite) continue;
    for (let c = t; c < t + 9; c += 3) {
      const x = bits[c], y = bits[c + 1], z = bits[c + 2];
      let slot = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & (size - 1);
      for (;;) {
        const vertex = table[slot];
        if (vertex === -1) {
          table[slot] = vertices;
          kept[vertices * 3] = x;
          kept[vertices * 3 + 1] = y;
          kept[vertices * 3 + 2] = z;
          indices[count++] = vertices++;
          break;
        }
        if (kept[vertex * 3] === x && kept[vertex * 3 + 1] === y && kept[vertex * 3 + 2] === z) {
          indices[count++] = vertex;
          break;
        }
        slot = (slot + 1) & (size - 1);
      }
    }
  }

  // STL has no smooth surfaces to recover, so it's shaded flat, facet by facet.
  return { flat: true, groups: [{ color: DEFAULT_COLOR, positions: positions.subarray(0, vertices * 3), indices: indices.subarray(0, count) }] };
}

// Cuts each colour group down in proportion, keeping the overall shape (meshoptimizer).
async function simplify(model, triangles) {
  const { MeshoptSimplifier } = await import(SIMPLIFIER);
  await MeshoptSimplifier.ready;
  const share = MAX_PREVIEW_TRIANGLES / triangles;
  let total = 0;

  for (const group of model.groups) {
    const positions = group.positions instanceof Float32Array ? group.positions : Float32Array.from(group.positions);
    const indices = group.indices instanceof Uint32Array ? group.indices : Uint32Array.from(group.indices);
    const target = Math.max(3, Math.floor((indices.length / 3) * share) * 3);
    const [simplified] = MeshoptSimplifier.simplify(indices, positions, 3, target, 0.05);
    // Drop the vertices nothing points at any more.
    const [remap, unique] = MeshoptSimplifier.compactMesh(simplified);
    const compacted = new Float32Array(unique * 3);
    for (let v = 0; v < remap.length; v++) {
      if (remap[v] !== 0xffffffff) compacted.set(positions.subarray(v * 3, v * 3 + 3), remap[v] * 3);
    }
    group.positions = compacted;
    group.indices = simplified;
    total += simplified.length / 3;
  }
  return total;
}

function pack(model) {
  let size = 16;
  for (const group of model.groups) size += 20 + group.positions.length * 4 + group.indices.length * 4;

  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set([76, 72, 82, 77]); // "LHRM"
  view.setUint32(4, 1, true);
  view.setUint32(8, model.flat ? 1 : 0, true);
  view.setUint32(12, model.groups.length, true);

  let offset = 16;
  for (const group of model.groups) {
    view.setFloat32(offset, group.color[0], true);
    view.setFloat32(offset + 4, group.color[1], true);
    view.setFloat32(offset + 8, group.color[2], true);
    view.setUint32(offset + 12, group.positions.length / 3, true);
    view.setUint32(offset + 16, group.indices.length, true);
    offset += 20;
    new Float32Array(buffer, offset, group.positions.length).set(group.positions);
    offset += group.positions.length * 4;
    new Uint32Array(buffer, offset, group.indices.length).set(group.indices);
    offset += group.indices.length * 4;
  }
  return buffer;
}
