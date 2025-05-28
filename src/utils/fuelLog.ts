import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";

import { getOrganizationReportInfo } from "@/services/server/organization";
import { getUserById } from "@/services/server/user";
import { LocaleType } from "@/types/locale";
import { FuelLogReport, FuelLogsHistoryExportData, ReportRequest } from "@/types/report";
import { FuelLogInfo } from "@/types/strapi";

import { getFullName } from "./auth";
import { createTranslator } from "./locale";
import { deleteProperties } from "./object";

/**
 * Calculates the average fuel consumption in liters per 100 kilometers.
 * @param {number} distanceInKm - The distance traveled in kilometers.
 * @param {number} liter - The amount of fuel consumed in liters.
 * @returns {number} The average fuel consumption in liters per 100 kilometers.
 */
export const calculateAverageConsumption = (distanceInKm: number, liter: number): number => {
  return (liter * 100) / distanceInKm;
};

/**
 * Calculates the average fuel consumption in liters per hour.
 * @param {number} hours - The time spent driving in hours.
 * @param {number} liter - The amount of fuel consumed in liters.
 * @returns {number} The average fuel consumption in liters per hour.
 */
export const getFuelLogReportRequest = async (
  jwt: string,
  organizationId: number,
  userId: number,
  startDate: string,
  endDate: string,
  clientTimezone: string,
  data: FuelLogInfo[],
  locale: LocaleType
): Promise<ReportRequest<FuelLogsHistoryExportData>[]> => {
  const t = await createTranslator(locale);
  const dateFormat = t("common.format.fns.date");
  const datetimeFormat = t("common.format.fns.datetime");
  const fuelLogs = [];

  const organizationInfo = await getOrganizationReportInfo(jwt, organizationId);
  const userInfo = await getUserById(jwt, userId);

  for (const log of data) {
    const fuelLog: FuelLogReport = {
      ...log,
      confirmationBy: {
        name: getFullName(log.confirmationBy?.detail?.firstName, log.confirmationBy?.detail?.lastName) || "",
      },
      confirmationAt: log.confirmationAt ? formatInTimeZone(log.confirmationAt, clientTimezone, datetimeFormat) : null,
      date: log.date ? formatInTimeZone(log.date, clientTimezone, datetimeFormat) : null,
    };
    fuelLogs.push(fuelLog);
  }

  return [
    {
      data: {
        body: {
          fuelLogs,
          sheetName: t("report.fuel_log.export.sheet_name"),
          startDate: formatInTimeZone(startDate, clientTimezone, dateFormat),
          endDate: formatInTimeZone(endDate, clientTimezone, dateFormat),
          organization: {
            ...deleteProperties(organizationInfo, ["logo"]),
          },
          createdByUser: {
            name: getFullName(userInfo.detail?.firstName, userInfo.detail?.lastName) || "",
          },
        },
      },
    },
  ];
};
