"use client";

import { OrganizationRoleType } from "@prisma/client";
import useSWR from "swr";

import { fetchOrganizationMemberOptionsByRoles } from "@/services/client/organizationMember";
import { OrganizationMemberInfo } from "@/types/strapi";

const useOrganizationMemberOptionsByRoles = (
  params: Pick<OrganizationMemberInfo, "organization"> & { roles: OrganizationRoleType[] }
) => {
  const { data, error, isLoading } = useSWR(
    ["organization-members-options-by-roles", params],
    fetchOrganizationMemberOptionsByRoles
  );

  return {
    organizationMembers: data || [],
    isLoading,
    error,
  };
};

export default useOrganizationMemberOptionsByRoles;
