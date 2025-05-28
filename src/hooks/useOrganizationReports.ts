"use client";

import useSWR from "swr";

import { organizationReportsFetcher } from "@/services/client/organizationReport";
import { OrganizationReportInfo } from "@/types/strapi";

const useOrganizationReports = (params: Partial<OrganizationReportInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["organization-reports", params], organizationReportsFetcher);

  return {
    organizationReports: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrganizationReports;
