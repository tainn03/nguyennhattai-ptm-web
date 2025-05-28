"use client";

import { AdministrativeUnit, AdministrativeUnitType } from "@prisma/client";
import useSWR from "swr";

import { administrativeUnitsFetcher } from "@/services/client/administrativeUnit";

const useAdministrativeUnits = (params: Pick<AdministrativeUnit, "parentCode" | "type">) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.type === AdministrativeUnitType.COUNTRY || params.parentCode !== null
      ? ["administrative-units", params]
      : null,
    administrativeUnitsFetcher
  );

  return {
    administrativeUnits: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useAdministrativeUnits;
