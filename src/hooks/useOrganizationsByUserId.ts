"use client";

import { User } from "@prisma/client";
import useSWR from "swr";

import { organizationsByUserIdFetcher } from "@/services/client/organizationMember";

const useOrganizationsByUserId = (params: Pick<User, "id">) => {
  const { data, error, isLoading } = useSWR(
    [`users/${params.id}/organization-members`, params],
    organizationsByUserIdFetcher
  );

  return {
    organizationMembers: data || [],
    isLoading,
    error,
  };
};

export default useOrganizationsByUserId;
