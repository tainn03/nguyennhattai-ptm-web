import { UpdateDisplayOrderDriverExpenseForm } from "@/forms/driverExpense";
import { updateDisplayOrderDriverExpense } from "@/services/server/driverExpense";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles an HTTP PUT request to update driver expenses and related data.
 *
 * @param req - The API request object.
 * @param requestData - The data received in the request body.
 * @returns An object with the HTTP status code indicating the result of the update.
 */
export const PUT = withExceptionHandler(
  async (req: ApiNextRequest, requestData: Partial<UpdateDisplayOrderDriverExpenseForm>) => {
    const { organizationId, userId } = getToken(req);
    const { driverExpenses } = requestData;

    const updatedDataResult = await updateDisplayOrderDriverExpense({
      driverExpenses: [...(driverExpenses || [])],
      organizationId,
      updatedById: userId,
    });

    if (!updatedDataResult) {
      throw new ApiError(HttpStatusCode.InternalServerError);
    }

    return { status: HttpStatusCode.Ok, data: updatedDataResult };
  }
);
