import { vehicleOptions } from "@/configs/media";
import { uploadFile } from "@/services/server/uploadFile";
import { checkIdNumberExists, checkVehicleNumberExists, createVehicle } from "@/services/server/vehicle";
import { ErrorType } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { VehicleInfo } from "@/types/strapi";
import { withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: VehicleInfo) => {
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  const { user, jwt } = req.token;

  const {
    subcontractorId,
    images,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
  } = data;

  const isVehicleNumberExists = await checkVehicleNumberExists(jwt, data.vehicleNumber, Number(user.orgId));
  if (isVehicleNumberExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.vehicleNumber}` };
  }

  if (data.idNumber) {
    const isIdNumberExists = await checkIdNumberExists(jwt, data.idNumber, Number(user.orgId));
    if (isIdNumberExists) {
      return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.idNumber}` };
    }
  }

  const idImages: Array<number> = [];
  if (images && images.length > 0) {
    for (const item of images) {
      const id = await uploadFileStrapi(
        ensureString(item.name),
        `${user.id}_${ensureString(item.name)}`,
        Number(user.orgId)
      );
      idImages.push(id);
    }
  }

  if (registrationCertificate?.[0]?.name) {
    registrationCertificate[0].id = await uploadFileStrapi(
      ensureString(registrationCertificate[0].name),
      `${user.id}_${ensureString(registrationCertificate[0].name)}`,
      Number(user.orgId)
    );
  }

  if (technicalSafetyCertificate?.[0]?.name) {
    technicalSafetyCertificate[0].id = await uploadFileStrapi(
      ensureString(technicalSafetyCertificate[0].name),
      `${user.id}_${ensureString(technicalSafetyCertificate[0].name)}`,
      Number(user.orgId)
    );
  }

  if (liabilityInsuranceCertificate?.[0]?.name) {
    liabilityInsuranceCertificate[0].id = await uploadFileStrapi(
      ensureString(liabilityInsuranceCertificate[0].name),
      `${user.id}_${ensureString(liabilityInsuranceCertificate[0].name)}`,
      Number(user.orgId)
    );
  }

  const result = await createVehicle(jwt, {
    ...data,
    idImages: idImages,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
    organizationId: Number(user.orgId),
    subcontractorId,
    createdById: Number(user.id),
  });

  if (!result) {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }

  return { status: HttpStatusCode.Ok, data: result };
});

const uploadFileStrapi = async (localFileName: string, uploadFileName: string, orgId: number): Promise<number> => {
  const { id } = await uploadFile(vehicleOptions.localPath, localFileName, uploadFileName, vehicleOptions.folder, {
    orgId,
  });
  return id;
};
