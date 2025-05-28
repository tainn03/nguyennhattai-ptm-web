"use client";

import useSWR from "swr";

import { workflowFetcher } from "@/actions/workflow";
import { WorkflowInfo } from "@/types/strapi";

const useWorkflow = (params: Partial<WorkflowInfo>) => {
  const { data, isLoading, error } = useSWR([`workflow/${params.id}`, params], workflowFetcher);

  return {
    workflow: data?.data?.data || ({} as WorkflowInfo),
    isLoading,
    error,
  };
};

export default useWorkflow;
