"use client";

import useSWR from "swr";

import { fetchOrganizationRoleOptions } from "@/services/client/organizationRole";
import { OrganizationRoleInfo } from "@/types/strapi";

const useOrganizationRoleOptions = (params: Partial<OrganizationRoleInfo>) => {
  const { data, error, isLoading } = useSWR(["organization-roles", params], fetchOrganizationRoleOptions);

  return {
    organizationRoles: data || [],
    isLoading,
    error,
  };
};

export default useOrganizationRoleOptions;
