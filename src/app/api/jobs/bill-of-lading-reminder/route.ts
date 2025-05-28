import { NotificationType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { CLIENT_API_KEY, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { getReminderTripsForBillOfLading } from "@/services/server/orderTrip";
import { findMaxOfMinBillOfLadingSubmitDays } from "@/services/server/route";
import { ApiNextRequest } from "@/types/api";
import {
  BillOfLadingAccountantReminderNotification,
  BillOfLadingDriverReminderNotification,
} from "@/types/notification";
import { OrderTripInfo, OrganizationSettingInfo } from "@/types/strapi";
import { addDays, calculateDateDifferenceInDays, formatDate, formatGraphQLDate, minusDays } from "@/utils/date";
import { createTranslator } from "@/utils/locale";
import { pushNotification } from "@/utils/notification";
import { withExceptionHandler } from "@/utils/server";
import { ensureString, joinNonEmptyStrings } from "@/utils/string";

/**
 * Retrieves the maximum of minimum bill of lading submit days from routes and organization settings.
 * @returns {Promise<{ maxDays: number, organizationSettings: OrganizationSettingInfo[] }>} An object containing the maximum days and organization settings.
 */
const getMaxDaysAndOrganizationSettings = async () => {
  // Find the maximum of minimum bill of lading submit days from routes and organization settings
  const [maxDaysInRoute, organizationSettings] = await findMaxOfMinBillOfLadingSubmitDays(STRAPI_TOKEN_KEY);
  const maxDaysInSettings = organizationSettings.length > 0 ? organizationSettings[0].minBOLSubmitDays : 0;
  const maxDays = Math.max(maxDaysInRoute || 0, maxDaysInSettings || 0);
  return { maxDays, organizationSettings };
};

/**
 * Sends reminders to drivers and prepares reminders for accountants for bill of lading submissions.
 * @param {OrganizationSettingInfo[]} organizationSettings - The organization settings.
 * @param {OrderTripInfo[]} reminderTrips - The list of reminder trips.
 * @returns {Promise<{ driverReminders: OrderTripInfo[], accountantReminderSet: Record<string, BillOfLadingAccountantReminderNotification> }>} An object containing driver reminders and accountant reminders.
 */
const sendDriverReminder = async (organizationSettings: OrganizationSettingInfo[], reminderTrips: OrderTripInfo[]) => {
  // Create a map of organization settings keyed by organization ID
  const organizationSettingsMap = new Map(organizationSettings.map((setting) => [setting.organizationId, setting]));

  // Filter reminder trips for driver reminders
  const driverReminders = reminderTrips.filter((trip) => {
    let actualReminderDate: Date | null | undefined = null;
    const dateToConsider = trip?.statuses?.[0]?.createdAt;
    const minBOLSubmitDays =
      trip.order?.route?.minBOLSubmitDays || organizationSettingsMap.get(trip.organizationId)?.minBOLSubmitDays;

    if (minBOLSubmitDays) {
      actualReminderDate = dateToConsider && addDays(dateToConsider, minBOLSubmitDays);
    }

    return (
      actualReminderDate &&
      calculateDateDifferenceInDays(formatGraphQLDate(actualReminderDate)!, formatGraphQLDate(new Date())!) === 0
    );
  });

  const t = await createTranslator();
  const accountantReminderSet = {} as Record<string, BillOfLadingAccountantReminderNotification>;
  driverReminders.forEach((trip) => {
    const { id, organizationId, code, order, driver } = trip;
    // Prepare data for driver reminder notification
    const data: BillOfLadingDriverReminderNotification = {
      orderCode: ensureString(order.code),
      tripCode: ensureString(code),
      driverName: joinNonEmptyStrings([driver?.lastName, driver?.firstName], " "),
      billOfLadingSubmitDate: formatDate(new Date(), t("common.format.date"))!,
      isSystemGenerated: true,
    };

    // Add driver reminder to the accountant reminder set
    accountantReminderSet[organizationId] = {
      ...accountantReminderSet[organizationId],
      orderTrips: [
        ...(accountantReminderSet[organizationId]?.orderTrips || []),
        {
          tripCode: data.tripCode,
          driverName: data.driverName,
          orderCode: data.orderCode,
        },
      ],
    };

    // Push notification for driver reminder
    pushNotification({
      entity: {
        type: NotificationType.BILL_OF_LADING_DRIVER_REMINDER,
        organizationId,
        createdById: 1,
        targetId: Number(id),
      },
      data,
      jwt: STRAPI_TOKEN_KEY,
      ...(driver?.user?.id && { receivers: [{ user: { id: Number(driver.user.id) } }] }),
      isSendToParticipants: false,
    });
  });

  return { driverReminders, accountantReminderSet };
};

/**
 * Sends reminders to accountants for bill of lading submissions.
 * @param {Record<string, BillOfLadingAccountantReminderNotification>} accountantReminderSet - The set of accountant reminders keyed by organization ID.
 */
const sendAccountantReminder = async (
  accountantReminderSet: Record<string, BillOfLadingAccountantReminderNotification>
) => {
  const t = await createTranslator();
  // Push notification for each organization
  Object.keys(accountantReminderSet).forEach((organizationId) => {
    pushNotification({
      entity: {
        type: NotificationType.BILL_OF_LADING_ACCOUNTANT_REMINDER,
        organizationId: Number(organizationId),
        createdById: 1,
        targetId: Number(organizationId),
      },
      data: {
        orderTrips: accountantReminderSet[organizationId].orderTrips,
        billOfLadingSubmitDate: formatDate(new Date(), t("common.format.date"))!,
        isSystemGenerated: true,
      },
      jwt: STRAPI_TOKEN_KEY,
      orgMemberRoles: [OrganizationRoleType.ACCOUNTANT],
      isSendToParticipants: false,
    });
  });
};

/**
 * Handler for POST request to send bill of lading submission reminders.
 * @param {ApiNextRequest} req - The request object containing headers.
 * @returns {Promise<{ status: HttpStatusCode; message?: string; data?: number; }>} A promise that resolves to an object containing the status and optionally a message or data.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest) => {
  const clientApiKey = req.headers.get("client-api-key");
  // Check if the client API key is provided and valid
  if (!clientApiKey || clientApiKey !== CLIENT_API_KEY) {
    return { status: HttpStatusCode.Unauthorized, message: "Unauthorized" };
  }

  // Get the maximum days and organization settings for reminders
  const { maxDays, organizationSettings } = await getMaxDaysAndOrganizationSettings();
  if (!maxDays) {
    return { status: HttpStatusCode.NoContent, message: "No max days found" };
  }

  // Calculate the reminder date
  const reminderDate = minusDays(new Date(), maxDays!);
  let reminderTrips: OrderTripInfo[] = [];
  if (reminderDate) {
    // Get the reminder trips for bill of lading
    reminderTrips = await getReminderTripsForBillOfLading(reminderDate);
  }

  if (reminderTrips.length === 0) {
    return { status: HttpStatusCode.NoContent, message: "No reminder trips found" };
  }

  // Send reminders to drivers
  const { driverReminders, accountantReminderSet } = await sendDriverReminder(organizationSettings, reminderTrips);
  // Send reminders to accountants
  await sendAccountantReminder(accountantReminderSet);

  const driverReminderCount = driverReminders.length;
  const accountantReminderCount = Object.keys(accountantReminderSet).length;

  return { status: HttpStatusCode.Ok, data: [driverReminderCount, accountantReminderCount] };
});
