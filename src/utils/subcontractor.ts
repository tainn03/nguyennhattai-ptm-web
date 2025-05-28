import { VehicleOwnerType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import pick from "lodash/pick";

import { getSubcontractorPaidTrips } from "@/actions/orderTrip";
import { getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { ORDER_META_PREFIX_KEY, ROUTE_POINT_META_PREFIX_KEY } from "@/constants/report";
import { getOrganizationReportInfo } from "@/services/server/organization";
import { getTripRelatedInfoByIds } from "@/services/server/tripDriverExpense";
import { getUserById } from "@/services/server/user";
import { AnyObject } from "@/types";
import { AddressFormattingRulesInReport } from "@/types/organizationSettingExtended";
import {
  IndividualSubcontractorCostReportParams,
  ReportRequest,
  SubcontractorCostOverview,
  SubcontractorCostReport,
  SubcontractorPaidTripReport,
} from "@/types/report";
import { OrderTripInfo, TrailerInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { transformCustomFields } from "@/utils/customField";
import { createTranslator } from "@/utils/locale";
import { deleteProperties } from "@/utils/object";
import { ensureString, formatAddressForReport, slugifyString } from "@/utils/string";

/**
 * This function takes an array of vehicles or trailers and returns an array of unique subcontractor IDs.
 * It first filters out the vehicles or trailers that are owned by subcontractors.
 * Then it creates a Set (which inherently removes duplicates) of subcontractor IDs.
 * Finally, it converts the Set back to an array and returns it.
 *
 * @param {VehicleInfo[] | TrailerInfo[]} arrayList - The array of vehicles or trailers to process.
 * @return {number[]} - An array of unique subcontractor IDs.
 */
export const getDistinctSubcontractorIds = (arrayList: VehicleInfo[] | TrailerInfo[]): number[] => {
  const subcontractors = arrayList.filter((item) => item.ownerType === VehicleOwnerType.SUBCONTRACTOR);
  const subcontractorIds = new Set(subcontractors.map((item) => Number(item.subcontractorId)));
  return Array.from(subcontractorIds);
};

/**
 * Extracts driver expenses from an order trip.
 * @param {Partial<OrderTripInfo>} orderTrip  - The order trip to extract driver expenses from.
 * @returns A record containing driver expenses.
 */
const getDriverExpenseInfo = (orderTrip: Partial<OrderTripInfo>): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  (orderTrip.driverExpenses ?? []).forEach((dre) => {
    if (dre.driverExpense?.key) {
      result[dre.driverExpense.key] = dre.amount ?? null;
    }
  });
  return result;
};

/**
 * Generates a report request for subcontractor costs.
 *
 * @param params - The parameters for generating the report, excluding `subcontractorId`, but including:
 * @param costs - An array of `DriverSalaryReport` containing salary information for each subcontractor.
 * @returns A promise that resolves to an array of `ReportRequest<DriverSalaryReport>`, each representing a request to generate a subcontractor cost report.
 */
export const getSubcontractorCostReportRequest = async (
  params: Omit<IndividualSubcontractorCostReportParams, "subcontractorId"> & { jwt: string; userId: number },
  costs: SubcontractorCostReport[]
): Promise<ReportRequest<SubcontractorCostReport>[]> => {
  // Create a translator instance for date format localization
  const t = await createTranslator();
  const { jwt, organizationId, startDate, endDate, driverReportIds, userId, clientTimezone } = params;
  const dateFormat = t("common.format.fns.date"); // Get the date format string
  const orgSettings = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.INCLUDE_ROUTE_POINT_META_IN_REPORTS,
    OrganizationSettingExtendedKey.REPORT_ADDRESS_FORMATTING_RULES,
  ]);

  const includeRoutePointMetaInReports = orgSettings[
    OrganizationSettingExtendedKey.INCLUDE_ROUTE_POINT_META_IN_REPORTS
  ] as boolean;
  const reportAddressFormattingRules = orgSettings[
    OrganizationSettingExtendedKey.REPORT_ADDRESS_FORMATTING_RULES
  ] as AddressFormattingRulesInReport;

  // Map to track unique subcontractor sheet names to avoid duplicates
  const driverNameCollection: Map<string, number> = new Map();

  // Fetch organization and user information concurrently
  const [organizationInfo, userInfo] = await Promise.all([
    getOrganizationReportInfo(jwt, organizationId),
    getUserById(jwt, userId),
  ]);

  const subcontractorCosts: ReportRequest<SubcontractorCostReport>[] = [];

  // Fetch paid trips for each driver's salary report
  const paidTripsPromises = costs.map((cost) =>
    getSubcontractorPaidTrips({
      organizationId,
      driverReportIds,
      subcontractorId: Number(cost.id),
      startDate,
      endDate,
    })
  );

  // Await all paid trips data
  const allPaidTrips = await Promise.all(paidTripsPromises);
  const allOrderTripIds = allPaidTrips.flat().map((trip) => Number(trip.id));

  // Fetch driver expenses for all trip IDs
  let allTripExpenses: OrderTripInfo[] = [];
  if (allOrderTripIds.length) {
    allTripExpenses = await getTripRelatedInfoByIds(jwt, allOrderTripIds);
  }

  // Map to store expenses by trip ID
  const tripExpensesMap = new Map<number, OrderTripInfo>();
  for (const trip of allTripExpenses) {
    if (!tripExpensesMap.has(Number(trip.id))) {
      tripExpensesMap.set(Number(trip.id), trip);
    }
    tripExpensesMap.set(Number(trip.id), trip);
  }

  // Generate the salary report for each subcontractor
  for (let i = 0; i < costs.length; i++) {
    const cost = costs[i];

    // Generate a unique sheet name for each subcontractor
    let sheetName = slugifyString(cost.code, {
      separator: " ",
      lowercase: false,
    });
    const lowerCaseSheetName = sheetName.toLowerCase();
    const existingKeyCount = driverNameCollection.get(lowerCaseSheetName) ?? 0;

    if (existingKeyCount > 0) {
      sheetName = `${sheetName} (${existingKeyCount + 1})`;
    }
    driverNameCollection.set(lowerCaseSheetName, existingKeyCount + 1);
    driverNameCollection.set(sheetName.toLowerCase(), 1);

    const orderTrips: SubcontractorPaidTripReport[] = [];
    const paidTrips = allPaidTrips[i];
    const orderTripIds = paidTrips.map((trip) => Number(trip.id));
    if (paidTrips.length) {
      for (const trip of paidTrips) {
        const relatedInfo = tripExpensesMap.get(Number(trip.id));
        const pickupPoints: string[] = [];
        const deliveryPoints: string[] = [];
        let orderRouteStatuses: Record<string, string> = {};
        for (const point of relatedInfo?.order.route?.pickupPoints ?? []) {
          pickupPoints.push(formatAddressForReport(point.address, reportAddressFormattingRules));
        }
        for (const point of relatedInfo?.order.route?.deliveryPoints ?? []) {
          deliveryPoints.push(formatAddressForReport(point.address, reportAddressFormattingRules));
        }
        if (includeRoutePointMetaInReports) {
          for (const routeStatus of relatedInfo?.order.routeStatuses ?? []) {
            if (routeStatus.routePoint?.code) {
              orderRouteStatuses = {
                ...orderRouteStatuses,
                ...transformCustomFields(
                  `${ROUTE_POINT_META_PREFIX_KEY}_${routeStatus.routePoint?.code}`,
                  clientTimezone,
                  routeStatus.meta as AnyObject
                ),
              };
            }
          }
        }
        orderTrips.push({
          ...(includeRoutePointMetaInReports && { ...orderRouteStatuses }), // Transform meta -> custom fields of order route statuses
          ...transformCustomFields(ORDER_META_PREFIX_KEY, clientTimezone, trip.meta), // Transform meta -> custom fields of order
          ...deleteProperties(trip, ["meta"]), // Don't move this line on top
          ...(clientTimezone && {
            startDate: formatInTimeZone(trip.startDate, clientTimezone, dateFormat),
            endDate: formatInTimeZone(trip.endDate, clientTimezone, dateFormat),
            pickupDate: formatInTimeZone(trip.pickupDate, clientTimezone, dateFormat),
            deliveryDate: formatInTimeZone(trip.deliveryDate, clientTimezone, dateFormat),
          }),
          pickupPoints: pickupPoints.join("\n"),
          deliveryPoints: deliveryPoints.join("\n"),
          orderTotalAmount: ensureString(relatedInfo?.order?.totalAmount) ?? null,
          orderNotes: relatedInfo?.order?.notes ?? null,
          driverExpenseInfo:
            orderTripIds.length > 0 ? getDriverExpenseInfo(tripExpensesMap.get(Number(trip.id)) || {}) : {},
          merchandiseTypes:
            (relatedInfo?.order?.merchandiseTypes ?? [])?.length > 0
              ? relatedInfo?.order?.merchandiseTypes?.map((type) => type.name).join(", ")
              : null,
          order: pick(relatedInfo?.order, [
            "totalAmount",
            "unitPrice",
            "baseQuantity",
            "priceAdjustment",
            "notes",
            "merchandiseNote",
          ]),
        });
      }
    }

    // Assemble the report request data
    subcontractorCosts.push({
      data: {
        body: {
          ...cost,
          ...(clientTimezone && {
            currentDate: formatInTimeZone(new Date(), clientTimezone, "dd"),
            currentMonth: formatInTimeZone(new Date(), clientTimezone, "MM"),
            currentYear: formatInTimeZone(new Date(), clientTimezone, "yyyy"),
            startDate: startDate ? formatInTimeZone(startDate, clientTimezone, dateFormat) : null,
            endDate: endDate ? formatInTimeZone(endDate, clientTimezone, dateFormat) : null,
          }),
          balance: calculateSubcontractorBalance(cost),
          organization: {
            ...deleteProperties(organizationInfo, ["logo"]), // Remove the logo property
          },
          createdByUser: {
            name: getFullName(userInfo.detail?.firstName, userInfo.detail?.lastName),
            phoneNumber: userInfo.phoneNumber,
            email: userInfo.email,
          },
          sheetName,
          orderTrips,
        },
      },
    });
  }

  return subcontractorCosts;
};

/**
 * Calculates the balance for a subcontractor by subtracting the advance total cost from the subcontractor cost total.
 *
 * @param cost - An object containing the total subcontractor cost and the total advance cost.
 * @returns The balance for the subcontractor as a number.
 */
export const calculateSubcontractorBalance = (
  cost: Pick<SubcontractorCostOverview, "subcontractorCostTotal" | "advanceTotalCost">
): number => {
  const { subcontractorCostTotal, advanceTotalCost } = cost;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeNumber = (value: any): number => (typeof value === "number" ? value : parseFloat(value) || 0);
  return safeNumber(subcontractorCostTotal) - safeNumber(advanceTotalCost);
};
