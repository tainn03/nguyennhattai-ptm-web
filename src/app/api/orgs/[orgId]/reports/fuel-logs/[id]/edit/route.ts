import { HttpStatusCode } from "axios";
import moment from "moment";

import { fuelMeterOptions, odometerOptions } from "@/configs/media";
import { FuelLogInputForm } from "@/forms/fuelLog";
import { checkFuelLogExclusives, getRecentFuelLogByVehicle, updateFuelLog } from "@/services/server/fuelLog";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { equalId } from "@/utils/number";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * This function handles the PUT request for the fuel log.
 * It extracts the necessary information from the request and the request data.
 * The function deletes the old fuel meter and odometer images if they exist, uploads the new images if they exist, and updates the fuel log record in the database.
 *
 * @param {ApiNextRequest} req - The request object.
 * @param {FuelLogInputForm} data - The request data.
 * @returns {Promise<{status: HttpStatusCode, data?: number, code?: ErrorType}>} - The response object.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, data: FuelLogInputForm) => {
  const { jwt, organizationId, userId: updatedById } = getToken(req);

  const { id, fuelMeterImage, lastFuelLogImageId, odometerImage, lastOdometerImageId, date, updatedAt, vehicle } = data;

  // Check vehicles exclusives
  const isErrorExclusives = await checkFuelLogExclusives(jwt, organizationId, Number(id), updatedAt as Date);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.BadRequest, message: ErrorType.EXCLUSIVE };
  }

  let uploadedFuelMeterImage: number | undefined = undefined;
  let uploadedOdometerImage: number | undefined = undefined;
  const momentDate = moment(date || new Date());

  if (lastFuelLogImageId && !equalId(lastFuelLogImageId, fuelMeterImage?.id)) {
    await deleteFile(jwt, lastFuelLogImageId);
  }
  if (fuelMeterImage && !equalId(lastFuelLogImageId, fuelMeterImage?.id)) {
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

  if (lastOdometerImageId && !equalId(lastOdometerImageId, odometerImage?.id)) {
    await deleteFile(jwt, lastOdometerImageId);
  }

  if (odometerImage && !equalId(lastOdometerImageId, odometerImage?.id)) {
    const odometerImageName = ensureString(odometerImage.name);
    const { id: uploadFileId } = await uploadFile(
      odometerOptions.localPath,
      odometerImageName,
      odometerImageName,
      odometerOptions.folder,
      {
        orgId: organizationId,
        mmyyyy: momentDate.format("MMYYYY"),
      }
    );
    uploadedOdometerImage = uploadFileId;
  }

  const lastVehicleFuelLog = await getRecentFuelLogByVehicle(jwt, {
    id,
    organizationId,
    vehicle: { id: vehicle?.id },
    date,
  });

  let lastOdometer: number | undefined;
  if (lastVehicleFuelLog) {
    lastOdometer = Number(lastVehicleFuelLog.odometerReading);
  }

  const updatedFuelLogId = await updateFuelLog(
    jwt,
    {
      ...data,
      organizationId,
      updatedById,
    },
    uploadedFuelMeterImage,
    uploadedOdometerImage,
    lastOdometer
  );

  if (updatedFuelLogId) {
    return { status: HttpStatusCode.Ok, data: updatedFuelLogId };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
