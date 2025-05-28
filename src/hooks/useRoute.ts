"use client";

import useSWR from "swr";

import { routeFetcher } from "@/services/client/route";
import { RouteInfo } from "@/types/strapi";

const useRoute = (params: Partial<RouteInfo>) => {
  const { data, error, isLoading } = useSWR([`routes/${params.id}`, params], routeFetcher);

  return {
    route: data,
    isLoading,
    error,
  };
};

export default useRoute;
