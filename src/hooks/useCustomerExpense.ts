"use client";

import useSWR from "swr";

import { customerExpenseFetcher } from "@/services/client/customerExpenses";
import { randomInt } from "@/utils/number";

const useCustomerExpense = () => {
  const { data, isLoading, error } = useSWR(`customer-expense/${randomInt(1, 100)}`, customerExpenseFetcher);

  return {
    customerExpense: data || {},
    isLoading,
    error,
  };
};

export default useCustomerExpense;
