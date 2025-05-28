"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { resourcesFetcher } from "@/services/client/resource";
import { OperationInfo, ResourceInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

const defaultOperations: Partial<OperationInfo>[] = [
  {
    name: "find",
    action: "find",
  },
  {
    name: "export",
    action: "export",
  },
];

const useResources = (organizationId?: number) => {
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const { data, error, isLoading } = useSWR(organizationId ? ["resources", organizationId] : null, resourcesFetcher);

  useEffect(() => {
    if (data) {
      const dynamicAnalysisResource: Partial<ResourceInfo>[] = [];
      const dynamicAnalysisList = data.dynamicAnalyses || [];
      const resourcesList = data.resources || [];
      dynamicAnalysisList.map((item) => {
        dynamicAnalysisResource.push({
          name: ensureString(item.name),
          action: `dynamic-analysis-${item.id}`,
          description: ensureString(item.name),
          operations: defaultOperations,
        });
      });
      setResources([...resourcesList, ...(dynamicAnalysisResource as ResourceInfo[])]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return {
    resources,
    isLoading,
    error,
  };
};

export default useResources;
