import mime from "mime";
import path from "path";

import {
  avatarOptions,
  billOfLadingOptions,
  customFieldOptions,
  defaultOptions,
  driverContractOptions,
  driverLicenseOptions,
  fuelMeterOptions,
  importOrderOptions,
  internalMessageOptions,
  MediaType,
  odometerOptions,
  orderTripExpenseDocumentOptions,
  organizationLogoOptions,
  organizationReportOptions,
  subcontractorDocumentOptions,
  trailerOptions,
  vehicleOptions,
} from "@/configs/media";

/**
 * Extracts the file extension from a given file path.
 *
 * @param path The file path to extract the extension from.
 * @returns The file extension.
 */
export const getFileExtension = (pathFile: string): string => {
  // return path?.trim().split(".").pop() || "";
  return path.extname(pathFile) || "";
};

/**
 * Get type for the given path or extension
 *
 * @param path The file path to extract the type from.
 * @returns The file type
 */
export const getFileType = (pathFile: string): string => {
  return mime.getType(pathFile) || "";
};

/**
 * Convert a number of bytes into a KB, MB, GB or TB
 * @param bytes The number of bytes to convert
 * @returns A string representing the KB, MB, GB or TB
 */
export const bytesToSize = (bytes: number): string => {
  // If the input is null, undefined, or 0, return "0 Byte"
  if (!bytes) {
    return "0Byte";
  }
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i))}${sizes[i]}`;
};

/**
 * Returns the options configuration based on the provided media type.
 *
 * @param {MediaType} type - The type of media for which options are required. Defaults to "DEFAULT".
 * @returns {any} - The options configuration corresponding to the given media type.
 */
export const getOptionsByType = (type: MediaType = "DEFAULT") => {
  // Mapping of media types to their respective options configurations
  const optionsMap = {
    DEFAULT: defaultOptions,
    AVATAR: avatarOptions,
    ORGANIZATION_LOGO: organizationLogoOptions,
    TRAILER: trailerOptions,
    VEHICLE: vehicleOptions,
    SUBCONTRACTOR_DOCUMENT: subcontractorDocumentOptions,
    DRIVER_LICENSE: driverLicenseOptions,
    DRIVER_CONTRACT: driverContractOptions,
    INTERNAL_MESSAGE: internalMessageOptions,
    BILL_OF_LADING: billOfLadingOptions,
    FUEL_METER: fuelMeterOptions,
    ODOMETER: odometerOptions,
    CUSTOM_FIELD: customFieldOptions,
    ORGANIZATION_REPORT: organizationReportOptions,
    IMPORT_ORDER: importOrderOptions,
    ORDER_TRIP_EXPENSE_DOCUMENT: orderTripExpenseDocumentOptions,
  };

  // Return the options configuration for the given media type
  return optionsMap[type];
};
