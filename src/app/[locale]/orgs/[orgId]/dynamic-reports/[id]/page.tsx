"use client";

import { useMemo } from "react";

import { Authorization } from "@/components/molecules";
import { useIdParam } from "@/hooks";
import { ResourceType } from "@/types/permission";
import { withOrg } from "@/utils/client";

import { DynamicReportsPage } from "./components";

export default withOrg(() => {
  const { originId, encryptedId } = useIdParam();

  // Resource type for dynamic analysis
  const dynamicResource = useMemo(() => `dynamic-analysis-${originId}` as ResourceType, [originId]);

  return (
    <Authorization resource={dynamicResource} action="find">
      {originId && encryptedId && <DynamicReportsPage originId={originId} encryptedId={encryptedId} />}
    </Authorization>
  );
});
