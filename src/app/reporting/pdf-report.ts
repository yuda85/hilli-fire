/**
 * PDF report generator — mirrors the 15-page Elite Software Fire layout:
 *   1.    Title page
 *   2.    General Project Data
 *   3-4.  Node Input Data
 *   5-6.  Pipe Input Data
 *   7-8.  Group Peak Node Groupings
 *   9-11. Group Peak Pipe Output Data
 *   12-13. Group Peak Sprinkler Output Data
 *   14.   Output Summary
 *   15.   Supply/Demand Graph
 *
 * Uses pdfmake for table layouts. The supply/demand graph is rendered by
 * Chart.js into a hidden canvas and embedded as a base64 PNG.
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { CalcResult, Project } from '../core/models';
import { activePumpPoints } from '../calc';

Chart.register(...registerables);

// pdfmake v0.3 ESM ships vfs at the named export `pdfMake`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs ?? (pdfFonts as any);

const PRIMARY = '#cc4400';
const FAINT = '#777777';

function f(n: number | undefined | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '----';
  return n.toFixed(digits);
}

function pageHeader(projectTitle: string): Content {
  return {
    columns: [
      { text: 'Fire — Sprinkler Hydraulics Calculation', fontSize: 9, color: FAINT },
      { text: 'Hilli Fire', alignment: 'center', fontSize: 9, color: PRIMARY, bold: true },
      { text: projectTitle || '—', alignment: 'right', fontSize: 9, color: FAINT },
    ],
    margin: [40, 16, 40, 0],
  };
}

function pageFooter(currentPage: number, totalPages: number, fileLabel: string): Content {
  return {
    columns: [
      { text: fileLabel, fontSize: 8, color: FAINT },
      { text: `Page ${currentPage} of ${totalPages}`, alignment: 'right', fontSize: 8, color: FAINT },
    ],
    margin: [40, 0, 40, 16],
  };
}

/** Render the supply/demand graph to a base64 PNG via Chart.js (off-screen). */
async function renderSupplyDemandGraph(project: Project, result: CalcResult | undefined): Promise<string | null> {
  const pump = activePumpPoints(project.pumpCurve);
  if (pump.length === 0 && !result) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  // Chart.js requires the canvas to be in the DOM in some browsers for proper rendering.
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const supplyData = pump
    .slice()
    .sort((a, b) => a.flowGpm - b.flowGpm)
    .map((p) => ({ x: p.flowGpm, y: p.pressurePsi }));

  // Demand curve: a single point (calculated flow + inflow residual) plus a
  // simple quadratic from 0 → calculated flow at increasing pressure.
  const demandPts: { x: number; y: number }[] = [];
  if (result) {
    const Qd = result.inflowFlowGpm;
    const Pd = result.inflowResidualPsi;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * Qd;
      demandPts.push({ x, y: (Pd * (x / Qd) ** 2) });
    }
  }

  const config: ChartConfiguration<'scatter'> = {
    type: 'scatter',
    data: {
      datasets: [
        ...(supplyData.length
          ? [{
              label: 'Supply / Pump Curve',
              data: supplyData,
              showLine: true,
              borderColor: '#1e88e5',
              backgroundColor: '#1e88e5',
              borderWidth: 2,
              tension: 0.4,
            }]
          : []),
        ...(demandPts.length
          ? [{
              label: 'Demand Curve',
              data: demandPts,
              showLine: true,
              borderColor: PRIMARY,
              backgroundColor: PRIMARY,
              borderWidth: 2,
              tension: 0.2,
            }]
          : []),
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Hydraulic Supply / Demand Graph' },
      },
      scales: {
        x: { title: { display: true, text: 'Flow (gpm)' }, beginAtZero: true },
        y: { title: { display: true, text: 'Pressure (psi)' }, beginAtZero: true },
      },
    },
  };

  const chart = new Chart(canvas, config);
  // Wait one animation frame for the canvas to commit pixels.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  document.body.removeChild(canvas);
  return dataUrl;
}

function sectionTitle(text: string): Content {
  return {
    text,
    color: PRIMARY,
    fontSize: 11,
    bold: true,
    margin: [0, 8, 0, 6],
  };
}

function smallLabel(label: string): Content {
  return { text: label, color: FAINT, fontSize: 8, bold: false };
}

function keyValueRow(items: { label: string; value: string }[]): Content {
  return {
    columns: items.map((item) => ({
      stack: [smallLabel(item.label), { text: item.value, fontSize: 10 }],
      width: '*',
    })),
    columnGap: 12,
    margin: [0, 0, 0, 6],
  };
}

// --- Page builders ---

function titleCover(project: Project): Content[] {
  return [
    { text: '\n\n\n\n', fontSize: 1 },
    { text: project.title || 'Fire Sprinkler Report', fontSize: 26, bold: true, alignment: 'center' },
    { text: '\n', fontSize: 10 },
    { text: 'Fire Sprinkler Hydraulic Calculation Report', fontSize: 14, alignment: 'center', color: FAINT },
    { text: '\n\n\n\n\n', fontSize: 10 },
    { text: 'for', fontSize: 12, alignment: 'center', italics: true, color: FAINT },
    { text: '\n', fontSize: 10 },
    { text: project.client.name || '—', fontSize: 20, bold: true, alignment: 'center' },
    { text: '\n', fontSize: 10 },
    { text: project.client.address || '', fontSize: 12, alignment: 'center' },
    { text: project.client.city || '', fontSize: 12, alignment: 'center' },
    { text: '\n\n\n\n\n\n\n\n', fontSize: 10 },
    { text: 'Prepared By:', alignment: 'center', fontSize: 10, color: FAINT },
    { text: project.designedBy || '—', alignment: 'center', fontSize: 14, bold: true },
    { text: '\n\n', fontSize: 10 },
    { text: project.date || '', alignment: 'center', fontSize: 12 },
    { text: '', pageBreak: 'after' },
  ];
}

function generalDataPage(project: Project): Content[] {
  const out: Content[] = [];
  out.push(sectionTitle('General Project Data Report'));

  out.push(sectionTitle('General Data'));
  out.push(
    keyValueRow([
      { label: 'Project Title', value: project.title || '—' },
      { label: 'Designed By', value: project.designedBy || '—' },
      { label: 'Date', value: project.date || '—' },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Code Reference', value: project.codeRef ?? '—' },
      { label: 'Approving Agency', value: project.approvingAgency ?? '—' },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Client Name', value: project.client.name || '—' },
      { label: 'Phone', value: project.client.phone || '—' },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Address', value: project.client.address || '—' },
      { label: 'City, State Zip', value: project.client.city || '—' },
    ]),
  );

  out.push(sectionTitle('Project Data'));
  out.push(
    keyValueRow([
      { label: 'Description Of Hazard', value: hazardLabel(project.hazardClass) },
      { label: 'Sprinkler System Type', value: project.sprinklerSystemType ?? '—' },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Design Area Of Water Application', value: `${f(project.designAreaFt2, 0)} ft²` },
      { label: 'Maximum Area Per Sprinkler', value: `${f(project.maxAreaPerSprinklerFt2, 0)} ft²` },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Default Sprinkler K-Factor', value: f(project.defaultKFactor, 2) },
      { label: 'Default Pipe Material', value: pipeMaterialLabel(project.defaultPipeMaterial) },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Inside Hose Stream Allowance', value: `${f(project.hoseStream.insideGpm, 2)} gpm` },
      { label: 'Outside Hose Stream Allowance', value: `${f(project.hoseStream.outsideGpm, 2)} gpm` },
      { label: 'In Rack Sprinkler Allowance', value: `${f(project.hoseStream.inRackGpm, 2)} gpm` },
    ]),
  );

  if (project.sprinklerSpec) {
    out.push(sectionTitle('Sprinkler Specifications'));
    out.push(
      keyValueRow([
        { label: 'Make', value: project.sprinklerSpec.make || '—' },
        { label: 'Model', value: project.sprinklerSpec.model || '—' },
        { label: 'Size', value: project.sprinklerSpec.size || '—' },
        { label: 'Temperature Rating', value: `${f(project.sprinklerSpec.tempRatingF, 0)} °F` },
      ]),
    );
  }

  out.push(sectionTitle('Water Supply Test Data'));
  out.push(
    keyValueRow([
      { label: 'Source Of Information', value: project.waterSupply.source || '—' },
      { label: 'Test Hydrant ID', value: project.waterSupply.hydrantId || '—' },
      { label: 'Date Of Test', value: project.waterSupply.testDate || '—' },
    ]),
  );
  out.push(
    keyValueRow([
      { label: 'Hydrant Elevation', value: `${f(project.waterSupply.hydrantElevFt, 0)} ft` },
      { label: 'Static Pressure', value: `${f(project.waterSupply.staticPsi, 2)} psi` },
      { label: 'Test Flow Rate', value: `${f(project.waterSupply.testFlowGpm, 2)} gpm` },
      { label: 'Test Residual Pressure', value: `${f(project.waterSupply.testResidualPsi, 2)} psi` },
    ]),
  );

  out.push(sectionTitle('Calculation Project Data'));
  out.push(
    keyValueRow([
      { label: 'Calculation Mode', value: project.calc.mode },
      { label: 'HMD Minimum Residual Pressure', value: `${f(project.calc.hmdMinResidualPsi, 2)} psi` },
      { label: 'Minimum Desired Flow Density', value: `${f(project.calc.minDesiredDensityGpmFt2, 3)} gpm/ft²` },
    ]),
  );

  out.push({ text: '', pageBreak: 'after' });
  return out;
}

function nodeInputTable(project: Project): Content[] {
  return [
    sectionTitle('Fire Sprinkler Input Data — Node Input Data'),
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Node', bold: true },
            { text: 'Description', bold: true },
            { text: 'K-Factor', bold: true },
            { text: 'Elev (ft)', bold: true },
            { text: 'P. Estimate (psi)', bold: true },
            { text: 'Area Group', bold: true },
            { text: 'Non-Spk Flow (gpm)', bold: true },
          ],
          ...project.nodes.map((n) => [
            String(n.id),
            n.description === 'sprinkler' ? 'Sprinkler' : 'No Discharge',
            n.kFactor > 0 ? f(n.kFactor, 2) : '----',
            f(n.elevationFt, 2),
            f(n.pressureEstimatePsi ?? null),
            n.areaGroup ?? '----',
            f(n.nonSprinklerFlowGpm ?? null),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
    },
    { text: '', pageBreak: 'after' },
  ];
}

function pipeInputTable(project: Project): Content[] {
  return [
    sectionTitle('Fire Sprinkler Input Data — Pipe Input Data'),
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Beg', bold: true },
            { text: 'End', bold: true },
            { text: 'Material', bold: true },
            { text: 'Dia (in)', bold: true },
            { text: 'Fitting', bold: true },
            { text: 'Pipe Len (ft)', bold: true },
            { text: 'Fit Len (ft)', bold: true },
            { text: 'Total (ft)', bold: true },
          ],
          ...project.pipes.map((p) => {
            const fitLen = p.fittingDataLengthFt ?? 0;
            const total = p.nominalLengthFt + fitLen;
            return [
              String(p.begNode),
              String(p.endNode),
              pipeMaterialLabel(p.materialKey),
              f(p.nominalDiameterIn, 3),
              p.fittingCode || '----',
              f(p.nominalLengthFt, 2),
              f(fitLen, 2),
              f(total, 2),
            ];
          }),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
    },
    { text: '', pageBreak: 'after' },
  ];
}

function nodeGroupingsTable(result: CalcResult): Content[] {
  return [
    sectionTitle('Fire Sprinkler Output Data — Group Peak Node Groupings'),
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Node', bold: true },
            { text: 'Residual (psi)', bold: true },
            { text: 'Sprinkler Flow (gpm)', bold: true },
            { text: 'Non-Spk Flow (gpm)', bold: true },
          ],
          ...result.nodes.map((n) => [
            String(n.id),
            f(n.residualPressurePsi, 2),
            f(n.sprinklerFlowGpm, 2),
            f(n.nonSprinklerFlowGpm, 2),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
    },
    { text: '', pageBreak: 'after' },
  ];
}

function pipeOutputTable(result: CalcResult): Content[] {
  return [
    sectionTitle('Fire Sprinkler Output Data — Group Peak Pipe Output Data'),
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Beg', bold: true },
            { text: 'End', bold: true },
            { text: 'Q (gpm)', bold: true },
            { text: 'V (ft/s)', bold: true },
            { text: 'F.L./ft (psi)', bold: true },
            { text: 'Pipe + Fit (ft)', bold: true },
            { text: 'PF (psi)', bold: true },
            { text: 'PE (psi)', bold: true },
            { text: 'PT (psi)', bold: true },
          ],
          ...result.pipes.map((p) => [
            String(p.begNode),
            String(p.endNode),
            f(p.flowGpm, 2),
            f(p.velocityFps, 2),
            f(p.frictionLossPsiPerFt, 5),
            `${f(p.pipeLengthFt, 1)} + ${f(p.fittingLengthFt, 1)}`,
            f(p.pfPsi, 3),
            f(p.pePsi, 3),
            f(p.ptPsi, 3),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 8,
    },
    { text: '', pageBreak: 'after' },
  ];
}

function sprinklerOutputTable(result: CalcResult): Content[] {
  return [
    sectionTitle('Fire Sprinkler Output Data — Group Peak Sprinkler Output Data'),
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Node', bold: true },
            { text: 'K', bold: true },
            { text: 'Elev (ft)', bold: true },
            { text: 'Residual (psi)', bold: true },
            { text: 'Area (ft²)', bold: true },
            { text: 'Density (gpm/ft²)', bold: true },
            { text: 'Discharge (gpm)', bold: true },
          ],
          ...result.sprinklers.map((s) => [
            String(s.nodeId),
            f(s.kFactor, 2),
            f(s.elevationFt, 2),
            f(s.residualPressurePsi, 2),
            f(s.flowingAreaFt2, 2),
            f(s.densityGpmFt2, 3),
            f(s.dischargeGpm, 2),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
    },
    { text: '', pageBreak: 'after' },
  ];
}

function outputSummaryPage(result: CalcResult): Content[] {
  return [
    sectionTitle('Fire Sprinkler Output Summary'),

    sectionTitle('Hydraulically Most Demanding Sprinkler Node'),
    keyValueRow([
      { label: 'HMD Sprinkler Node Number', value: String(result.hmdNodeId) },
      { label: 'HMD Actual Residual Pressure', value: `${f(result.hmdResidualPsi, 2)} psi` },
      { label: 'HMD Actual Flow', value: `${f(result.hmdFlowGpm, 2)} gpm` },
    ]),

    sectionTitle('Sprinkler Summary'),
    keyValueRow([
      { label: 'Application Average Density', value: `${f(result.applicationAverageDensityGpmFt2, 3)} gpm/ft²` },
      { label: 'Application Average Area Per Sprinkler', value: `${f(result.applicationAverageAreaPerSprinklerFt2, 2)} ft²` },
      { label: 'Sprinkler Flow', value: `${f(result.totalSprinklerFlowGpm, 2)} gpm` },
      { label: 'Average Sprinkler Flow', value: `${f(result.averageSprinklerFlowGpm, 2)} gpm` },
    ]),

    sectionTitle('Flow Velocity And Imbalance Summary'),
    keyValueRow([
      { label: 'Maximum Flow Velocity', value: `${f(result.maxVelocityFps, 2)} ft/s` },
      { label: 'Maximum Velocity Pressure', value: `${f(result.maxVelocityPressurePsi, 2)} psi` },
      { label: 'Max Nodal Pressure Imbalance', value: `${f(result.actualMaxNodePressureImbalancePsi, 4)} psi` },
    ]),

    sectionTitle('Overall Network Summary'),
    keyValueRow([
      { label: 'Number Of Flowing Sprinklers', value: String(result.sprinklers.length) },
      { label: 'Pipe System Water Volume', value: `${f(result.pipeWaterVolumeGal, 2)} gal` },
      { label: 'Min Required Residual Pressure At Inflow', value: `${f(result.inflowResidualPsi, 2)} psi` },
      { label: 'Demand Flow At Inflow', value: `${f(result.inflowFlowGpm, 2)} gpm` },
    ]),

    { text: '', pageBreak: 'after' },
  ];
}

function supplyDemandPage(project: Project, result: CalcResult | undefined, graphPng: string | null): Content[] {
  const out: Content[] = [];
  out.push(sectionTitle('Fire Sprinkler Output Data — Hydraulic Supply/Demand Graph'));
  if (graphPng) {
    out.push({ image: graphPng, width: 480, alignment: 'center' });
  } else {
    out.push({ text: 'No pump curve or calculation data available for graph.', italics: true, color: FAINT });
  }

  out.push(sectionTitle('Pump Curve Data'));
  const pump = activePumpPoints(project.pumpCurve);
  const pumpRows = pump.length
    ? pump.map((p, i) => [`Point ${i + 1}`, `${f(p.flowGpm, 2)} gpm`, `${f(p.pressurePsi, 2)} psi`])
    : [['—', '—', '—']];
  out.push({
    table: {
      headerRows: 0,
      widths: ['auto', '*', '*'],
      body: pumpRows,
    },
    layout: 'lightHorizontalLines',
    fontSize: 10,
  });

  if (result) {
    out.push(sectionTitle('Demand Curve Data'));
    out.push(
      keyValueRow([
        { label: 'Calculated Residual Pressure', value: `${f(result.inflowResidualPsi, 2)} psi` },
        { label: 'Calculated Flow Rate', value: `${f(result.inflowFlowGpm, 2)} gpm` },
      ]),
    );
  }
  return out;
}

// --- Helpers ---

function hazardLabel(code: string): string {
  return ({
    light: 'Light',
    'ord-1': 'Ordinary 1',
    'ord-2': 'Ordinary 2',
    'eh-1': 'Extra Hazard 1',
    'eh-2': 'Extra Hazard 2',
  } as Record<string, string>)[code] ?? code;
}

function pipeMaterialLabel(key: string): string {
  return ({
    'schd-10-steel-dry': 'SCHD 10 STEEL, DRY',
    'sched-10-wet-steel': 'SCHED 10 WET STEEL',
    'schd-40-steel-wet': 'SCHD 40 STEEL, WET',
    'schd-40-steel-dry': 'SCHD 40 STEEL, DRY',
    cpvc: 'CPVC',
    'copper-type-l': 'COPPER TYPE L',
  } as Record<string, string>)[key] ?? key;
}

// --- Public API ---

export async function buildProjectReport(project: Project, result?: CalcResult): Promise<TDocumentDefinitions> {
  const graphPng = await renderSupplyDemandGraph(project, result);

  const content: Content[] = [
    ...titleCover(project),
    ...generalDataPage(project),
    ...nodeInputTable(project),
    ...pipeInputTable(project),
    ...(result ? nodeGroupingsTable(result) : []),
    ...(result ? pipeOutputTable(result) : []),
    ...(result ? sprinklerOutputTable(result) : []),
    ...(result ? outputSummaryPage(result) : []),
    ...supplyDemandPage(project, result, graphPng),
  ];

  const fileLabel = `${project.title || 'project'}.json`;

  return {
    info: {
      title: project.title || 'Fire Sprinkler Report',
      author: project.designedBy || 'Hilli Fire',
      subject: 'Fire sprinkler hydraulic calculation',
    },
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 50],
    header: () => pageHeader(project.title),
    footer: (currentPage, pageCount) => pageFooter(currentPage, pageCount, fileLabel),
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10 },
  };
}

export async function downloadProjectReport(project: Project, result?: CalcResult): Promise<void> {
  const doc = await buildProjectReport(project, result);
  const filename = `${(project.title || 'fire-sprinkler-report').replace(/[^\w-]+/g, '_')}.pdf`;
  pdfMake.createPdf(doc).download(filename);
}
