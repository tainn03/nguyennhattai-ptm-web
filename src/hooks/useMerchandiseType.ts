"use client";

import useSWR from "swr";

import { merchandiseTypeFetcher } from "@/services/client/merchandiseType";
import { MerchandiseTypeInfo } from "@/types/strapi";

const useMerchandiseType = (params: Partial<MerchandiseTypeInfo>) => {
  const { data, error, isLoading } = useSWR([`merchandise-types/${params.id}`, params], merchandiseTypeFetcher);

  return {
    merchandiseType: data,
    isLoading,
    error,
  };
};

export default useMerchandiseType;
