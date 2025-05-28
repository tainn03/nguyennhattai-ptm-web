"use client";

import useSWR from "swr";

import { zoneFetcher } from "@/actions/zone";
import { ZoneInfo } from "@/types/strapi";

const useZone = (params: Pick<ZoneInfo, "id" | "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR([`zone/${params.id}`, params], zoneFetcher);

  return {
    zone: data?.data,
    isLoading,
    error,
    mutate,
  };
};

export default useZone;
