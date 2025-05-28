"use client";

import useSWR from "swr";

import { expenseTypesFetcher } from "@/actions/expenseType";
import { FilterRequest } from "@/types/filter";
import { ExpenseTypeInfo } from "@/types/strapi";

const useExpenseTypes = (params: FilterRequest<ExpenseTypeInfo>) => {
  const { data, isLoading, error, mutate } = useSWR(["expense-types", params], expenseTypesFetcher);

  return {
    expenseTypes: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useExpenseTypes;
