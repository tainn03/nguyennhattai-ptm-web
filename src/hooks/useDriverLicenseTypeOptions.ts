"use client";

import useSWR from "swr";

import { driverLicenseTypeOptionsFetcher } from "@/services/client/driverLicenseType";
import { DriverLicenseTypeInfo } from "@/types/strapi";

const useDriverLicenseTypeOptions = (params: Partial<DriverLicenseTypeInfo>) => {
  const { data, error, isLoading } = useSWR(["driver-license-types", params], driverLicenseTypeOptionsFetcher);

  return {
    driverLicenseTypes: data || [],
    isLoading,
    error,
  };
};

export default useDriverLicenseTypeOptions;
