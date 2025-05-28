"use client";

import useSWR from "swr";

import { workflowsFetcher } from "@/actions/workflow";
import { FilterRequest } from "@/types/filter";
import { WorkflowInfo } from "@/types/strapi";

const useWorkflows = (params: FilterRequest<WorkflowInfo>) => {
  const { data, isLoading, error, mutate } = useSWR(["workflows", params], workflowsFetcher);

  return {
    workflows: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useWorkflows;
