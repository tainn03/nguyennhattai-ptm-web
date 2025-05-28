"use client";

import useSWR from "swr";

import { organizationMemberOrderParticipantsFetcher } from "@/services/client/organizationMember";
import { OrderParticipantInfo } from "@/types/strapi";

const useOrganizationMemberOrderParticipants = (
  params: Partial<OrderParticipantInfo> & { includeAllRoles?: boolean }
) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["organization-member-order-participants", params],
    organizationMemberOrderParticipantsFetcher
  );

  return {
    organizationMembers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrganizationMemberOrderParticipants;
