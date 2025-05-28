import { subcontractorDocumentOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { SubcontractorUpdateForm } from "@/forms/subcontractor";
import { updateBankAccountByGraphQL } from "@/services/server/bankAccount";
import {
  getOrganizationMembersByOrganizationIdAndUserId,
  updateIsLinkOrganizationMember,
} from "@/services/server/organizationMember";
import {
  checkCodeSubcontractorExists,
  checkSubcontractorExclusives,
  updateSubcontractor,
} from "@/services/server/subcontractor";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString, trim } from "@/utils/string";

/**
 * Handles the update of subcontractor information, including associated documents and bank account details.
 * Returns an OK response with the updated subcontractor data if the update is successful.
 * Otherwise, returns an internal server error or a bad request response with an error message.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {SubcontractorUpdateForm} data - The data for updating subcontractor information.
 * @returns {object} An object containing the HTTP status and result data, including the updated subcontractor.
 */
export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, data: SubcontractorUpdateForm) => {
  const { jwt, organizationId, userId: updatedById } = getToken(req);

  // Destructure relevant properties from the request data.
  const {
    deleteDocument,
    document,
    oldDocumentId,
    bankAccount,
    oldMemberUserId,
    userId,
    lastUpdatedAt,
    ...objectEntity
  } = trim(data);

  // Check for exclusivity of the subcontractor to prevent concurrent updates.
  const isErrorExclusives = await checkSubcontractorExclusives(jwt, organizationId, objectEntity.id, lastUpdatedAt);
  if (isErrorExclusives) {
    throw new ApiError(HttpStatusCode.BadRequest, ErrorType.EXCLUSIVE);
  }

  // Check if the subcontractor code already exists.
  const isCodeExists = await checkCodeSubcontractorExists(
    jwt,
    organizationId,
    objectEntity.code as string,
    objectEntity.id
  );
  if (isCodeExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${objectEntity.code}` };
  }

  // Initialize variable to store the document ID.
  let documentId: number | null;
  const fileName = ensureString(document);

  // Check if a new document is provided.
  if (fileName) {
    const documentFileName = `${updatedById}_${fileName}`;
    const { id } = await uploadFile(
      subcontractorDocumentOptions.localPath,
      fileName,
      documentFileName,
      subcontractorDocumentOptions.folder,
      {
        orgId: organizationId,
      }
    );

    documentId = id;
  }

  // Initiate a Prisma transaction to update the subcontractor, bank account, and organization members.
  const result = await prisma.$transaction(async (_) => {
    // Update the bank account details.
    await updateBankAccountByGraphQL(jwt, bankAccount);

    // Update the subcontractor details.
    const updateSubcontractorResult = await updateSubcontractor(jwt, {
      ...objectEntity,
      deleteDocument,
      organizationId: organizationId,
      updatedById,
      userId,
      documentsId: documentId,
      oldDocumentId,
    });

    // Update the organization members based on the provided and old user IDs.
    if (oldMemberUserId) {
      const organizationMemberOld = await getOrganizationMembersByOrganizationIdAndUserId(
        jwt,
        organizationId,
        oldMemberUserId
      );
      await updateIsLinkOrganizationMember(jwt, organizationMemberOld.id, false, updatedById);
    }
    if (userId) {
      const organizationMemberNew = await getOrganizationMembersByOrganizationIdAndUserId(jwt, organizationId, userId);
      await updateIsLinkOrganizationMember(jwt, organizationMemberNew.id, true, updatedById);
    }
    return updateSubcontractorResult;
  });

  // Check if the update was successful and return the appropriate response.
  if (result?.id) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
