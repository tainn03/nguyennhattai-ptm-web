"use client";

import useSWR from "swr";

import { fetchOrganizationMemberOptions } from "@/services/client/organizationMember";
import { OrganizationMemberInfo } from "@/types/strapi";

const useOrganizationMemberOptions = (params: Pick<OrganizationMemberInfo, "organization" | "member">) => {
  const { data, error, isLoading } = useSWR(["organization-members/options", params], fetchOrganizationMemberOptions);

  return {
    organizationMembers: data || [],
    isLoading,
    error,
  };
};

export default useOrganizationMemberOptions;
