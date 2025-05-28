import { NotificationType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { CLIENT_API_KEY, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { getVehicleDocumentSettings } from "@/services/server/organizationSetting";
import { getReminderVehicles } from "@/services/server/vehicle";
import { ApiNextRequest } from "@/types/api";
import {
  VehicleDocumentDriverReminderNotification,
  VehicleDocumentOperatorReminderNotification,
} from "@/types/notification";
import { OrganizationSettingInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { calculateDateDifferenceInDays, formatDate, formatGraphQLDate, minusDays } from "@/utils/date";
import { createTranslator } from "@/utils/locale";
import { pushNotification } from "@/utils/notification";
import { withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Check if the expiration date is today.
 * @param expirationDate Expiration date.
 * @returns True if the expiration date is today, false otherwise.
 */
const isExpired = (expirationDate: Date | null, reminderDays?: number | null): boolean => {
  if (!expirationDate || !reminderDays) {
    return false;
  }

  return (
    calculateDateDifferenceInDays(
      formatGraphQLDate(minusDays(expirationDate, reminderDays))!,
      formatGraphQLDate(new Date())!
    ) === 0
  );
};

/**
 * Send reminders to drivers for vehicle document expiration.
 * @param organizationSettings Array of organization settings.
 * @param vehicles Array of vehicles.
 * @returns An object containing driver reminders and accountant reminder set.
 */
const sendDriverReminder = async (
  organizationSettings: OrganizationSettingInfo[],
  vehicles: VehicleInfo[]
): Promise<{
  driverReminders: VehicleInfo[];
  liabilityInsuranceReminderSet: Record<string, VehicleDocumentOperatorReminderNotification>;
  technicalSafetyReminderSet: Record<string, VehicleDocumentOperatorReminderNotification>;
}> => {
  // Create a map of organization settings with organization id as key
  const organizationSettingsMap = new Map(organizationSettings.map((setting) => [setting.organizationId, setting]));

  // Filter vehicles that need reminders for document expiration
  const driverReminders = vehicles.filter((vehicle) => {
    const reminderDays = organizationSettingsMap.get(vehicle.organizationId)?.minVehicleDocumentReminderDays;
    return (
      isExpired(vehicle?.liabilityInsuranceExpirationDate, reminderDays) ||
      isExpired(vehicle?.technicalSafetyExpirationDate, reminderDays)
    );
  });

  // Initialize operator reminder set
  const liabilityInsuranceReminderSet = {} as Record<string, VehicleDocumentOperatorReminderNotification>;
  const technicalSafetyReminderSet = {} as Record<string, VehicleDocumentOperatorReminderNotification>;
  // Create translator instance
  const t = await createTranslator();
  const defaultFormat = t("common.format.date");
  // Iterate over driver reminders to create reminders and push notifications
  driverReminders.forEach((vehicle) => {
    const {
      id,
      organizationId,
      liabilityInsuranceExpirationDate,
      technicalSafetyExpirationDate,
      vehicleNumber,
      driver,
    } = vehicle;
    const reminderDays = organizationSettingsMap.get(organizationId)?.minVehicleDocumentReminderDays;
    const isLiabilityInsuranceExpired = isExpired(liabilityInsuranceExpirationDate, reminderDays);
    const isTechnicalSafetyExpired = isExpired(technicalSafetyExpirationDate, reminderDays);

    const data: VehicleDocumentDriverReminderNotification = {
      vehicleNumber: ensureString(vehicleNumber),
      ...(isLiabilityInsuranceExpired && {
        liabilityInsuranceExpirationDate: formatDate(liabilityInsuranceExpirationDate, defaultFormat),
      }),
      ...(isTechnicalSafetyExpired && {
        technicalSafetyExpirationDate: formatDate(technicalSafetyExpirationDate, defaultFormat),
      }),
      isSystemGenerated: true,
    };

    if (isLiabilityInsuranceExpired) {
      liabilityInsuranceReminderSet[organizationId] = {
        ...liabilityInsuranceReminderSet[organizationId],
        ...(!liabilityInsuranceReminderSet[organizationId]?.liabilityInsuranceExpirationDate && {
          liabilityInsuranceExpirationDate: formatDate(liabilityInsuranceExpirationDate, defaultFormat),
        }),
        vehicles: [
          ...(liabilityInsuranceReminderSet[organizationId]?.vehicles || []),
          {
            vehicleId: Number(id),
            vehicleNumber: ensureString(vehicleNumber),
            driverName: getFullName(driver?.firstName, driver?.lastName),
          },
        ],
      };
    }

    if (isTechnicalSafetyExpired) {
      technicalSafetyReminderSet[organizationId] = {
        ...technicalSafetyReminderSet[organizationId],
        ...(!technicalSafetyReminderSet[organizationId]?.technicalSafetyExpirationDate && {
          technicalSafetyExpirationDate: formatDate(technicalSafetyExpirationDate, defaultFormat),
        }),
        vehicles: [
          ...(technicalSafetyReminderSet[organizationId]?.vehicles || []),
          {
            vehicleId: Number(id),
            vehicleNumber: ensureString(vehicleNumber),
            driverName: getFullName(driver?.firstName, driver?.lastName),
          },
        ],
      };
    }

    // Push notification to drivers for document expiration
    pushNotification({
      entity: {
        type: NotificationType.VEHICLE_DOCUMENT_DRIVER_REMINDER,
        organizationId,
        createdById: 1,
        targetId: Number(id),
      },
      data,
      jwt: STRAPI_TOKEN_KEY,
      ...(driver?.user?.id && {
        receivers: [{ user: { id: Number(driver.user.id) } }],
      }),
      isSendToParticipants: false,
    });
  });

  // Return driver reminders and accountant reminder set
  return { driverReminders, liabilityInsuranceReminderSet, technicalSafetyReminderSet };
};

/**
 * Send reminders to accountants for vehicle document expiration.
 * @param accountantReminderSet Record containing accountant reminder set.
 */
const sendAccountantReminder = async (
  liabilityInsuranceReminderSet: Record<string, VehicleDocumentOperatorReminderNotification>,
  technicalSafetyReminderSet: Record<string, VehicleDocumentOperatorReminderNotification>
): Promise<void> => {
  // Push notification for each organization
  Object.keys(liabilityInsuranceReminderSet).forEach((organizationId) => {
    pushNotification({
      entity: {
        type: NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER,
        organizationId: Number(organizationId),
        createdById: 1,
        targetId: Number(organizationId),
      },
      data: {
        liabilityInsuranceExpirationDate:
          liabilityInsuranceReminderSet[organizationId].liabilityInsuranceExpirationDate,
        vehicles: liabilityInsuranceReminderSet[organizationId].vehicles,
        isSystemGenerated: true,
      },
      jwt: STRAPI_TOKEN_KEY,
      orgMemberRoles: [
        OrganizationRoleType.DISPATCH_MANAGER,
        OrganizationRoleType.DISPATCHER,
        OrganizationRoleType.ACCOUNTANT,
      ],
      isSendToParticipants: false,
    });
  });

  // Push notification for each organization
  Object.keys(technicalSafetyReminderSet).forEach((organizationId) => {
    pushNotification({
      entity: {
        type: NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER,
        organizationId: Number(organizationId),
        createdById: 1,
        targetId: Number(organizationId),
      },
      data: {
        technicalSafetyExpirationDate: technicalSafetyReminderSet[organizationId].technicalSafetyExpirationDate,
        vehicles: technicalSafetyReminderSet[organizationId].vehicles,
        isSystemGenerated: true,
      },
      jwt: STRAPI_TOKEN_KEY,
      orgMemberRoles: [
        OrganizationRoleType.DISPATCH_MANAGER,
        OrganizationRoleType.DISPATCHER,
        OrganizationRoleType.ACCOUNTANT,
      ],
      isSendToParticipants: false,
    });
  });
};

/**
 * Handle POST request with exception handling.
 * @param req Incoming request object.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest) => {
  const clientApiKey = req.headers.get("client-api-key");

  // Check if the client API key is provided and valid
  if (!clientApiKey || clientApiKey !== CLIENT_API_KEY) {
    return { status: HttpStatusCode.Unauthorized, message: "Unauthorized" };
  }

  // Retrieve organization settings for vehicle documents
  const organizationSettings = await getVehicleDocumentSettings(STRAPI_TOKEN_KEY);

  // Check if organization settings are available
  if (organizationSettings.length === 0) {
    return { status: HttpStatusCode.Ok, message: "No max days found" };
  }

  // Retrieve reminder vehicles based on organization settings
  const reminderVehicles: VehicleInfo[] = await getReminderVehicles(STRAPI_TOKEN_KEY, organizationSettings);

  // Check if reminder vehicles are available
  if (reminderVehicles.length === 0) {
    return { status: HttpStatusCode.Ok, message: "No reminder vehicles found" };
  }

  // Send reminders to drivers and operators
  const { driverReminders, technicalSafetyReminderSet, liabilityInsuranceReminderSet } = await sendDriverReminder(
    organizationSettings,
    reminderVehicles
  );

  await sendAccountantReminder(liabilityInsuranceReminderSet, technicalSafetyReminderSet);

  // Calculate reminder counts
  const driverReminderCount = driverReminders.length;
  const operatorReminderCount =
    Object.keys(liabilityInsuranceReminderSet).length + Object.keys(technicalSafetyReminderSet).length;

  // Return success response with reminder counts
  return { status: HttpStatusCode.Ok, data: [driverReminderCount, operatorReminderCount] };
});
