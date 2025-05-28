import { HttpStatusCode } from "axios";

import { driverContractOptions, driverLicenseOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { DriverInputForm } from "@/forms/driver";
import { createAddressInformationByGraphQL } from "@/services/server/addressInformation";
import { createBankAccount } from "@/services/server/bankAccount";
import { checkDriverIdNumberExists, createDriver } from "@/services/server/driver";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the creation of a new driver record based on the provided data.
 * If the request doesn't include a valid token, it returns an unauthorized response.
 *
 * @param req - The incoming API request.
 * @param requestData - The data for creating a new driver, including address, bank account, and other details.
 * @returns An HTTP response indicating success or failure.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: DriverInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const {
    bankAccount,
    address,
    licenseFrontImage,
    licenseBackImage,
    contractDocuments,
    user,
    idNumber,
    ...driverProps
  } = requestData;

  if (idNumber) {
    const isIdNumberExists = await checkDriverIdNumberExists(jwt, organizationId, idNumber);
    if (isIdNumberExists) {
      return {
        status: HttpStatusCode.BadRequest,
        code: ErrorType.EXISTED,
        message: "Id number already exists",
      };
    }
  }

  let createdLicenseFrontImageId: number;
  let createdLicenseBackImageId: number;
  let createdContractDocumentIds: number;

  if (licenseFrontImage?.name) {
    const result = await uploadFile(
      driverLicenseOptions.localPath,
      licenseFrontImage.name,
      licenseFrontImage.name,
      driverLicenseOptions.folder,
      { orgId: organizationId }
    );
    createdLicenseFrontImageId = Number(result?.id);
  }

  if (licenseBackImage?.name) {
    const result = await uploadFile(
      driverLicenseOptions.localPath,
      licenseBackImage.name,
      licenseBackImage.name,
      driverLicenseOptions.folder,
      { orgId: organizationId }
    );
    createdLicenseBackImageId = Number(result?.id);
  }

  if (contractDocuments?.name) {
    const result = await uploadFile(
      driverContractOptions.localPath,
      contractDocuments.name,
      contractDocuments.name,
      driverContractOptions.folder,
      { orgId: Number(organizationId) }
    );
    createdContractDocumentIds = Number(result?.id);
  }

  const result = await prisma.$transaction(async (_) => {
    // Create the driver's address information based on country, city, district, ward, and address line.
    const createdAddressInformationResult = await createAddressInformationByGraphQL(jwt, {
      ...address,
      createdById: userId,
    });

    // Create the driver's bank account information.
    const createdBankAccountResult = await createBankAccount(jwt, {
      ...bankAccount,
      createdById: userId,
    });

    // Create the driver record with associated details.
    const createdDriverResult = await createDriver(jwt, {
      ...driverProps,
      idNumber,
      organizationId: organizationId,
      licenseFrontImageId: createdLicenseFrontImageId ? createdLicenseFrontImageId : null,
      licenseBackImageId: createdLicenseBackImageId ? createdLicenseBackImageId : null,
      contractDocumentIds: createdContractDocumentIds ? createdContractDocumentIds : null,
      addressInformationId: Number(createdAddressInformationResult?.id),
      bankAccountId: Number(createdBankAccountResult?.id),
      createdById: userId,
      userId: user?.id,
    });
    return createdDriverResult;
  });

  if (result?.id) {
    return { status: HttpStatusCode.Ok, data: result.id };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
