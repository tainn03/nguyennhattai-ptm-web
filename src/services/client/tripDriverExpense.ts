import { DriverExpenseInputForm } from "@/forms/tripDriverExpense";
import { ApiResult } from "@/types/api";
import { TripDriverExpenseInfo } from "@/types/strapi";
import { post } from "@/utils/api";

/**
 * Creates or updates trip driver expenses for a specific order trip.
 *
 * @param {Object} params - The parameters for the request.
 * @param {Partial<TripDriverExpenseInfo>[]} entities - An array of trip driver expense information.
 * @returns {Promise<number>} A promise that resolves with the ID of the created or updated trip driver expense.
 */
export const updateTripDriverExpenses = async (
  params: { organizationCode: string; orderCode: string; tripCode: string },
  tripDriverExpense: Partial<TripDriverExpenseInfo>[],
  entities: Pick<DriverExpenseInputForm, "subcontractorCost" | "bridgeToll" | "otherCost" | "notes">
) => {
  const { organizationCode, orderCode, tripCode } = params;
  // Make a POST request to create or update trip driver expenses
  const result = await post<ApiResult>(
    `/api/orgs/${organizationCode}/orders/${orderCode}/trips/${tripCode}/trip-driver-expenses/edit`,
    {
      ...entities,
      data: tripDriverExpense,
    }
  );
  return result;
};
