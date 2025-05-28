"use client";

import useSWR from "swr";

import { expenseTypeOptionsFetcher } from "@/services/client/expenseType";
import { ExpenseTypeInfo } from "@/types/strapi";

const useExpenseTypeOptions = (params: Partial<ExpenseTypeInfo>) => {
  const { data, isLoading, error, mutate } = useSWR(["expense-type-options", params], expenseTypeOptionsFetcher);

  return {
    expenseTypes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useExpenseTypeOptions;
