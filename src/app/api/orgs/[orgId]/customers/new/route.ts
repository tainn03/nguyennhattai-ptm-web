import { CustomerType } from "@prisma/client";

import { prisma } from "@/configs/prisma";
import { CustomerInputForm } from "@/forms/customer";
import { createBankAccount2 } from "@/services/server/bankAccount";
import { checkCustomerCodeExists, createCustomer } from "@/services/server/customers";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the creation of a new customer based on the incoming data.
 * Returns the result with the appropriate HTTP status and data.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {CustomerInputForm} data - The data for creating a new customer.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: CustomerInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { bankAccount, user: userData, ...objectEntity } = data;

  // Check if the customer code already exists.
  const isCodeExists = await checkCustomerCodeExists(jwt, organizationId, ensureString(objectEntity.code));
  if (isCodeExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${objectEntity.code}` };
  }

  // Perform a transaction to create a new bank account and customer.
  const result = await prisma.$transaction(async (prisma) => {
    // Create a new bank account and retrieve the result.

    const createdBankAccountResult = await createBankAccount2(prisma, { ...bankAccount, createdById: userId });
    // Create a new customer with the associated data.
    const createdCustomerResult = await createCustomer(prisma, {
      ...(objectEntity as CustomerInputForm),
      type: CustomerType.FIXED,
      userId: userData ? userData.id : null,
      createdById: userId,
      bankAccountId: createdBankAccountResult,
      organizationId,
      isActive: true,
    });

    return createdCustomerResult;
  });

  // Check if the transaction was successful and return the appropriate response.
  if (result) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
