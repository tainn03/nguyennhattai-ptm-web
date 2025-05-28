import { trailerOptions } from "@/configs/media";
import { checkIdNumberExists, checkTrailerNumberExists, createTrailer } from "@/services/server/trailer";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { TrailerInfo } from "@/types/strapi";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the creation of a trailer, including checks for existence, file uploads, and the main creation process.
 * Returns an OK response with the created trailer data if the creation is successful.
 * Otherwise, returns a bad request response with an error message.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {TrailerInfo} data - The data for creating a trailer.
 * @returns {object} An object containing the HTTP status and result data, including the created trailer.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: TrailerInfo) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);

  const {
    subcontractorId,
    images,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
  } = data;

  // Check if the trailer number already exists.
  const isVehicleNumberExists = await checkTrailerNumberExists(jwt, data.trailerNumber, organizationId);
  if (isVehicleNumberExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.trailerNumber}` };
  }

  // If an ID number is provided, check if it already exists.
  if (data.idNumber) {
    const isIdNumberExists = await checkIdNumberExists(jwt, data.idNumber, organizationId);
    if (isIdNumberExists) {
      return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.idNumber}` };
    }
  }

  // Initialize an array to store the IDs of uploaded images.
  const idImages: Array<number> = [];
  if (images && images.length > 0) {
    for (const item of images) {
      const id = await uploadFileStrapi(ensureString(item.name), ensureString(item.name), organizationId);
      idImages.push(id);
    }
  }

  // Upload registration certificate if provided.
  if (registrationCertificate?.[0]?.name) {
    registrationCertificate[0].id = await uploadFileStrapi(
      ensureString(registrationCertificate[0].name),
      ensureString(registrationCertificate[0].name),
      organizationId
    );
  }

  // Upload technical safety certificate if provided.
  if (technicalSafetyCertificate?.[0]?.name) {
    technicalSafetyCertificate[0].id = await uploadFileStrapi(
      ensureString(technicalSafetyCertificate[0].name),
      ensureString(technicalSafetyCertificate[0].name),
      organizationId
    );
  }

  // Upload liability insurance certificate if provided.
  if (liabilityInsuranceCertificate?.[0]?.name) {
    liabilityInsuranceCertificate[0].id = await uploadFileStrapi(
      ensureString(liabilityInsuranceCertificate[0].name),
      ensureString(liabilityInsuranceCertificate[0].name),
      organizationId
    );
  }

  // Call the createTrailer function to create the trailer in the database.
  const result = await createTrailer(jwt, {
    ...data,
    idImages: idImages,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
    organizationId,
    subcontractorId,
    createdById,
  });

  // Return the result of the trailer creation.
  return { status: HttpStatusCode.Ok, data: result };
});

const uploadFileStrapi = async (localFileName: string, uploadFileName: string, orgId: number): Promise<number> => {
  const { id } = await uploadFile(trailerOptions.localPath, localFileName, uploadFileName, trailerOptions.folder, {
    orgId,
  });
  return id;
};
