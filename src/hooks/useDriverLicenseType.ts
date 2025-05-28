"use client";

import useSWR from "swr";

import { driverLicenseTypeFetcher } from "@/services/client/driverLicenseType";
import { DriverLicenseTypeInfo } from "@/types/strapi";

const useDriverLicenseType = (params: Partial<DriverLicenseTypeInfo>) => {
  const { data, error, isLoading } = useSWR([`driver-license-types/${params.id}`, params], driverLicenseTypeFetcher);

  return {
    driverLicenseType: data,
    isLoading,
    error,
  };
};

export default useDriverLicenseType;
