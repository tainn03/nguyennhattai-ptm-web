import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import pick from "lodash/pick";

import { getDriverPaidTrips } from "@/actions/orderTrip";
import { getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { ORDER_META_PREFIX_KEY, ROUTE_POINT_META_PREFIX_KEY } from "@/constants/report";
import { getOrganizationReportInfo } from "@/services/server/organization";
import { getTripRelatedInfoByIds } from "@/services/server/tripDriverExpense";
import { getUserById } from "@/services/server/user";
import { AnyObject } from "@/types";
import { LocaleType } from "@/types/locale";
import { AddressFormattingRulesInReport } from "@/types/organizationSettingExtended";
import {
  DriverPaidTripReport,
  DriverSalaryOverview,
  DriverSalaryReport,
  IndividualDriverSalaryReportParams,
  ReportRequest,
} from "@/types/report";
import { OrderTripInfo, OrganizationMemberInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { transformCustomFields } from "@/utils/customField";
import { createTranslator } from "@/utils/locale";
import { deleteProperties } from "@/utils/object";
import { ensureString, formatAddressForReport, slugifyString } from "@/utils/string";

/**
 * Extracts distinct driver IDs from an array of organization members.
 *
 * @param {OrganizationMemberInfo[]} arrayList - An array of organization members.
 * @returns {number[]} - An array containing distinct driver IDs.
 */
export const getDistinctDriverIds = (arrayList: OrganizationMemberInfo[]): number[] => {
  const driverIds = new Set(arrayList.map((item) => Number(item.member.id)));
  return Array.from(driverIds);
};

/**
 * Calculates the actual salary for a driver by summing the basic salary and trip salary total,
 * then subtracting salary advances, total advance costs, union dues, and security deposits.
 *
 * @param {Pick<DriverSalaryOverview, "basicSalary" | "tripSalaryTotal" | "salaryAdvance" | "advanceTotalCost" | "unionDues" | "securityDeposit">} salary
 *   An object containing the salary components
 * @returns {number} The calculated actual salary.
 */
export const calculateDriverActualSalaryOrBalance = (
  salary: Pick<
    DriverSalaryOverview,
    "basicSalary" | "tripSalaryTotal" | "salaryAdvance" | "advanceTotalCost" | "unionDues" | "securityDeposit"
  >,
  type: "actualSalary" | "balance" = "actualSalary"
): number => {
  const { basicSalary, tripSalaryTotal, salaryAdvance, advanceTotalCost, unionDues, securityDeposit } = salary;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeNumber = (value: any): number => (typeof value === "number" ? value : parseFloat(value) || 0);
  return (
    safeNumber(tripSalaryTotal) -
    safeNumber(salaryAdvance) -
    safeNumber(advanceTotalCost) -
    safeNumber(unionDues) -
    safeNumber(securityDeposit) +
    (type === "balance" ? 0 : safeNumber(basicSalary))
  );
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
 * Generates a report request for driver salaries.
 *
 * @param params - The parameters for generating the report, excluding `driverId`, but including:
 * @param salaries - An array of `DriverSalaryReport` containing salary information for each driver.
 * @returns A promise that resolves to an array of `ReportRequest<DriverSalaryReport>`, each representing a request to generate a driver salary report.
 */
export const getDriverSalariesReportRequest = async (
  params: Omit<IndividualDriverSalaryReportParams, "driverId"> & { jwt: string; userId: number },
  salaries: DriverSalaryReport[]
): Promise<ReportRequest<DriverSalaryReport>[]> => {
  const { jwt, organizationId, startDate, endDate, driverReportIds, userId, locale, clientTimezone } = params;
  // Create a translator instance for date format localization
  const t = await createTranslator((locale as LocaleType) ?? DEFAULT_LOCALE);
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

  // Map to track unique driver sheet names to avoid duplicates
  const driverNameCollection: Map<string, number> = new Map();

  // Fetch organization and user information concurrently
  const [organizationInfo, userInfo] = await Promise.all([
    getOrganizationReportInfo(jwt, organizationId),
    getUserById(jwt, userId),
  ]);

  const driverSalaries: ReportRequest<DriverSalaryReport>[] = [];

  // Fetch paid trips for each driver's salary report
  const paidTripsPromises = salaries.map((salary) =>
    getDriverPaidTrips({
      organizationId,
      driverReportIds,
      driverId: Number(salary.driverId),
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

  // Generate the salary report for each driver
  for (let i = 0; i < salaries.length; i++) {
    const salary = salaries[i];

    // Generate a unique sheet name for each driver
    let sheetName = slugifyString(getFullName(salary.firstName, salary.lastName), {
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

    const orderTrips: DriverPaidTripReport[] = [];
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
          driverExpenseInfo: orderTripIds.length > 0 ? getDriverExpenseInfo(relatedInfo ?? {}) : {},
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
    driverSalaries.push({
      data: {
        body: {
          ...salary,
          ...(clientTimezone && {
            currentDate: formatInTimeZone(new Date(), clientTimezone, "dd"),
            currentMonth: formatInTimeZone(new Date(), clientTimezone, "MM"),
            currentYear: formatInTimeZone(new Date(), clientTimezone, "yyyy"),
            startDate: startDate ? formatInTimeZone(startDate, clientTimezone, dateFormat) : null,
            endDate: endDate ? formatInTimeZone(endDate, clientTimezone, dateFormat) : null,
          }),
          actualSalary: calculateDriverActualSalaryOrBalance(salary),
          balance: calculateDriverActualSalaryOrBalance(salary, "balance"),
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

  return driverSalaries;
};
