import { HttpStatusCode } from "axios";

import { driverContractOptions, driverLicenseOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { DriverUpdateInputForm } from "@/forms/driver";
import { updateAddressInformationByGraphQL } from "@/services/server/addressInformation";
import { updateBankAccountByGraphQL } from "@/services/server/bankAccount";
import { checkDriverExclusives, checkDriverIdNumberExists, updateDriver } from "@/services/server/driver";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the update of an existing driver record based on the provided data.
 * If the request doesn't include a valid token, it returns an unauthorized response.
 *
 * @param req - The incoming API request.
 * @param requestData - The data for updating an existing driver, including address, bank account, and other details.
 * @returns An HTTP response indicating success or failure.
 */
export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: DriverUpdateInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);

  const {
    id,
    bankAccount,
    address,
    licenseFrontImageId,
    licenseFrontImage,
    isDeleteLicenseFrontImage,
    licenseBackImageId,
    licenseBackImage,
    isDeleteLicenseBackImage,
    contractDocumentIds,
    contractDocuments,
    isDeleteContractDocuments,
    user,
    idNumber,
    lastUpdatedAt,
    ...driverProps
  } = requestData;

  if (idNumber) {
    const isIdNumberExists = await checkDriverIdNumberExists(jwt, organizationId, idNumber, id);
    if (isIdNumberExists) {
      return {
        status: HttpStatusCode.BadRequest,
        code: ErrorType.EXISTED,
        message: "Id number already exists",
      };
    }
  }

  if (lastUpdatedAt) {
    // Check if there is a lastUpdatedAt timestamp and validate against potential concurrent updates.
    const isErrorExclusives = await checkDriverExclusives(jwt, organizationId, Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { status: HttpStatusCode.Conflict, code: ErrorType.EXCLUSIVE };
    }
  }

  let updatedLicenseFrontImageId: number | null;
  let updatedLicenseBackImageId: number | null;
  let updatedContractDocumentIds: number | null;

  // Delete the old file if it exists.
  if (isDeleteLicenseFrontImage && licenseFrontImageId) {
    await deleteFile(jwt, licenseFrontImageId);
    updatedLicenseFrontImageId = null;
  }
  if (isDeleteLicenseBackImage && licenseBackImageId) {
    await deleteFile(jwt, licenseBackImageId);
    updatedLicenseBackImageId = null;
  }
  if (isDeleteContractDocuments && contractDocumentIds) {
    await deleteFile(jwt, contractDocumentIds);
    updatedContractDocumentIds = null;
  }

  if (licenseFrontImage?.name) {
    const result = await uploadFile(
      driverLicenseOptions.localPath,
      licenseFrontImage.name,
      licenseFrontImage.name,
      driverLicenseOptions.folder,
      { orgId: organizationId }
    );
    updatedLicenseFrontImageId = result?.id;
  }

  if (licenseBackImage?.name) {
    const result = await uploadFile(
      driverLicenseOptions.localPath,
      licenseBackImage.name,
      licenseBackImage.name,
      driverLicenseOptions.folder,
      { orgId: organizationId }
    );
    updatedLicenseBackImageId = result?.id;
  }

  if (contractDocuments?.name) {
    const result = await uploadFile(
      driverContractOptions.localPath,
      contractDocuments.name,
      contractDocuments.name,
      driverContractOptions.folder,
      { orgId: organizationId }
    );
    updatedContractDocumentIds = result?.id;
  }

  const result = await prisma.$transaction(async (_) => {
    // Update the driver's address information based on country, city, district, ward, and address line.
    await updateAddressInformationByGraphQL(jwt, { ...address, updatedById: userId });

    // Update the driver's bank account information.
    await updateBankAccountByGraphQL(jwt, {
      ...bankAccount,
      updatedById: userId,
    });

    // Update the driver record with associated details.
    const updatedDriverResult = await updateDriver(jwt, {
      ...driverProps,
      id: Number(id),
      ...(updatedLicenseFrontImageId !== undefined && { licenseFrontImageId: updatedLicenseFrontImageId }),
      ...(updatedLicenseBackImageId !== undefined && { licenseBackImageId: updatedLicenseBackImageId }),
      ...(updatedContractDocumentIds !== undefined && { contractDocumentIds: updatedContractDocumentIds }),
      idNumber,
      userId: user?.id,
      updatedById: userId,
    });
    return updatedDriverResult;
  });

  if (result?.id) {
    return { status: HttpStatusCode.Ok, data: result.id };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
