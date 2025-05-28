"use client";

import useSWR from "swr";

import { organizationsByOwnerFetcher } from "@/services/client/organization";
import { OrganizationInfo } from "@/types/strapi";

const useOrganizationsByOwner = (key: Pick<OrganizationInfo, "createdById">) => {
  const { data, error, isLoading } = useSWR(["organizations", key], organizationsByOwnerFetcher);

  return {
    organizations: data || [],
    isLoading,
    error,
  };
};

export default useOrganizationsByOwner;
