import { OrganizationReportType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import pick from "lodash/pick";

import { getCustomerPaidTrips } from "@/actions/orderTrip";
import { getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import {
  NAM_PHONG_BILL_NO_FIELD_ID,
  NAM_PHONG_CONT_NO_FIELD_ID,
  NAM_PHONG_DECLARATION_NUMBER_ID,
  NAM_PHONG_ORGANIZATION_ID,
} from "@/constants/organization";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { ORDER_META_PREFIX_KEY, ROUTE_POINT_META_PREFIX_KEY } from "@/constants/report";
import { getOrganizationReportInfo } from "@/services/server/organization";
import { getTripRelatedInfoByIds } from "@/services/server/tripDriverExpense";
import { getUserById } from "@/services/server/user";
import { AnyObject } from "@/types";
import { AddressFormattingRulesInReport } from "@/types/organizationSettingExtended";
import {
  AggregateCustomerReport,
  CustomerPaidTripReport,
  CustomerStatisticReport,
  IndividualCustomerStatisticReportParams,
  ReportRequest,
} from "@/types/report";
import { OrderTripInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { transformCustomFields } from "@/utils/customField";
import { createTranslator } from "@/utils/locale";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { ensureString, formatAddressForReport, slugifyString } from "@/utils/string";

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
 * Generates a report request for customer expense.
 *
 * @param params - The parameters for generating the report, excluding `customerId`, but including:
 * @param expense - An array of `DriverSalaryReport` containing salary information for each customer.
 * @returns A promise that resolves to an array of `ReportRequest<DriverSalaryReport>`, each representing a request to generate a customer cost report.
 */
export const getCustomerStatisticReportRequest = async (
  params: Omit<IndividualCustomerStatisticReportParams, "customerId"> & { jwt: string; userId: number },
  statistics: CustomerStatisticReport[]
): Promise<ReportRequest<CustomerStatisticReport>[] | ReportRequest<AggregateCustomerReport>[]> => {
  // Create a translator instance for date format localization
  const t = await createTranslator();
  const { jwt, organizationId, type, startDate, endDate, driverReportIds, userId, clientTimezone } = params;
  const dateFormat = t("common.format.fns.date"); // Get the date format string
  const isNamPhongOrg = equalId(organizationId, NAM_PHONG_ORGANIZATION_ID);
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

  // Map to track unique customer sheet names to avoid duplicates
  const driverNameCollection: Map<string, number> = new Map();

  // Fetch organization and user information concurrently
  const [organizationInfo, userInfo] = await Promise.all([
    getOrganizationReportInfo(jwt, organizationId),
    getUserById(jwt, userId),
  ]);

  const customerStatistics: ReportRequest<CustomerStatisticReport>[] = [];

  // Fetch paid trips for each driver's salary report
  const paidTripsPromises = statistics.map((statistic) =>
    getCustomerPaidTrips({ organizationId, driverReportIds, customerId: Number(statistic.id), startDate, endDate })
  );

  // Await all paid trips data
  const allPaidTrips = await Promise.all(paidTripsPromises);
  const allOrderTripIds = allPaidTrips.flat().map((trip) => Number(trip.id));

  // Fetch driver expenses for all trip IDs
  const allTripRelatedInfo = await getTripRelatedInfoByIds(jwt, allOrderTripIds);

  // Map to store expenses by trip ID
  const tripExpensesMap = new Map<number, OrderTripInfo>();
  for (const trip of allTripRelatedInfo) {
    if (!tripExpensesMap.has(Number(trip.id))) {
      tripExpensesMap.set(Number(trip.id), trip);
    }
    tripExpensesMap.set(Number(trip.id), trip);
  }

  // Generate the salary report for each customer
  for (let i = 0; i < statistics.length; i++) {
    const statistic = statistics[i];

    // Generate a unique sheet name for each customer
    let sheetName = slugifyString(statistic.code, {
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

    const orderTrips: CustomerPaidTripReport[] = [];
    const paidTrips = allPaidTrips[i];
    const orderTripIds = paidTrips.map((trip) => Number(trip.id));

    if (paidTrips.length) {
      for (const trip of paidTrips) {
        const meta = isNamPhongOrg && trip?.meta ? JSON.parse(ensureString(trip.meta)) : null;
        const customFields = meta?.customFields || [];
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
          ...(isNamPhongOrg &&
            meta && {
              billNo: customFields.find((field: AnyObject) => equalId(field.id, NAM_PHONG_BILL_NO_FIELD_ID))?.value,
              contNo: customFields.find((field: AnyObject) => equalId(field.id, NAM_PHONG_CONT_NO_FIELD_ID))?.value,
              declarationNumber: customFields.find((field: AnyObject) =>
                equalId(field.id, NAM_PHONG_DECLARATION_NUMBER_ID)
              )?.value,
            }),
          ...(clientTimezone && {
            startDate: formatInTimeZone(trip.startDate, clientTimezone, dateFormat),
            endDate: formatInTimeZone(trip.endDate, clientTimezone, dateFormat),
            pickupDate: formatInTimeZone(trip.pickupDate, clientTimezone, dateFormat),
            deliveryDate: formatInTimeZone(trip.deliveryDate, clientTimezone, dateFormat),
            billOfLadingReceivedDate: trip.billOfLadingReceivedDate
              ? formatInTimeZone(trip.billOfLadingReceivedDate, clientTimezone, dateFormat)
              : null,
            orderDate: trip.orderDate ? formatInTimeZone(trip.orderDate, clientTimezone, dateFormat) : null,
            orderCompletedDate: trip.orderCompletedDate
              ? formatInTimeZone(trip.orderCompletedDate, clientTimezone, dateFormat)
              : null,
          }),
          pickupPoints: pickupPoints.join("\n"),
          deliveryPoints: deliveryPoints.join("\n"),
          orderTotalAmount: ensureString(relatedInfo?.order?.totalAmount) ?? null,
          orderNotes: relatedInfo?.order?.notes ?? null,
          driverExpenseInfo: orderTripIds.length > 0 ? getDriverExpenseInfo(relatedInfo || {}) : {},
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

    customerStatistics.push({
      data: {
        body: {
          ...statistic,
          ...(clientTimezone && {
            currentDate: formatInTimeZone(new Date(), clientTimezone, "dd"),
            currentMonth: formatInTimeZone(new Date(), clientTimezone, "MM"),
            currentYear: formatInTimeZone(new Date(), clientTimezone, "yyyy"),
            startDate: startDate ? formatInTimeZone(startDate, clientTimezone, dateFormat) : null,
            endDate: endDate ? formatInTimeZone(endDate, clientTimezone, dateFormat) : null,
          }),
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

  if (type === OrganizationReportType.ACCOUNTS_RECEIVABLE) {
    return customerStatistics;
  } else {
    return [
      {
        data: {
          body: {
            ...(clientTimezone && {
              currentDate: formatInTimeZone(new Date(), clientTimezone, "dd"),
              currentMonth: formatInTimeZone(new Date(), clientTimezone, "MM"),
              currentYear: formatInTimeZone(new Date(), clientTimezone, "yyyy"),
              startDate: startDate ? formatInTimeZone(startDate, clientTimezone, dateFormat) : null,
              endDate: endDate ? formatInTimeZone(endDate, clientTimezone, dateFormat) : null,
            }),
            organization: {
              ...deleteProperties(organizationInfo, ["logo"]), // Remove the logo property
            },
            createdByUser: {
              name: getFullName(userInfo.detail?.firstName, userInfo.detail?.lastName),
              phoneNumber: userInfo.phoneNumber,
              email: userInfo.email,
            },
            sheetName: organizationInfo.name,
            orderTrips: customerStatistics
              .flatMap((stat) => stat?.data?.body?.orderTrips || [])
              .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate)),
          } as AggregateCustomerReport,
        },
      },
    ];
  }
};
