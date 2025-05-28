import { ChartPieIcon } from "@heroicons/react/24/outline";
import { DynamicAnalysis } from "@prisma/client";

import { MenuGroup, MenuItem } from "@/configs/menu";
import { ResourceType } from "@/types/permission";
import { OrganizationInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

import { encryptId } from "./security";

export function convertDynamicAnalysisToMenuItem(item: DynamicAnalysis, org: OrganizationInfo | undefined): MenuItem {
  return {
    id: `${item.id}-${item.chartId}-${item.datasetId}-${item.reportTemplateId}`,
    name: ensureString(item.name),
    link: `/orgs/${org?.code}/dynamic-reports/${encryptId(item.id)}`,
    icon: ChartPieIcon,
    process: "finished",
    resource: `dynamic-analysis-${item.id}` as ResourceType,
    action: "find",
  };
}

export function addDynamicAnalysisToMenuGroup(
  menuGroup: MenuGroup[],
  dynamicAnalysis: DynamicAnalysis[],
  org: OrganizationInfo | undefined
): MenuGroup[] {
  return menuGroup.map((item) => {
    if (item.id === "pqjvRAd3ZH1V") {
      const newItems = dynamicAnalysis.map((analysisItem) => convertDynamicAnalysisToMenuItem(analysisItem, org));
      return {
        ...item,
        menus: [...(item.menus || []), ...newItems],
      };
    }
    return item;
  });
}
