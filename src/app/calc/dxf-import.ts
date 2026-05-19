/**
 * DXF importer — reads a DXF file, extracts sprinklers + pipes + junctions
 * from layered geometry, and returns Project nodes + pipes ready to import.
 *
 * EXPECTED DXF CONVENTIONS (the DXF must follow these for auto-import to work):
 *
 *   Layers (case-insensitive; "HF-" prefix optional):
 *     - SPRINKLERS or HF-SPRINKLERS
 *         CIRCLE or POINT entities, one per sprinkler. The center is the
 *         sprinkler location. The radius is ignored.
 *     - JUNCTIONS or HF-JUNCTIONS  (optional)
 *         CIRCLE or POINT entities for non-discharge tees / headers / risers.
 *     - SOURCE or HF-SOURCE
 *         A single CIRCLE or POINT marking the water-supply inflow.
 *     - PIPES or HF-PIPES
 *         LINE or LWPOLYLINE entities. Endpoints must coincide with the
 *         center of a node (sprinkler / junction / source) within a tolerance
 *         (default: 6 inches).
 *
 *   Drawing units ($INSUNITS in the DXF header):
 *     - 1 = inches, 2 = feet, 4 = millimeters, 5 = centimeters, 6 = meters.
 *       All entity coordinates are converted to feet internally.
 *     - If $INSUNITS is missing or "unspecified" we assume FEET (Elite default).
 *
 *   Auto-numbering:
 *     - Sprinklers get IDs 1, 2, 3, …
 *     - Junctions get IDs 30, 31, 32, …
 *     - Source gets ID 100.
 *
 *   Default per-node properties (user can edit after import in the Nodes tab):
 *     - Sprinkler: K-factor = project.defaultKFactor, elevation = 10.5 ft.
 *     - Junction: elevation = 10.5 ft.
 *     - Source: elevation = 0 ft.
 *
 *   Default per-pipe properties:
 *     - Material = project.defaultPipeMaterial
 *     - Nominal diameter = 1.5"
 *     (You can override per-pipe by drawing TEXT/MTEXT entities on the same
 *      PIPES layer with content like `DN:2.0` near the pipe midpoint —
 *      this is parsed and applied. See `parsePipeAnnotations` below.)
 */

import DxfParser from 'dxf-parser';

import {
  PipeMaterialKey,
  ProjectNode,
  ProjectPipe,
} from '../core/models';

// ----- Configuration -----

/** Snap tolerance for pipe endpoint -> node coordinate (feet). */
const SNAP_TOLERANCE_FT = 0.5;

const LAYER_ALIASES: Record<string, 'sprinklers' | 'junctions' | 'source' | 'pipes'> = {};
for (const base of ['SPRINKLERS', 'JUNCTIONS', 'SOURCE', 'PIPES']) {
  LAYER_ALIASES[base] = base.toLowerCase() as 'sprinklers' | 'junctions' | 'source' | 'pipes';
  LAYER_ALIASES[`HF-${base}`] = base.toLowerCase() as 'sprinklers' | 'junctions' | 'source' | 'pipes';
  LAYER_ALIASES[`HF_${base}`] = base.toLowerCase() as 'sprinklers' | 'junctions' | 'source' | 'pipes';
}

// AutoCAD INSUNITS code → conversion factor to feet.
const INSUNITS_TO_FEET: Record<number, number> = {
  0: 1, // unspecified — treat as feet
  1: 1 / 12, // inches
  2: 1, // feet
  4: 1 / 304.8, // millimeters
  5: 1 / 30.48, // centimeters
  6: 3.28084, // meters
  // additional codes (yards, miles) unused for sprinkler systems
};

// ----- Public API -----

export interface DxfImportResult {
  nodes: ProjectNode[];
  pipes: ProjectPipe[];
  warnings: string[];
  stats: {
    sprinklersFound: number;
    junctionsFound: number;
    sourceFound: boolean;
    pipesFound: number;
    pipesUnsnapped: number;
    drawingUnit: string;
  };
}

export interface ImportOptions {
  defaultKFactor: number;
  defaultMaterial: PipeMaterialKey;
  defaultElevationFt: number;
  defaultPipeDiameterIn: number;
}

export function importDxf(dxfText: string, opts: ImportOptions): DxfImportResult {
  const parser = new DxfParser();
  // dxf-parser's TS definitions are loose; cast to a workable shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = parser.parseSync(dxfText);
  if (!parsed) throw new Error('Failed to parse DXF file');

  const warnings: string[] = [];

  // Determine drawing unit.
  const insunits: number = parsed.header?.$INSUNITS ?? 0;
  const ftPerUnit = INSUNITS_TO_FEET[insunits] ?? 1;
  const unitLabel = unitNameFromCode(insunits);

  // Bucket entities by layer.
  const sprinklerCenters: { x: number; y: number }[] = [];
  const junctionCenters: { x: number; y: number }[] = [];
  const sourceCenters: { x: number; y: number }[] = [];
  const pipeSegments: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const pipeAnnotations: { x: number; y: number; text: string }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const entity of parsed.entities ?? []) {
    const layerKey = (entity.layer ?? '').toString().toUpperCase();
    const bucket = LAYER_ALIASES[layerKey];
    if (!bucket) continue;

    if (bucket === 'sprinklers' || bucket === 'junctions' || bucket === 'source') {
      const c = entityCenter(entity);
      if (c) {
        const ft = { x: c.x * ftPerUnit, y: c.y * ftPerUnit };
        if (bucket === 'sprinklers') sprinklerCenters.push(ft);
        else if (bucket === 'junctions') junctionCenters.push(ft);
        else sourceCenters.push(ft);
      }
      continue;
    }

    if (bucket === 'pipes') {
      if (entity.type === 'LINE') {
        const a = { x: entity.vertices[0].x * ftPerUnit, y: entity.vertices[0].y * ftPerUnit };
        const b = { x: entity.vertices[1].x * ftPerUnit, y: entity.vertices[1].y * ftPerUnit };
        pipeSegments.push({ a, b });
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const vs = entity.vertices ?? [];
        for (let i = 0; i < vs.length - 1; i++) {
          const a = { x: vs[i].x * ftPerUnit, y: vs[i].y * ftPerUnit };
          const b = { x: vs[i + 1].x * ftPerUnit, y: vs[i + 1].y * ftPerUnit };
          pipeSegments.push({ a, b });
        }
      } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const pos = entity.position ?? entity.startPoint;
        if (pos) {
          pipeAnnotations.push({
            x: pos.x * ftPerUnit,
            y: pos.y * ftPerUnit,
            text: (entity.text ?? entity.string ?? '').toString(),
          });
        }
      }
    }
  }

  if (sourceCenters.length > 1) {
    warnings.push(`Multiple SOURCE entities found (${sourceCenters.length}); using the first.`);
  }
  if (sourceCenters.length === 0) {
    warnings.push('No SOURCE entity found. Add a circle on the SOURCE layer at the water-supply location.');
  }

  // Assign IDs.
  const sprinklerNodes: ProjectNode[] = sprinklerCenters.map((c, i) => ({
    id: i + 1,
    description: 'sprinkler',
    kFactor: opts.defaultKFactor,
    elevationFt: opts.defaultElevationFt,
    areaGroup: '130',
    _coords: c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;

  const junctionNodes: ProjectNode[] = junctionCenters.map((c, i) => ({
    id: 30 + i,
    description: 'no-discharge',
    kFactor: 0,
    elevationFt: opts.defaultElevationFt,
    _coords: c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;

  const sourceNode: ProjectNode | null = sourceCenters[0]
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({
        id: 100,
        description: 'no-discharge',
        kFactor: 0,
        elevationFt: 0,
        _coords: sourceCenters[0],
      } as any)
    : null;

  const allCoords: { id: number; x: number; y: number }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const n of sprinklerNodes) allCoords.push({ id: n.id, x: (n as any)._coords.x, y: (n as any)._coords.y });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const n of junctionNodes) allCoords.push({ id: n.id, x: (n as any)._coords.x, y: (n as any)._coords.y });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (sourceNode) allCoords.push({ id: sourceNode.id, x: (sourceNode as any)._coords.x, y: (sourceNode as any)._coords.y });

  // Snap pipe endpoints to node IDs.
  const pipes: ProjectPipe[] = [];
  let unsnapped = 0;
  for (const seg of pipeSegments) {
    const begId = snapToNode(seg.a, allCoords, SNAP_TOLERANCE_FT);
    const endId = snapToNode(seg.b, allCoords, SNAP_TOLERANCE_FT);
    if (begId == null || endId == null) {
      unsnapped++;
      continue;
    }
    if (begId === endId) continue;
    const lengthFt = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
    // Look for a nearby pipe annotation for diameter override.
    const annotation = nearestAnnotation(seg, pipeAnnotations);
    const overrideDia = annotation ? parsePipeDiameterAnnotation(annotation.text) : null;
    pipes.push({
      begNode: begId,
      endNode: endId,
      materialKey: opts.defaultMaterial,
      nominalDiameterIn: overrideDia ?? opts.defaultPipeDiameterIn,
      nominalLengthFt: round(lengthFt, 2),
      fittingCode: undefined,
    });
  }

  if (unsnapped > 0) {
    warnings.push(`${unsnapped} pipe endpoint(s) did not snap to any node — check geometry / SNAP tolerance (${SNAP_TOLERANCE_FT} ft).`);
  }

  // Strip transient _coords field from nodes before returning.
  const cleanNodes: ProjectNode[] = [
    ...sprinklerNodes.map(stripCoords),
    ...junctionNodes.map(stripCoords),
    ...(sourceNode ? [stripCoords(sourceNode)] : []),
  ];

  return {
    nodes: cleanNodes,
    pipes,
    warnings,
    stats: {
      sprinklersFound: sprinklerNodes.length,
      junctionsFound: junctionNodes.length,
      sourceFound: !!sourceNode,
      pipesFound: pipes.length,
      pipesUnsnapped: unsnapped,
      drawingUnit: unitLabel,
    },
  };
}

// ----- Helpers -----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entityCenter(entity: any): { x: number; y: number } | null {
  if (entity.type === 'CIRCLE') {
    if (entity.center) return { x: entity.center.x, y: entity.center.y };
  }
  if (entity.type === 'POINT') {
    if (entity.position) return { x: entity.position.x, y: entity.position.y };
  }
  return null;
}

function snapToNode(
  pt: { x: number; y: number },
  coords: { id: number; x: number; y: number }[],
  tol: number,
): number | null {
  let best: number | null = null;
  let bestDist = tol;
  for (const c of coords) {
    const d = Math.hypot(c.x - pt.x, c.y - pt.y);
    if (d <= bestDist) {
      bestDist = d;
      best = c.id;
    }
  }
  return best;
}

function nearestAnnotation(
  seg: { a: { x: number; y: number }; b: { x: number; y: number } },
  annotations: { x: number; y: number; text: string }[],
): { text: string } | null {
  const mid = { x: 0.5 * (seg.a.x + seg.b.x), y: 0.5 * (seg.a.y + seg.b.y) };
  const segLen = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
  const tol = Math.max(2.0, 0.25 * segLen);
  let best: { text: string } | null = null;
  let bestDist = tol;
  for (const a of annotations) {
    const d = Math.hypot(a.x - mid.x, a.y - mid.y);
    if (d <= bestDist) {
      bestDist = d;
      best = { text: a.text };
    }
  }
  return best;
}

/** Parse "DN:2.0" / "DN 1.5" / "2" out of an annotation string → nominal inches. */
function parsePipeDiameterAnnotation(text: string): number | null {
  const m = /DN[\s:]*([\d.]+)/i.exec(text) ?? /^([\d.]+)["]?$/.exec(text.trim());
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function unitNameFromCode(code: number): string {
  return {
    0: 'unspecified (treated as ft)',
    1: 'inches',
    2: 'feet',
    4: 'millimeters',
    5: 'centimeters',
    6: 'meters',
  }[code] ?? `code ${code}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripCoords(n: any): ProjectNode {
  const { _coords, ...rest } = n;
  void _coords;
  return rest as ProjectNode;
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
