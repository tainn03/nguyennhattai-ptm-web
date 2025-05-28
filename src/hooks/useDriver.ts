"use client";

import useSWR from "swr";

import { driverFetcher } from "@/services/client/driver";
import { DriverInfo } from "@/types/strapi";

const useDriver = (params: Partial<DriverInfo>) => {
  const { data, error, isLoading } = useSWR([`drivers/${params.id}`, params], driverFetcher);
  const { address, bankAccount, ...driver } = data || ({} as DriverInfo);

  return {
    driver,
    addressInfo: address,
    bankAccount: bankAccount,
    isLoading,
    error,
  };
};

export default useDriver;
