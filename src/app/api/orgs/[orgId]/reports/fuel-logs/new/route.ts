import { FuelType, NotificationType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import fse from "fs-extra";
import moment from "moment";
import path from "path";

import { fuelMeterOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { FuelLogInputForm } from "@/forms/fuelLog";
import { createFuelLog, getRecentFuelLogByVehicle } from "@/services/server/fuelLog";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { LocaleType } from "@/types/locale";
import { FuelLogNotification } from "@/types/notification";
import { getFullName } from "@/utils/auth";
import { createTranslator } from "@/utils/locale";
import { pushNotification } from "@/utils/notification";
import { formatNumber } from "@/utils/number";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * This function handles the POST request for the fuel log.
 * If the creation is successful, it returns a response with the HTTP status code 200 and the created ID.
 * If the creation fails, it returns a response with the HTTP status code 500 and an error code.
 *
 * @param {ApiNextRequest} req - The request object.
 * @param {FuelLogInputForm} requestData - The request data.
 * @param {LocaleType} locale - The locale code for the desired language.
 * @returns {Promise<{status: HttpStatusCode, data?: number, code?: ErrorType}>} - The response object.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, requestData: FuelLogInputForm & { locale: LocaleType }) => {
    const { organizationId: serverOrganizationId, userId, jwt } = getToken(req);
    const {
      organizationId: clientOrganizationId,
      fuelMeterImage,
      date,
      odometerImage,
      isNotify,
      vehicle,
      odometerReading,
      locale,
      ...otherProps
    } = requestData;

    const t = await createTranslator(locale);

    let uploadedFuelMeterImage: number | undefined = undefined;
    let uploadedOdometerImage: number | undefined = undefined;
    const momentDate = moment(date || new Date());
    const organizationId = serverOrganizationId || Number(clientOrganizationId);

    // Upload fuel meter image
    if (fuelMeterImage) {
      // Prepare upload path
      const uploadPath = path.resolve(fuelMeterOptions.localPath);

      // Check if the upload path exists, create it if not
      const isExists = await fse.exists(uploadPath);
      if (!isExists) {
        await fse.mkdir(uploadPath, { recursive: true });
      }
      const fuelMeterImageName = ensureString(fuelMeterImage.name);
      const { id: uploadFileId } = await uploadFile(
        fuelMeterOptions.localPath,
        fuelMeterImageName,
        fuelMeterImageName,
        fuelMeterOptions.folder,
        {
          orgId: organizationId,
          mmyyyy: momentDate.format("MMYYYY"),
        }
      );

      uploadedFuelMeterImage = uploadFileId;
    }

    // Upload odometer image
    if (odometerImage) {
      // Prepare upload path
      const uploadPath = path.resolve(fuelMeterOptions.localPath);

      // Check if the upload path exists, create it if not
      const isExists = await fse.exists(uploadPath);
      if (!isExists) {
        await fse.mkdir(uploadPath, { recursive: true });
      }

      const odometerImageName = ensureString(odometerImage.name);
      const { id: uploadFileId } = await uploadFile(
        fuelMeterOptions.localPath,
        odometerImageName,
        odometerImageName,
        fuelMeterOptions.folder,
        {
          orgId: organizationId,
          mmyyyy: momentDate.format("MMYYYY"),
        }
      );

      uploadedOdometerImage = uploadFileId;
    }
    // Set latest odometer reading
    let lastOdometer: number | undefined;

    // Get latest fuel log by vehicle
    const lastVehicleFuelLog = await getRecentFuelLogByVehicle(jwt, {
      organizationId,
      vehicle: { id: vehicle?.id },
      date,
    });
    if (lastVehicleFuelLog) {
      lastOdometer = Number(lastVehicleFuelLog.odometerReading);
    }

    const createdId = await prisma.$transaction(async (prisma) => {
      // Create the gas station record with associated details.
      const createdFuelLogId = await createFuelLog(
        jwt,
        prisma,
        {
          ...otherProps,
          vehicle,
          odometerReading,
          date,
          organizationId,
          createdById: userId,
        },
        uploadedFuelMeterImage,
        uploadedOdometerImage,
        lastOdometer
      );
      return createdFuelLogId;
    });

    if (createdId) {
      if (isNotify) {
        const { driver, vehicle, gasStation, liters, odometerReading, fuelType } = requestData;
        const driverFullName = getFullName(driver?.firstName, driver?.lastName);

        // Data for the new order notification.
        const dataNotification: FuelLogNotification = {
          vehicleNumber: ensureString(vehicle?.vehicleNumber),
          driverFullName,
          liters: formatNumber(Number(liters)),
          fuelName:
            fuelType === FuelType.GASOLINE ? t("report.fuel_log.type.gasoline") : t("report.fuel_log.type.diesel"),
          odometerReading: formatNumber(Number(odometerReading)),
          gasStationName: ensureString(gasStation?.name),
        };

        // Send a notification to relevant members.
        pushNotification({
          entity: {
            type: NotificationType.NEW_FUEL_LOG,
            organizationId,
            createdById: userId,
            targetId: Number(createdId),
          },
          data: dataNotification,
          jwt,
          orgMemberRoles: [
            OrganizationRoleType.MANAGER,
            OrganizationRoleType.ACCOUNTANT,
            OrganizationRoleType.DISPATCHER,
          ],
          isSendToParticipants: false,
        });
      }
      return { status: HttpStatusCode.Ok, data: createdId };
    } else {
      return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
    }
  }
);
