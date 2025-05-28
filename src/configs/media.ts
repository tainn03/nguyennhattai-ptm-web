export type MediaType =
  | "DEFAULT"
  | "AVATAR"
  | "ORGANIZATION_LOGO"
  | "DRIVER_LICENSE"
  | "DRIVER_CONTRACT"
  | "SUBCONTRACTOR_DOCUMENT"
  | "TRAILER"
  | "VEHICLE"
  | "ORGANIZATION_REPORT"
  | "INTERNAL_MESSAGE"
  | "BILL_OF_LADING"
  | "FUEL_METER"
  | "ODOMETER"
  | "CUSTOM_FIELD"
  | "IMPORT_ORDER"
  | "ORDER_TRIP_EXPENSE_DOCUMENT";

export type MediaOptions = {
  type: MediaType;

  /**
   * Strapi folder
   */
  folder: string;

  /**
   * Local path
   */
  localPath: string;

  /**
   * File ext allowed
   */
  fileTypes: string[];

  /**
   * Bytes
   */
  maxFileSize: number;
};

const IMAGE_TYPES = [".png", ".jpg", ".jpeg"];
const DOCUMENT_TYPES = [".doc", ".docx", ".xls", ".xlsx"];
const PDF_TYPES = [".pdf"];

export const defaultOptions: MediaOptions = {
  type: "DEFAULT",
  folder: "defaults",
  localPath: "./public/uploads",
  fileTypes: [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...PDF_TYPES],
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const avatarOptions: MediaOptions = {
  type: "AVATAR",
  folder: "avatars",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 3 * 1024 * 1024, // ~ 3MB
};

export const organizationLogoOptions: MediaOptions = {
  type: "ORGANIZATION_LOGO",
  folder: "orgs/[orgId]",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 3 * 1024 * 1024, // ~ 3MB
};

export const organizationReportOptions: MediaOptions = {
  type: "ORGANIZATION_REPORT",
  folder: "orgs/[orgId]/report-templates",
  localPath: "./public/uploads",
  fileTypes: DOCUMENT_TYPES,
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const trailerOptions: MediaOptions = {
  type: "TRAILER",
  folder: "orgs/[orgId]/trailers",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 3 * 1024 * 1024, // ~ 3MB
};

export const vehicleOptions: MediaOptions = {
  type: "VEHICLE",
  folder: "orgs/[orgId]/vehicles",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 3 * 1024 * 1024, // ~ 3MB
};

export const subcontractorDocumentOptions: MediaOptions = {
  type: "SUBCONTRACTOR_DOCUMENT",
  folder: "orgs/[orgId]/subcontractors",
  localPath: "./public/uploads",
  fileTypes: [...DOCUMENT_TYPES, ...PDF_TYPES],
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const driverLicenseOptions: MediaOptions = {
  type: "DRIVER_LICENSE",
  folder: "orgs/[orgId]/driver-licenses",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 3 * 1024 * 1024, // ~ 3MB
};

export const driverContractOptions: MediaOptions = {
  type: "DRIVER_CONTRACT",
  folder: "orgs/[orgId]/driver-contracts",
  localPath: "./public/uploads",
  fileTypes: [...DOCUMENT_TYPES, ...PDF_TYPES],
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const internalMessageOptions: MediaOptions = {
  type: "INTERNAL_MESSAGE",
  folder: "orgs/[orgId]/internal-messages/[mmyyyy]",
  localPath: "./public/uploads",
  fileTypes: [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...PDF_TYPES],
  maxFileSize: 30 * 1024 * 1024, // ~ 30MB
};

export const billOfLadingOptions: MediaOptions = {
  type: "BILL_OF_LADING",
  folder: "orgs/[orgId]/bill-of-lading/[mmyyyy]",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const fuelMeterOptions: MediaOptions = {
  type: "FUEL_METER",
  folder: "orgs/[orgId]/fuel-logs/[mmyyyy]",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const odometerOptions: MediaOptions = {
  type: "ODOMETER",
  folder: "orgs/[orgId]/fuel-logs/[mmyyyy]",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};

export const customFieldOptions: MediaOptions = {
  type: "CUSTOM_FIELD",
  folder: "orgs/[orgId]/custom-fields",
  localPath: "./public/uploads",
  fileTypes: [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...PDF_TYPES],
  maxFileSize: 30 * 1024 * 1024, // ~ 30MB
};

export const importOrderOptions: MediaOptions = {
  type: "IMPORT_ORDER",
  folder: "orgs/[orgId]/import-orders",
  localPath: "./public/uploads",
  fileTypes: [".xlsx"],
  maxFileSize: 10 * 1024 * 1024, // ~ 10MB
};

export const orderTripExpenseDocumentOptions: MediaOptions = {
  type: "ORDER_TRIP_EXPENSE_DOCUMENT",
  folder: "orgs/[orgId]/order-trip-expenses",
  localPath: "./public/uploads",
  fileTypes: IMAGE_TYPES,
  maxFileSize: 5 * 1024 * 1024, // ~ 5MB
};
