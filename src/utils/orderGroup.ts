import { OrganizationReportType } from "@prisma/client";

import { ExportOptions, exportReport, formatDate } from "@/services/server/dynamicReport";
import { findOrderGroupsPlan } from "@/services/server/orderGroup";
import { getDynamicReportId } from "@/services/server/organizationReport";
import { ApiError, HttpStatusCode, Token } from "@/types/api";
import { ReportResponse } from "@/types/dynamicReport";
import { FilterRequest } from "@/types/filter";
import { OrderGroupBookingData, ReportRequest } from "@/types/report";
import { OrderGroupInfo } from "@/types/strapi";

import { getFullName } from "./auth";
import { formatDate as momentFormatDate, getClientTimezone } from "./date";
import { createTranslator } from "./locale";
import { formatToken } from "./server";
import { ensureString, joinNonEmptyStrings } from "./string";

/**
 * Transforms an array of order groups into an array of transport booking records for export.
 *
 * @param orderGroups - An array of order group information objects.
 * @param options - Export options including client timezone and date format.
 * @returns An array of transport booking records.
 */
const transformOrderGroupsForExport = (
  orderGroups: OrderGroupInfo[],
  options: ExportOptions
): OrderGroupBookingData[] => {
  const { clientTimezone, dateFormat = "dd/MM/yyyy" } = options;
  const result: OrderGroupBookingData[] = [];

  orderGroups.forEach((orderGroup, orderGroupIndex) => {
    (orderGroup.orders || []).forEach((order, orderIndex) => {
      const trip = order.trips?.[0];
      const pickupPoint = order?.route?.pickupPoints?.[0];
      const deliveryPoint = order?.route?.deliveryPoints?.[0];
      if (!trip) {
        return;
      }

      // Init record for each order
      const record: OrderGroupBookingData = { orderGroupIndex: orderGroupIndex + 1 };

      // Order group info should be displayed only once for the first order in the group
      if (orderIndex === 0) {
        record.pickupDate = formatDate(trip.pickupDate, clientTimezone, dateFormat);
        record.deliveryDate = formatDate(trip.deliveryDate, clientTimezone, dateFormat);
        record.vehicleNumber = ensureString(trip.vehicle?.vehicleNumber);
        record.driverFullName = getFullName(trip.driver?.firstName, trip.driver?.lastName);
        record.phoneNumber = ensureString(trip.driver?.phoneNumber);
      }

      // Order info should be displayed for each order
      record.pickupTimeNotes = ensureString(trip.pickupTimeNotes);
      record.pickupWarehouse = ensureString(pickupPoint?.zone?.name || pickupPoint?.name || pickupPoint?.code);
      record.deliveryPoint = joinNonEmptyStrings([deliveryPoint?.code, deliveryPoint?.name], " - ");
      record.deliveryZone = ensureString(deliveryPoint?.zone?.name);
      record.crates = order.weight;
      record.cbm = order.cbm;
      record.notes = ensureString(order.notes);
      record.vehicleType = ensureString(trip.vehicle?.type?.name);
      record.deliveryTimeNotes = ensureString(trip.deliveryTimeNotes);

      // Add the record to the aggregated list
      result.push(record);
    });
  });

  return result;
};

/**
 * Generates a download file name based on the provided order groups.
 *
 * The file name is constructed using the following format:
 * "BOOKING-{customerCode}_{currentDateTime}"
 * - If there is only one unique customer code in the order groups, it will be included in the file name.
 * - If there are multiple or no customer codes, the customer part will be omitted.
 * - The current date and time are formatted as "yyyyMMddHHmm".
 *
 * @param {OrderGroupInfo[]} orderGroups - An array of order group information.
 * @returns {string} The generated download file name.
 */
const getDownloadFileName = (orderGroups: OrderGroupInfo[]): string => {
  const customerCodeSet: Set<string> = new Set();
  for (const orderGroup of orderGroups) {
    for (const order of orderGroup.orders || []) {
      if (order.customer?.code) {
        customerCodeSet.add(order.customer.code);
      }
    }
  }
  const customerCodes = Array.from(customerCodeSet);
  const customer = customerCodes.length === 1 ? customerCodes[0] : null;
  const currentDt = momentFormatDate(new Date(), "DDMMYYYYHHmm");
  return `${joinNonEmptyStrings(["BOOKING", customer], "-")}_${currentDt}`;
};

/**
 * Exports order groups plan report.
 *
 * @param token - The authentication token containing JWT and organization ID.
 * @param params - The filter request parameters for fetching order group information.
 * @returns A promise that resolves to the report response or undefined.
 * @throws {ApiError} If the dynamic report ID is not found.
 */
export const exportOrderGroupsPlan = async (
  token: Token,
  params: FilterRequest<OrderGroupInfo>
): Promise<ReportResponse | undefined> => {
  const { jwt, organizationId } = formatToken(token);
  const t = await createTranslator();
  const clientTimezone = getClientTimezone();
  const dateFormat = t("common.format.fns.date");

  // Fetch the dynamic report ID using the JWT, organization ID, and report type
  const dynamicTemplateId = await getDynamicReportId(jwt, {
    organizationId,
    type: OrganizationReportType.ORDER_GROUP_PLAN,
  });

  // Return an error if the dynamic report ID was not fetched successfully
  if (!dynamicTemplateId) {
    throw new ApiError(HttpStatusCode.InternalServerError, "Dynamic report ID not found");
  }

  // Fetch order groups and transform data for export
  const orderGroups = await findOrderGroupsPlan(jwt, params);
  const exportRecords = transformOrderGroupsForExport(orderGroups, {
    clientTimezone,
    dateFormat,
  });

  // Prepare the report data and export the report
  const reportData: ReportRequest = {
    data: {
      body: {
        sheetName: "BOOKING",
        bookingOrders: exportRecords,
      },
    },
  };
  const downloadFileName = getDownloadFileName(orderGroups);
  const result = await exportReport({
    dynamicTemplateId,
    downloadFileName,
    data: [reportData],
  });

  return result;
};
