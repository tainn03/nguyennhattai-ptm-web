import { vehicleOptions } from "@/configs/media";
import { VehicleInfoUpdateForm } from "@/forms/vehicle";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import {
  checkIdNumberExists,
  checkVehicleNumberExists,
  checkVehiclesExclusives,
  updateVehicle,
} from "@/services/server/vehicle";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: VehicleInfoUpdateForm) => {
  const { jwt, organizationId, userId: updatedById } = getToken(req);

  const {
    id,
    subcontractorId,
    images,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
    lastUpdatedAt,
    deleteImage,
    registrationCertificateImageId,
    technicalSafetyCertificateImageId,
    liabilityInsuranceCertificateImageId,
    deleteRegistrationCertificate,
    deleteTechnicalSafetyCertificate,
    deleteLiabilityInsuranceCertificate,
  } = data;

  // Check vehicles exclusives
  const isErrorExclusives = await checkVehiclesExclusives(jwt, organizationId, Number(id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.BadRequest, message: ErrorType.EXCLUSIVE };
  }

  // Check vehicle Number exists
  const isVehicleNumberExists = await checkVehicleNumberExists(jwt, data.vehicleNumber, organizationId, Number(id));
  if (isVehicleNumberExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.vehicleNumber}` };
  }

  // Check Id number exists
  if (data.idNumber) {
    const isIdNumberExists = await checkIdNumberExists(jwt, data.idNumber, organizationId, Number(id));
    if (isIdNumberExists) {
      return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.idNumber}` };
    }
  }

  // Delete multiple image old
  if (deleteImage) {
    for (const item of deleteImage) {
      await deleteFile(jwt, item);
    }
  }

  // Delete file registrationCertificate when exist registrationCertificateImageId
  if (deleteRegistrationCertificate && registrationCertificateImageId) {
    await deleteFile(jwt, registrationCertificateImageId);
  }

  // Delete file technicalSafetyCertificate when exist technicalSafetyCertificateImageId
  if (deleteTechnicalSafetyCertificate && technicalSafetyCertificateImageId) {
    await deleteFile(jwt, technicalSafetyCertificateImageId);
  }

  // Delete file liabilityInsuranceCertificate when exist liabilityInsuranceCertificateImageId
  if (deleteLiabilityInsuranceCertificate && liabilityInsuranceCertificateImageId) {
    await deleteFile(jwt, liabilityInsuranceCertificateImageId);
  }

  // Upload multiple file images
  const idImages: Array<number> = [];
  if (images && images.length > 0) {
    for (const item of images) {
      if (!item.id) {
        const id = await uploadFileStrapi(ensureString(item.name), ensureString(item.name), organizationId);
        idImages.push(id);
      } else {
        idImages.push(item.id);
      }
    }
  }

  // Delete image registrationCertificate old
  if (registrationCertificate?.[0]?.name) {
    if (registrationCertificateImageId) {
      await deleteFile(jwt, registrationCertificateImageId);
    }
    registrationCertificate[0].id = await uploadFileStrapi(
      ensureString(registrationCertificate[0].name),
      ensureString(registrationCertificate[0].name),
      organizationId
    );
  }

  // Delete image technicalSafetyCertificate old
  if (technicalSafetyCertificate?.[0]?.name) {
    if (technicalSafetyCertificateImageId) {
      await deleteFile(jwt, technicalSafetyCertificateImageId);
    }
    technicalSafetyCertificate[0].id = await uploadFileStrapi(
      ensureString(technicalSafetyCertificate[0].name),
      ensureString(technicalSafetyCertificate[0].name),
      organizationId
    );
  }

  // Delete image liabilityInsuranceCertificate old
  if (liabilityInsuranceCertificate?.[0]?.name) {
    if (liabilityInsuranceCertificateImageId) {
      await deleteFile(jwt, liabilityInsuranceCertificateImageId);
    }
    liabilityInsuranceCertificate[0].id = await uploadFileStrapi(
      ensureString(liabilityInsuranceCertificate[0].name),
      ensureString(liabilityInsuranceCertificate[0].name),
      organizationId
    );
  }

  const result = await updateVehicle(jwt, {
    ...data,
    id: Number(id),
    idImages: idImages,
    registrationCertificate: registrationCertificate?.[0]?.name ? registrationCertificate : null,
    technicalSafetyCertificate: technicalSafetyCertificate?.[0]?.name ? technicalSafetyCertificate : null,
    liabilityInsuranceCertificate: liabilityInsuranceCertificate?.[0]?.name ? liabilityInsuranceCertificate : null,
    organizationId: organizationId,
    subcontractorId: subcontractorId ? subcontractorId : 0,
    updatedById,
  });

  if (result) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});

// Upload file Strapi
const uploadFileStrapi = async (localFileName: string, uploadFileName: string, orgId: number): Promise<number> => {
  const { id } = await uploadFile(vehicleOptions.localPath, localFileName, uploadFileName, vehicleOptions.folder, {
    orgId,
  });
  return id;
};
