"use client";

import useSWR from "swr";

import { organizationMemberFetcher } from "@/services/client/organizationMember";
import { OrganizationMemberInfo } from "@/types/strapi";

const useOrganizationMember = (params: Partial<OrganizationMemberInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    [`organization-members/${params.id}`, params],
    organizationMemberFetcher
  );

  return {
    organizationMember: data,
    isLoading,
    error,
    mutate,
  };
};

export default useOrganizationMember;
