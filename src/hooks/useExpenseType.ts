"use client";

import useSWR from "swr";

import { expenseTypeFetcher } from "@/actions/expenseType";
import { ExpenseTypeInfo } from "@/types/strapi";

const useExpenseType = (params: Partial<ExpenseTypeInfo>) => {
  const { data, isLoading, error } = useSWR([`expense-type/${params.id}`, params], expenseTypeFetcher);

  return {
    expenseType: data?.data?.data || ({} as ExpenseTypeInfo),
    isLoading,
    error,
  };
};

export default useExpenseType;
