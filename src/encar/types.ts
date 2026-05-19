/**
 * TypeScript types for the Encar API responses.
 * Field names match Encar's JSON exactly (PascalCase, occasional typos like `accdient`).
 */

export interface SearchResponse {
  Count: number;
  SearchResults: Listing[];
}

export interface Listing {
  Id: number;
  Manufacturer: string;
  Model: string;
  Badge: string;
  Transmission: string;
  FuelType: string;
  /** YYYYMM encoded as a float, e.g. 202107.0 = July 2021 */
  Year: number;
  FormYear: number;
  Mileage: number;
  /** In 만원 (10,000 KRW). 6250 = ₩62,500,000 */
  Price: number;
  OfficeCityState: string;
  OfficeName: string;
  DealerName: string;
  ModifiedDate: string;
  Photo: string;
  Photos: Photo[];
  ServiceMark: string[];
  Condition: string[];
  Separation?: string[];
  Trust?: string[];
  HomeServiceVerification?: string;
  ServiceCopyCar?: string;
  SellType?: string;
  BuyType?: string[];
}

export interface Photo {
  type: string;
  location: string;
  updatedDate?: string;
}

export interface CodeTitle {
  code: string;
  title: string;
}

export interface InspectionRecord {
  vehicleId: number;
  formats: unknown[];
  master: InspectionMaster;
  price: number | null;
  inners: InspectionSection[];
  outers: InspectionSection[];
  images: InspectionImage[];
  etcs: InspectionSection[];
  directManagement: unknown;
  inspectionSource: InspectionSource;
}

export interface InspectionMaster {
  supplyNum: string;
  /** Encar's typo — `accdient` instead of `accident`. Leave as-is to match API. */
  accdient: boolean;
  simpleRepair: boolean;
  registrationDate: string;
  /** Null for partially-prepared listings — always check before accessing fields. */
  detail: InspectionMasterDetail | null;
}

export interface InspectionMasterDetail {
  recordNo: string;
  modelYear: string;
  validityStartDate: string;
  validityEndDate: string;
  firstRegistrationDate: string;
  transmissionType: CodeTitle;
  vin: string;
  guarantyType: CodeTitle;
  motorType: string;
  boardStateType: CodeTitle | null;
  mileage: number;
  mileageStateType: CodeTitle | null;
  tuning: boolean;
  tuningStateTypes: CodeTitle[];
  seriousTypes: CodeTitle[];
  usageChangeTypes: CodeTitle[];
  colorType: CodeTitle | null;
  paintPartTypes: CodeTitle[];
  mainOptionTypes: CodeTitle[];
  recall: boolean;
  recallFullFillTypes: CodeTitle[];
  comments: string;
  issueDate: string;
  inspName: string;
  noticeName: string;
  carStateType: CodeTitle | null;
  engineCheck: string;
  trnsCheck: string;
  waterlog: boolean;
  performTester: unknown;
  version: string;
}

export interface InspectionSection {
  type: CodeTitle;
  price: number | null;
  children: InspectionItem[];
}

export interface InspectionItem {
  type: CodeTitle;
  statusType: CodeTitle | null;
  statusItemTypes: CodeTitle[];
  description: string | null;
  children: InspectionItem[];
}

export interface InspectionImage {
  path: string;
  type: string;
  title: string;
}

export interface InspectionSource {
  code: string;
  inspectionVersion: string;
  reservationId?: string | number;
  registrantId?: string;
  updaterId?: string;
}

export interface AccidentHistory {
  openData: boolean;
  regDate: string;
  carNo: string;
  year: string;
  maker: string;
  carKind: string;
  use: string;
  displacement: string;
  carName: string | null;
  firstDate: string;
  fuel: string;
  carShape: string;
  model: string;
  transmission: string | null;
  carNameCode: string | null;
  myAccidentCnt: number;
  otherAccidentCnt: number;
  ownerChangeCnt: number;
  robberCnt: number;
  robberDate: string | null;
  totalLossCnt: number;
  totalLossDate: string | null;
  floodTotalLossCnt: number;
  floodPartLossCnt: number | null;
  floodDate: string | null;
  government: number;
  business: number;
  loan: number;
  carNoChangeCnt: number;
  myAccidentCost: number;
  otherAccidentCost: number;
  carInfoChanges: { date: string; carNo: string }[];
  carInfoUse1s: string[];
  carInfoUse2s: string[];
  ownerChanges: string[];
  notJoinDate1: string | null;
  notJoinDate2: string | null;
  notJoinDate3: string | null;
  notJoinDate4: string | null;
  notJoinDate5: string | null;
  accidentCnt: number;
  accidents: AccidentEvent[];
}

export interface AccidentEvent {
  /** "1" or "2" — coding TBD (likely self-damage vs damage-to-others) */
  type: string;
  date: string;
  insuranceBenefit: number;
  partCost: number;
  laborCost: number;
  paintingCost: number;
}

export interface Diagnosis {
  vehicleId: number;
  diagnosisDate: string;
  diagnosisNo: number;
  realDiagnosisDate: string;
  ordNo: number;
  centerCode: string;
  reservationCenterName: string;
  items: DiagnosisItem[];
}

export interface DiagnosisItem {
  code: string;
  name: string;
  result: string;
  resultCode: string | null;
}

export interface VerificationResponse {
  carId: number;
  items: VerificationItem[];
}

export interface VerificationItem {
  id: number;
  option: VerificationOption;
  value: string;
  faultOptionValue: string | null;
  faultStatusValue: string | null;
}

export interface VerificationOption {
  id: number;
  category: string;
  subCategory: string;
  optionName: string;
  expectedValue: string;
  defaultValue: string | null;
  required: boolean;
  dataType: string;
  maxCount: number | null;
  sort: number;
  groupId: number | null;
  faultOption: FaultOption[];
}

export interface FaultOption {
  faultOptionId: number;
  faultOptionName: string;
  faultStatus: { faultStatusId: number; faultStatusText: string }[];
}

/**
 * The canonical per-car endpoint `/v1/readside/vehicle/{id}` response.
 * Richer than a search listing — includes plate, VIN, dealer info, photos, options,
 * accident summary. Nested objects loosely typed; tighten as we use them.
 */
export interface Vehicle {
  vehicleId: number;
  vehicleNo: string;
  vin: string;
  vehicleType: string;
  manage: VehicleManage;
  category: VehicleCategory;
  advertisement: VehicleAdvertisement;
  contact: Record<string, unknown>;
  spec: VehicleSpec;
  photos: VehiclePhoto[];
  options: Record<string, unknown>;
  condition: VehicleCondition;
  partnership: Record<string, unknown>;
  contents: { text?: string; meetGoText?: string } | null;
  view: Record<string, unknown>;
}

export interface VehicleManage {
  registDateTime: string;
  firstAdvertisedDateTime: string;
  modifyDateTime: string;
  subscribeCount: number;
  reRegistered: boolean;
  [k: string]: unknown;
}

export interface VehicleCategory {
  type: string;
  manufacturerCd: string;
  manufacturerName: string;
  modelCd: string;
  modelName: string;
  gradeCd: string;
  gradeName: string;
  gradeEnglishName?: string;
  [k: string]: unknown;
}

export interface VehicleAdvertisement {
  type: string;
  price: number;
  status: string;
  trust?: string;
  oneLineText?: string;
  salesStatus?: string;
  [k: string]: unknown;
}

export interface VehicleSpec {
  type: string;
  mileage: number;
  displacement: number;
  transmissionName: string;
  fuelCd?: string;
  fuelName: string;
  colorName?: string;
  [k: string]: unknown;
}

export interface VehiclePhoto {
  code: string;
  path: string;
  type: string;
  updateDateTime?: string;
  desc?: string;
}

export interface VehicleCondition {
  accident: Record<string, unknown>;
  inspection: Record<string, unknown>;
  seizing: Record<string, unknown>;
}

/** Aggregated result of fetchFullCar — everything we know about a single car. */
export interface FullCarData {
  carId: number;
  vehicle: Vehicle | null;
  inspection: InspectionRecord | null;
  accidentHistory: AccidentHistory | null;
  diagnosis: Diagnosis | null;
}
