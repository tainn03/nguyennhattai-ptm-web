"use client";

import useSWR from "swr";

import { organizationRolesFetcher } from "@/services/client/organizationRole";
import { OrganizationRoleInfo } from "@/types/strapi";

const useOrganizationRoles = (params: Partial<OrganizationRoleInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["organization-roles", params], organizationRolesFetcher);

  return {
    organizationRoles: data || [],
    isLoading,
    mutate,
    error,
  };
};

export default useOrganizationRoles;
