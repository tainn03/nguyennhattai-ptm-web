"use client";

import useSWR from "swr";

import { driverExpenseFetcher } from "@/services/client/driverExpense";
import { DriverExpenseInfo } from "@/types/strapi";

const useDriverExpense = (params: Partial<DriverExpenseInfo>) => {
  const { data, error, isLoading } = useSWR([`driver-expense/${params.id}`, params], driverExpenseFetcher);

  return {
    driverExpense: data,
    isLoading,
    error,
  };
};

export default useDriverExpense;
