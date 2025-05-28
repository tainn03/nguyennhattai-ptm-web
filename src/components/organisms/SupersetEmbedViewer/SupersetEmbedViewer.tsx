"use client";

import { DynamicAnalysis } from "@prisma/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { fetchDynamicAnalysesByCodeAction } from "@/actions/dynamicAnalysis";
import { SkeletonDescriptionProperty } from "@/components/atoms";
import { Loading } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { EmbedOptions, getAnalyticsEmbedUrl } from "@/utils/superset";
import { cn } from "@/utils/twcn";

interface SupersetEmbedViewerProps {
  code: string;
  type?: "IFRAME_ONLY" | "IFRAME_WITH_CARD";
  className?: string;
}

const SupersetEmbedViewer: React.FC<SupersetEmbedViewerProps & EmbedOptions> = ({
  code,
  data,
  type = "IFRAME_ONLY",
  className,
}) => {
  const { orgId, userId } = useAuth();
  const [dynamicAnalysis, setDynamicAnalysis] = useState<DynamicAnalysis | null>();

  const embedUrl = useMemo(() => {
    if (!dynamicAnalysis?.chartId) {
      return "";
    }

    return getAnalyticsEmbedUrl({
      chartId: dynamicAnalysis?.chartId,
      data: {
        ...data,
        orgId,
        userId,
      },
    });
  }, [data, dynamicAnalysis?.chartId, orgId, userId]);

  const fetchDynamicAnalysis = useCallback(async () => {
    if (orgId) {
      const result = await fetchDynamicAnalysesByCodeAction(code, orgId);
      setDynamicAnalysis(result);
    }
  }, [code, orgId]);

  useEffect(() => {
    fetchDynamicAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, code]);

  if (!embedUrl) {
    return type === "IFRAME_ONLY" ? <Loading size="large" /> : <SkeletonDescriptionProperty type="chart" size="long" />;
  }

  return (
    <div className={cn("h-[calc(100vh-306px)] w-full", className)}>
      <iframe width="100%" height="100%" seamless frameBorder="0" scrolling="no" src={embedUrl} />
    </div>
  );
};

export default SupersetEmbedViewer;
