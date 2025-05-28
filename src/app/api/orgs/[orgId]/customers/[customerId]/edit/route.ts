import { prisma } from "@/configs/prisma";
import { CustomerInputForm, CustomerUpdateInputForm } from "@/forms/customer";
import { updateBankAccount2, updateBankAccountByGraphQL } from "@/services/server/bankAccount";
import { checkCustomerExclusives2, updateCustomer2 } from "@/services/server/customer";
import { checkCustomerCodeExists, checkCustomerExclusives, updateCustomer } from "@/services/server/customers";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, data: CustomerInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { bankAccount, user: userData, lastUpdatedAt, ...objectEntity } = data;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomerExclusives(
      jwt,
      organizationId,
      Number(objectEntity.id),
      lastUpdatedAt
    );
    if (isErrorExclusives) {
      return { status: HttpStatusCode.BadRequest, message: ErrorType.EXCLUSIVE };
    }
  }

  // check code is exists
  const isCodeExists = await checkCustomerCodeExists(
    jwt,
    organizationId,
    ensureString(objectEntity.code),
    objectEntity.id
  );
  if (isCodeExists) {
    return { status: HttpStatusCode.BadRequest, message: `${ErrorType.EXISTED}-${objectEntity.code}` };
  }

  if (bankAccount) {
    // update bank account
    const resultUpdateBankAccount = await updateBankAccountByGraphQL(jwt, {
      ...bankAccount,
      updatedById: userId,
    });
    if (!resultUpdateBankAccount) {
      return { status: HttpStatusCode.BadRequest, message: ErrorType.UNKNOWN };
    }
  }

  const result = await updateCustomer(
    jwt,
    {
      ...objectEntity,
      createdById: userId,
      organizationId: organizationId,
    },
    userData ? userData.id : null
  );

  if (!result) {
    return { status: HttpStatusCode.BadRequest, message: ErrorType.UNKNOWN };
  }

  return { status: HttpStatusCode.Ok, data: result };
});

export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: CustomerUpdateInputForm) => {
  const { organizationId, userId } = getToken(req);
  const { customer, lastUpdatedAt } = requestData;

  const isErrorExclusives = await checkCustomerExclusives2(organizationId, Number(customer.id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  const result = await prisma.$transaction(async (prisma) => {
    if (customer.bankAccount) {
      await updateBankAccount2(prisma, {
        ...customer.bankAccount,
        updatedById: userId,
      });
    }

    const createdCustomerId = await updateCustomer2(prisma, {
      ...customer,
      organizationId,
      updatedById: userId,
    });
    return createdCustomerId;
  });

  if (result) {
    return { status: HttpStatusCode.Ok, data: { id: result } };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
