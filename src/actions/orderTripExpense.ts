"use server";

import { gql } from "graphql-request";

import { deleteFile, uploadFile } from "@/actions/uploadFile";
import { orderTripExpenseDocumentOptions } from "@/configs/media";
import {
  OrderTripExpenseFileInputForm,
  OrderTripExpenseInput,
  OrderTripExpenseInputForm,
} from "@/forms/orderTripExpense";
import { ActionResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { OrderTripExpenseInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { withActionExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Creates a new order trip expense with the provided input data and user token.
 *
 * @param {string} token - Auth token containing user and organization info.
 * @param {OrderTripExpenseInput} params - Input data for the new expense.
 * @returns {Promise<{ status: number, data: OrderTripExpenseInfo }>} - The created expense info.
 */
export const createOrderTripExpense = withActionExceptionHandler<OrderTripExpenseInput, OrderTripExpenseInfo>(
  async (token, params) => {
    const query = gql`
      mutation (
        $organizationId: Int
        $amount: Float
        $notes: String
        $expenseTypeId: ID
        $orderTripId: ID
        $createdByUser: ID
        $publishedAt: DateTime
      ) {
        createOrderTripExpense(
          data: {
            organizationId: $organizationId
            amount: $amount
            notes: $notes
            expenseType: $expenseTypeId
            trip: $orderTripId
            createdByUser: $createdByUser
            updatedByUser: $createdByUser
            publishedAt: $publishedAt
          }
        ) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<OrderTripExpenseInfo>(token.jwt, query, {
      organizationId: Number(token.user.orgId),
      ...(params.amount && { amount: params.amount }),
      ...(params.notes && { notes: params.notes }),
      expenseTypeId: params.expenseTypeId,
      orderTripId: params.orderTripId,
      createdByUser: Number(token.user.id),
      publishedAt: new Date().toISOString(),
    });

    return { status: HttpStatusCode.Ok, data: data.createOrderTripExpense };
  }
);

/**
 * Updates an existing order trip expense with the given ID and new amount.
 *
 * @param {string} token - Auth token containing user info.
 * @param {OrderTripExpenseInput} params - Input data including the expense ID and new amount.
 * @returns {Promise<{ status: number, data: OrderTripExpenseInfo }>} - The updated expense info.
 */
export const updateOrderTripExpense = withActionExceptionHandler<OrderTripExpenseInput, OrderTripExpenseInfo>(
  async (token, params) => {
    const query = gql`
      mutation ($id: ID!, $amount: Float, $notes: String, $updatedByUser: ID) {
        updateOrderTripExpense(id: $id, data: { amount: $amount, notes: $notes, updatedByUser: $updatedByUser }) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<OrderTripExpenseInfo>(token.jwt, query, {
      id: Number(params.id),
      ...(params.amount && { amount: params.amount }),
      ...(params.notes && { notes: params.notes }),
      updatedByUser: Number(token.user.id),
    });

    return { status: HttpStatusCode.Ok, data: data.updateOrderTripExpense };
  }
);

/**
 * Creates or updates order trip expenses based on the presence of an ID.
 * - If `id` exists, it updates the expense.
 * - If `id` is missing and amount is not zero, it creates a new expense.
 *
 * @param {OrderTripExpenseInputForm} entity - Form data containing a list of expenses.
 * @returns {Promise<{ status: number, data: any[] }>} - The result of all create/update operations.
 */
export const upsertOrderTripExpense = withActionExceptionHandler<OrderTripExpenseInputForm, ActionResult[]>(
  async (_token, params) => {
    const { orderTripExpenses } = params;

    const results: ActionResult[] = [];

    for (const orderTripExpense of orderTripExpenses) {
      if (orderTripExpense.id) {
        const result = await updateOrderTripExpense(orderTripExpense);
        results.push(result);
      } else if (orderTripExpense.amount !== 0) {
        const result = await createOrderTripExpense(orderTripExpense);
        results.push(result);
      }
    }

    return {
      status: HttpStatusCode.Ok,
      data: results,
    };
  }
);

/**
 * Handles uploading and syncing document files for an OrderTripExpense.
 * - Uploads new files and collects their metadata.
 * - Compares current and previous documents to delete removed files.
 * - Updates the OrderTripExpense with the final list of document IDs via GraphQL mutation.
 *
 * @param token Auth token with organization and user context.
 * @param params Includes current documents, previous documents, and expense ID.
 * @returns The updated OrderTripExpense data.
 */
export const uploadDocumentImages = withActionExceptionHandler<OrderTripExpenseFileInputForm, OrderTripExpenseInfo>(
  async (token, params) => {
    const { previousDocuments, currentDocuments, orderTripExpenseId } = params;
    const organizationId = token.user.orgId;
    const updatedDocuments: UploadInputValue[] = [];

    if (currentDocuments && currentDocuments.length > 0) {
      for (const document of currentDocuments) {
        if (!document.id) {
          const result = await uploadFile(
            orderTripExpenseDocumentOptions.localPath,
            document.name,
            `${organizationId}_${ensureString(document.name)}`,
            orderTripExpenseDocumentOptions.folder,
            {
              orgId: organizationId,
            }
          );
          updatedDocuments.push({ id: result.id, name: document.name, url: result.url });
        } else {
          updatedDocuments.push(document);
        }
      }
    }

    if (previousDocuments && previousDocuments.length > 0) {
      const deletedFiles = previousDocuments.filter((prev) => !updatedDocuments.some((curr) => curr.id === prev.id));

      for (const file of deletedFiles) {
        if (file.id) {
          await deleteFile(token.jwt, file.id);
        }
      }
    }

    const updatedDocumentIds = updatedDocuments.map((doc) => Number(doc.id));

    const query = gql`
      mutation ($id: ID!, $updatedDocumentIds: [ID!]) {
        updateOrderTripExpense(id: $id, data: { documents: $updatedDocumentIds }) {
          data {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<OrderTripExpenseInfo>(token.jwt, query, {
      id: orderTripExpenseId,
      updatedDocumentIds,
      updatedByUser: Number(token.user.id),
    });

    return { status: HttpStatusCode.Ok, data: data.updateOrderTripExpense };
  }
);
