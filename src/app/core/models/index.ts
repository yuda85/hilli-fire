/**
 * Domain model. Units match the Elite Software Fire reference report:
 *   length/elevation: ft   diameter: in    pressure: psi    flow: gpm
 *   area: ft²   density: gpm/ft²   velocity: ft/s   volume: gal
 * Each form field shows its unit inline; there is no unit toggle.
 */

export type HazardClass = 'light' | 'ord-1' | 'ord-2' | 'eh-1' | 'eh-2';

export type SprinklerSystemType = 'wet' | 'dry' | 'preaction' | 'deluge';

export type PipeMaterialKey =
  | 'schd-10-steel-dry'
  | 'sched-10-wet-steel'
  | 'schd-40-steel-wet'
  | 'schd-40-steel-dry'
  | 'cpvc'
  | 'copper-type-l';

export type NodeKind = 'sprinkler' | 'no-discharge';

export type CalcMode = 'demand' | 'flow';

export type UnitsSystem = 'us' | 'metric';

export type MemberRole = 'owner' | 'editor' | 'viewer';

// --- Organization & users ---

export interface Organization {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: number; // epoch ms
}

export interface Member {
  uid: string;
  email: string;
  displayName?: string;
  role: MemberRole;
  joinedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  orgId: string;
}

// --- Project model ---

export interface ClientInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
  representative: string;
}

export interface BuildingInfo {
  name: string;
  owner: string;
  contact: string;
  phone: string;
  address: string;
  city: string;
}

export interface SprinklerSpec {
  make: string;
  model: string;
  size: string;
  tempRatingF: number;
}

export interface WaterSupplyTest {
  source: string;
  hydrantId: string;
  testDate: string; // ISO date
  hydrantElevFt: number;
  staticPsi: number;
  testFlowGpm: number;
  testResidualPsi: number;
}

export interface HoseStreamAllowance {
  insideGpm: number;
  outsideGpm: number;
  inRackGpm: number;
}

export interface CalcParams {
  mode: CalcMode;
  hmdMinResidualPsi: number;
  minDesiredDensityGpmFt2: number;
}

export interface NodeBranch {
  description: string;
  diameterIn: number;
  lengthFt: number;
  standardFittings: string;
  nonStandardFittingsFt: number;
  sprinklerKFactor: number;
}

export interface ProjectNode {
  id: number; // matches Node No. in the Elite report
  description: NodeKind;
  kFactor: number; // 0 for no-discharge
  elevationFt: number;
  pressureEstimatePsi?: number;
  areaGroup?: string;
  branch?: NodeBranch;
  nonSprinklerFlowGpm?: number;
}

export interface ProjectPipe {
  begNode: number;
  endNode: number;
  description?: string;
  materialKey: PipeMaterialKey;
  nominalDiameterIn: number;
  typeGroup?: number;
  fittingCode?: string; // "E", "2E", "BC", "6E", etc.
  fittingDataLengthFt?: number; // user-entered extra equivalent length
  nominalLengthFt: number;
}

export interface PumpCurvePoint {
  flowGpm: number;
  pressurePsi: number;
}

// --- Calculation result (cached on the project) ---

export interface PipeOutput {
  begNode: number;
  endNode: number;
  flowGpm: number;
  velocityFps: number;
  velocityPressurePsi: number;
  frictionLossPsiPerFt: number;
  pipeLengthFt: number;
  fittingLengthFt: number;
  totalLengthFt: number;
  pfPsi: number;
  pePsi: number;
  ptPsi: number;
}

export interface NodeOutput {
  id: number;
  residualPressurePsi: number;
  sprinklerFlowGpm: number;
  nonSprinklerFlowGpm: number;
}

export interface SprinklerOutput {
  nodeId: number;
  kFactor: number;
  elevationFt: number;
  residualPressurePsi: number;
  flowingAreaFt2: number;
  densityGpmFt2: number;
  dischargeGpm: number;
  areaGroupCode?: string;
}

export interface CalcResult {
  ranAt: number;
  hmdNodeId: number;
  hmdResidualPsi: number;
  hmdFlowGpm: number;
  totalSprinklerFlowGpm: number;
  totalNonSprinklerFlowGpm: number;
  inflowResidualPsi: number;
  inflowFlowGpm: number;
  applicationAverageDensityGpmFt2: number;
  applicationAverageAreaPerSprinklerFt2: number;
  averageSprinklerFlowGpm: number;
  maxVelocityFps: number;
  maxVelocityPipe?: { begNode: number; endNode: number };
  maxVelocityPressurePsi: number;
  allowableNodePressureImbalancePsi: number;
  actualMaxNodePressureImbalancePsi: number;
  actualMaxNodeFlowImbalanceGpm: number;
  pipeWaterVolumeGal: number;
  pipes: PipeOutput[];
  nodes: NodeOutput[];
  sprinklers: SprinklerOutput[];
  warnings: string[];
}

// --- The project document itself ---

export interface Project {
  id: string;
  orgId: string;

  title: string;
  designedBy: string;
  date: string; // ISO date
  codeRef?: string;
  approvingAgency?: string;

  client: ClientInfo;
  company?: CompanyInfo;
  building?: BuildingInfo;

  hazardClass: HazardClass;
  sprinklerSystemType?: SprinklerSystemType;
  designAreaFt2: number;
  maxAreaPerSprinklerFt2: number;
  defaultKFactor: number;
  defaultPipeMaterial: PipeMaterialKey;
  hoseStream: HoseStreamAllowance;

  sprinklerSpec?: SprinklerSpec;
  waterSupply: WaterSupplyTest;
  calc: CalcParams;

  nodes: ProjectNode[];
  pipes: ProjectPipe[];
  pumpCurve: PumpCurvePoint[];

  displayUnits: UnitsSystem;

  lastResult?: CalcResult;

  createdAt: number;
  updatedAt: number;
  createdBy: string;
}
