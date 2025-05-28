import { createOrderTripExpense, updateOrderTripExpense, uploadDocumentImages } from "@/actions/orderTripExpense";
import { OrderTripExpenseInputFormForDriverApp } from "@/forms/orderTripExpense";
import { ActionResult, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { OrderTripExpenseInfo } from "@/types/strapi";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles a POST request to upsert order trip expenses.
 *
 * @param req - The incoming API request containing headers and authentication info.
 * @param requestData - The request body containing order trip expense input data.
 *
 * @returns An object containing the HTTP status code and the result of the upsert operation.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, requestData: OrderTripExpenseInputFormForDriverApp) => {
    getToken(req);

    let result: ActionResult<OrderTripExpenseInfo> | undefined;
    const { previousDocuments, currentDocuments, ...orderTripExpenseData } = requestData;
    if (orderTripExpenseData.id) {
      result = await updateOrderTripExpense(orderTripExpenseData);
    } else if (orderTripExpenseData.amount !== 0) {
      result = await createOrderTripExpense(orderTripExpenseData);
    }

    if (result?.data?.id) {
      await uploadDocumentImages({
        previousDocuments: previousDocuments || [],
        currentDocuments: currentDocuments || [],
        orderTripExpenseId: result?.data?.id,
      });
    }

    return { status: HttpStatusCode.Ok, data: result?.data };
  }
);
