"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { exportReportForDownloadAction } from "@/actions/dynamicAnalysis";
import { Authorization, Button, PageHeader } from "@/components/molecules";
import { SupersetEmbedViewer } from "@/components/organisms";
import { useAuth, useDynamicAnalysisInfo } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { AnyObject } from "@/types";
import { ResourceType } from "@/types/permission";
import { DynamicReportStatusCode } from "@/types/report";

import DynamicAnalysisFilters from "./DynamicAnalysisFilters";

type DynamicReportsPageProps = {
  originId: number;
  encryptedId: string;
};

const DynamicReportsPage = ({ originId, encryptedId }: DynamicReportsPageProps) => {
  const t = useTranslations();
  const { orgLink } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();

  const [downloading, setDownloading] = useState(false);
  const [filters, setFilters] = useState<Record<string, AnyObject | Date | string | number | null>>({});
  const { dynamicAnalysis, isLoading } = useDynamicAnalysisInfo({
    id: originId,
    fields: ["code", "name", "reportTemplateId"],
  });

  // Resource type for dynamic analysis
  const dynamicResource = useMemo(() => `dynamic-analysis-${originId}` as ResourceType, [originId]);

  /**
   * Updating the breadcrumb navigation.use
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("dynamic_report.title"), link: "" },
      { name: dynamicAnalysis?.name || encryptedId, link: `${orgLink}/dynamic-reports/${encryptedId}` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicAnalysis?.name, orgLink]);

  /**
   * Handle search event from filters
   *
   * @param {Record<string, AnyObject | Date | string | number | null>} values - The values from the filters.
   */
  const handleSearch = useCallback((values: Record<string, AnyObject | Date | string | number | null>) => {
    setFilters(values);
  }, []);

  /**
   * Handle download event from the action button
   */
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    const result = await exportReportForDownloadAction(originId, { data: filters });
    if (result?.status === DynamicReportStatusCode.OK && result?.url) {
      showNotification({
        color: "success",
        title: t("dynamic_report.download_success_title"),
        message: t("dynamic_report.download_success_message", {
          name: dynamicAnalysis?.name,
        }),
      });
      window.open(result.url);
    } else {
      showNotification({
        color: "error",
        title: t("common.message.error_title"),
        message: t("dynamic_report.download_error_message", {
          name: dynamicAnalysis?.name,
        }),
      });
    }
    setDownloading(false);
  }, [dynamicAnalysis?.name, filters, originId, showNotification, t]);

  return (
    <>
      <PageHeader
        title={dynamicAnalysis?.name}
        className="[&>*:nth-child(2)]:items-end [&>div]:flex-1"
        description={<DynamicAnalysisFilters loading={downloading} onSearch={handleSearch} originId={originId} />}
        actionHorizontal
        loading={isLoading}
        actionComponent={
          dynamicAnalysis?.reportTemplateId ? (
            <Authorization resource={dynamicResource} action="export">
              <Button icon={ArrowDownTrayIcon} disabled={isLoading} onClick={handleDownload} loading={downloading}>
                {t("common.download")}
              </Button>
            </Authorization>
          ) : null
        }
      />
      {dynamicAnalysis?.code && <SupersetEmbedViewer code={dynamicAnalysis.code} data={filters} />}
    </>
  );
};

export default DynamicReportsPage;
