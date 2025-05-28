import { subcontractorDocumentOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { SubcontractorInputForm } from "@/forms/subcontractor";
import { createBankAccount } from "@/services/server/bankAccount";
import {
  getOrganizationMembersByOrganizationIdAndUserId,
  updateIsLinkOrganizationMember,
} from "@/services/server/organizationMember";
import { checkCodeSubcontractorExists, createSubcontractor } from "@/services/server/subcontractor";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the creation of a subcontractor, including associated document and bank account creation.
 * Returns an OK response with the created subcontractor data if the creation is successful.
 * Otherwise, returns a bad request or internal server error response with an error message.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {SubcontractorInputForm} data - The data for creating a subcontractor.
 * @returns {object} An object containing the HTTP status and result data, including the created subcontractor.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: SubcontractorInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { document, bankAccount, userId, ...objectEntity } = data;

  // Check if a subcontractor with the same code already exists.
  const isCodeExists = await checkCodeSubcontractorExists(jwt, organizationId, ensureString(objectEntity.code));
  if (isCodeExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${objectEntity.code}` };
  }

  // Check if a subcontractor with the same code already exists.
  let uploadFileId: number | null;
  const fileName = ensureString(document);

  // Check if a new document is provided.
  if (fileName) {
    const { id } = await uploadFile(
      subcontractorDocumentOptions.localPath,
      fileName,
      fileName,
      subcontractorDocumentOptions.folder,
      {
        orgId: organizationId,
      }
    );

    // Assign the obtained document ID to the variable.
    uploadFileId = id;
  }

  // Initiate a Prisma transaction to create the subcontractor, bank account, and update organization members.
  const result = await prisma.$transaction(async (_) => {
    // Create the bank account details.
    const createBankAccountResult = await createBankAccount(jwt, { ...bankAccount, createdById });

    // Check if creating the bank account was successful.
    if (!createBankAccountResult) {
      throw new ApiError(HttpStatusCode.BadRequest, ErrorType.UNKNOWN);
    }

    // Create the subcontractor details.
    const createdSubcontractorResult = await createSubcontractor(jwt, {
      ...objectEntity,
      createdById,
      organizationId: organizationId,
      userId: userId ?? null,
      documentsId: uploadFileId,
      bankAccountId: Number(createBankAccountResult.id),
    });

    // Update organization members based on the provided user ID.
    if (userId) {
      const organizationMember = await getOrganizationMembersByOrganizationIdAndUserId(jwt, organizationId, userId);
      await updateIsLinkOrganizationMember(jwt, organizationMember.id, true, createdById);
    }

    return createdSubcontractorResult;
  });

  // Check if the creation was successful and return the appropriate response.
  if (result?.id) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
