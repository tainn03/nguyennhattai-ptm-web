"use client";

import useSWR from "swr";

import { organizationMembersFetcher } from "@/services/client/organizationMember";
import { FilterRequest } from "@/types/filter";
import { OrganizationMemberInfo } from "@/types/strapi";

const useOrganizationMembers = (params: FilterRequest<OrganizationMemberInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["organization-members", params], organizationMembersFetcher);

  return {
    organizationMembers: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrganizationMembers;
