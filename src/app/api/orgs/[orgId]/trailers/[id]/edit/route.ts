import { trailerOptions } from "@/configs/media";
import { TrailerEditForm } from "@/forms/trailer";
import {
  checkIdNumberExists,
  checkTrailerExclusives,
  checkTrailerNumberExists,
  updateTrailer,
} from "@/services/server/trailer";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, data: TrailerEditForm) => {
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
    liabilityInsuranceCertificateId,
    registrationCertificateId,
    technicalSafetyCertificateId,
    deleteRegistrationCertificate,
    deleteTechnicalSafetyCertificate,
    deleteLiabilityInsuranceCertificate,
  } = data;

  // Check vehicles exclusives
  const isErrorExclusives = await checkTrailerExclusives(jwt, organizationId, Number(id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.BadRequest, message: ErrorType.EXCLUSIVE };
  }

  // Check vehicle Number exists
  const isVehicleNumberExists = await checkTrailerNumberExists(jwt, data.trailerNumber, organizationId, Number(id));
  if (isVehicleNumberExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.trailerNumber}` };
  }

  // Check Id number exists
  if (data.idNumber) {
    const isIdNumberExists = await checkIdNumberExists(jwt, data.idNumber, organizationId, Number(id));
    if (isIdNumberExists) {
      return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${data.idNumber}` };
    }
  }

  // delete multiple image old
  if (deleteImage) {
    for (const item of deleteImage) {
      await deleteFile(jwt, item);
    }
  }

  // Delete file registrationCertificate when exist registrationCertificateId
  if (deleteRegistrationCertificate && registrationCertificateId) {
    await deleteFile(jwt, registrationCertificateId);
  }

  // Delete file technicalSafetyCertificate when exist technicalSafetyCertificateId
  if (deleteTechnicalSafetyCertificate && technicalSafetyCertificateId) {
    await deleteFile(jwt, technicalSafetyCertificateId);
  }

  // Delete file liabilityInsuranceCertificate when exist liabilityInsuranceCertificateId
  if (deleteLiabilityInsuranceCertificate && liabilityInsuranceCertificateId) {
    await deleteFile(jwt, liabilityInsuranceCertificateId);
  }

  // Upload multiple file images
  const idImages: Array<number> = [];
  if (images && images.length > 0) {
    for (const item of images) {
      if (!item.id) {
        const id = await uploadFileStrapi(
          ensureString(item.name),
          `${updatedById}_${ensureString(item.name)}`,
          organizationId
        );
        idImages.push(id);
      } else {
        idImages.push(item.id);
      }
    }
  }

  // Delete image registrationCertificate old
  if (registrationCertificate?.[0]?.name) {
    if (registrationCertificateId) {
      await deleteFile(jwt, registrationCertificateId);
    }
    registrationCertificate[0].id = await uploadFileStrapi(
      ensureString(registrationCertificate[0].name),
      `${updatedById}_${ensureString(registrationCertificate[0].name)}`,
      organizationId
    );
  }

  // Delete image technicalSafetyCertificate old
  if (technicalSafetyCertificate?.[0]?.name) {
    if (technicalSafetyCertificateId) {
      await deleteFile(jwt, technicalSafetyCertificateId);
    }
    technicalSafetyCertificate[0].id = await uploadFileStrapi(
      ensureString(technicalSafetyCertificate[0].name),
      `${updatedById}_${ensureString(technicalSafetyCertificate[0].name)}`,
      organizationId
    );
  }

  // Delete image liabilityInsuranceCertificate old
  if (liabilityInsuranceCertificate?.[0]?.name) {
    if (liabilityInsuranceCertificateId) {
      await deleteFile(jwt, liabilityInsuranceCertificateId);
    }
    liabilityInsuranceCertificate[0].id = await uploadFileStrapi(
      ensureString(liabilityInsuranceCertificate[0].name),
      `${updatedById}_${ensureString(liabilityInsuranceCertificate[0].name)}`,
      organizationId
    );
  }

  const result = await updateTrailer(jwt, {
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

  return {
    status: HttpStatusCode.Ok,
    data: result,
  };
});

// Upload file Strapi
const uploadFileStrapi = async (localFileName: string, uploadFileName: string, orgId: number): Promise<number> => {
  const { id } = await uploadFile(trailerOptions.localPath, localFileName, uploadFileName, trailerOptions.folder, {
    orgId,
  });
  return id;
};
