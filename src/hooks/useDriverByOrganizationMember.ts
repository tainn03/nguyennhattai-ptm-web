"use client";

import useSWR from "swr";

import { getDriverByOrganizationMember } from "@/services/client/driver";
import { OrganizationMemberInfo } from "@/types/strapi";

const useDriverByOrganizationMember = (params: Pick<OrganizationMemberInfo, "member" | "organization">) => {
  const { data, error, isLoading } = useSWR(
    params.member.id ? ["driver-organization-member", params] : null,
    getDriverByOrganizationMember
  );

  return {
    driver: data,
    isLoading,
    error,
  };
};

export default useDriverByOrganizationMember;
