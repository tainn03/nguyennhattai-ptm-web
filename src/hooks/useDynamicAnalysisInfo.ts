"use client";

import useSWR from "swr";

import { dynamicAnalysisInfoFetcher } from "@/actions/dynamicAnalysis";
import { DynamicAnalysisInfo } from "@/types/strapi";

export type DynamicAnalysisInfoRequestParams = {
  id: number;
  fields: (keyof DynamicAnalysisInfo)[];
};

const useDynamicAnalysisInfo = (params: DynamicAnalysisInfoRequestParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["dynamic-analysis-info", params],
    dynamicAnalysisInfoFetcher.bind(null, params)
  );
  return {
    dynamicAnalysis: data,
    isLoading,
    error,
    mutate,
  };
};

export default useDynamicAnalysisInfo;
