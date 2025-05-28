"use client";

import useSWR from "swr";

import { customerExpensesFetcher } from "@/services/client/customerExpenses";

const useCustomerExpenses = () => {
  const { data, isLoading, error } = useSWR("customer-expenses", customerExpensesFetcher);

  return {
    customerExpenses: data || [],
    isLoading,
    error,
  };
};

export default useCustomerExpenses;
