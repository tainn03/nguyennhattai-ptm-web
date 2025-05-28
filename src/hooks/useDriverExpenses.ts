"use client";

import useSWR from "swr";

import { driverExpensesFetcher } from "@/services/client/driverExpense";
import { FilterRequest } from "@/types/filter";
import { DriverExpenseInfo } from "@/types/strapi";

const useDriverExpenses = (params: FilterRequest<DriverExpenseInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["driver-expenses", params], driverExpensesFetcher);

  return {
    driverExpenses: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverExpenses;
