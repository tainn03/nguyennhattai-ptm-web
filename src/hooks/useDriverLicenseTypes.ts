"use client";

import useSWR from "swr";

import { driverLicenseTypesFetcher } from "@/services/client/driverLicenseType";
import { FilterRequest } from "@/types/filter";
import { DriverLicenseTypeInfo } from "@/types/strapi";

const useDriverLicenseTypes = (params: FilterRequest<DriverLicenseTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["driver-license-types", params], driverLicenseTypesFetcher);

  return {
    driverLicenseTypes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useDriverLicenseTypes;
