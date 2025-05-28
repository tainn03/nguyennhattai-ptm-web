import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { BankAccountInputForm } from "@/forms/bankAccount";
import { BankAccountInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Create a bank account by sending a GraphQL mutation with the provided data.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - Partial bank account entity data.
 * @returns {Promise<BankAccountInfo>} A promise that resolves to the created bank account or undefined.
 */
export const createBankAccount = async (jwt: string, entity: Partial<BankAccountInfo>): Promise<BankAccountInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $accountNumber: String
      $holderName: String
      $bankName: String
      $bankBranch: String
      $publishedAt: DateTime
      $createdByUser: ID
    ) {
      createBankAccount(
        data: {
          accountNumber: $accountNumber
          holderName: $holderName
          bankName: $bankName
          bankBranch: $bankBranch
          publishedAt: $publishedAt
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<BankAccountInfo>(jwt, query, {
    ...(processedEntity.accountNumber && { accountNumber: processedEntity.accountNumber }),
    ...(processedEntity.holderName && { holderName: processedEntity.holderName }),
    ...(processedEntity.bankName && { bankName: processedEntity.bankName }),
    ...(processedEntity.bankBranch && { bankBranch: processedEntity.bankBranch }),
    createdByUser: processedEntity.createdById,
    publishedAt: new Date().toISOString(),
  });

  return data.createBankAccount;
};

/**
 * Create a new bank account with the provided data and link it to a user.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {Object} entity - The data of the bank account to be created, excluding the 'id' property.
 * @returns {Promise<number>} A promise that resolves to the ID of the newly created bank account.
 */
export const createBankAccount2 = async (
  prisma: PrismaClientTransaction,
  entity: Partial<BankAccountInputForm>
): Promise<number> => {
  const { id: _, createdById, ...otherEntities } = trim(entity);
  const userId = Number(createdById);

  const result = await prisma.bankAccount.create({ data: { ...otherEntities, publishedAt: new Date() } });
  const bankAccountId = result.id;
  await prisma.bankAccountsCreatedByUserLinks.create({ data: { bankAccountId, userId } });
  await prisma.bankAccountsUpdatedByUserLinks.create({ data: { bankAccountId, userId } });

  return bankAccountId;
};

/**
 * Update a bank account by sending a GraphQL mutation with the provided data.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - Partial bank account entity data to be updated.
 * @returns {Promise<BankAccountInfo>} A promise that resolves to the updated bank account or undefined.
 */
export const updateBankAccount2 = async (
  prisma: PrismaClientTransaction,
  entity: Partial<BankAccountInputForm>
): Promise<number> => {
  const { id, updatedById, ...otherEntities } = trim(entity);
  const userId = Number(updatedById);

  const result = await prisma.bankAccount.update({
    where: { id },
    data: { ...otherEntities },
  });
  const bankAccountId = result.id;
  await prisma.bankAccountsUpdatedByUserLinks.updateMany({ where: { bankAccountId }, data: { userId } });

  return bankAccountId;
};

/**
 * Update a bank account by sending a GraphQL mutation with the provided data.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - Partial bank account entity data to be updated.
 * @returns {Promise<BankAccountInfo>} A promise that resolves to the updated bank account or undefined.
 */
export const updateBankAccountByGraphQL = async (
  jwt: string,
  entity: Partial<BankAccountInfo>
): Promise<BankAccountInfo> => {
  const { id, accountNumber, holderName, bankName, bankBranch, updatedById } = trim(entity);
  const query = gql`
    mutation (
      $id: ID!
      $accountNumber: String
      $holderName: String
      $bankName: String
      $bankBranch: String
      $updatedByUser: ID
    ) {
      updateBankAccount(
        id: $id
        data: {
          accountNumber: $accountNumber
          holderName: $holderName
          bankName: $bankName
          bankBranch: $bankBranch
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<BankAccountInfo>(jwt, query, {
    id,
    accountNumber: accountNumber ?? null,
    holderName: holderName ?? null,
    bankName: bankName ?? null,
    bankBranch: bankBranch ?? null,
    updatedByUser: updatedById,
  });

  return data.updateBankAccount;
};
