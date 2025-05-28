"use client";

import { DocumentChartBarIcon, TruckIcon } from "@heroicons/react/24/outline";
import { OrganizationReportType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PiMicrosoftExcelLogo } from "react-icons/pi";

import { DetailDataNotFound, TabPanel } from "@/components/atoms";
import { Authorization, Button, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { useIdParam, usePermission, useSubcontractorCost } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useSubcontractorCostState } from "@/redux/states";
import { exportSubcontractorCosts } from "@/services/client/dynamicReport";
import { LocaleType } from "@/types/locale";
import { withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString } from "@/utils/date";
import { ensureString } from "@/utils/string";

import { SubcontractorInfoTab, TripsInfoTab } from "./components";

enum subcontractorTab {
  GENERAL_INFORMATION = "general-information",
  TRIPS = "trip-information",
}

export default withOrg(
  ({ org, orgId, orgLink }) => {
    const t = useTranslations();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { originId, encryptedId } = useIdParam();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchQueryString } = useSubcontractorCostState();
    const { canExport } = usePermission("report-statistics-subcontractor");

    const [isExporting, setIsExporting] = useState(false);

    const [startDate, endDate, driverReportIds] = useMemo(
      () => [
        searchParams.get("startDate"),
        searchParams.get("endDate"),
        searchParams
          .get("status")
          ?.toString()
          .split(",")
          .filter(Boolean)
          .map((s) => parseInt(s)),
      ],
      [searchParams]
    );

    const { costInfo, isLoading } = useSubcontractorCost({
      organizationId: orgId,
      subcontractorId: originId!,
      driverReportIds: driverReportIds ?? [],
      startDate: startDate ? startOfDayToISOString(startDate) : null,
      endDate: endDate ? endOfDayToISOString(endDate) : null,
    });

    const tabs: TabItem[] = [
      {
        label: t("report.subcontractors.detail.info_tab"),
        value: subcontractorTab.GENERAL_INFORMATION,
        icon: DocumentChartBarIcon,
      },
      { label: t("report.subcontractors.detail.trip_tab"), value: subcontractorTab.TRIPS, icon: TruckIcon },
    ];

    const [selectedTab, setSelectedTab] = useState(tabs[0].value);

    const detailLink = useMemo(() => {
      return t("report.drivers.detail_link", {
        orgLink,
        encryptedId,
        startDate: startDate ? formatDate(startDate, "YYYY-MM-DD") : null,
        endDate: endDate ? formatDate(endDate, "YYYY-MM-DD") : null,
        status: (driverReportIds ?? []).join(","),
      });
    }, [t, orgLink, encryptedId, startDate, endDate, driverReportIds]);

    useEffect(() => {
      setBreadcrumb([
        { name: t("report.feature"), link: `${orgLink}/dashboard` },
        { name: t("report.subcontractors.title"), link: `${orgLink}/reports/subcontractor${searchQueryString}` },
        {
          name: ensureString(costInfo.name) || ensureString(encryptedId),
          link: detailLink,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [costInfo.name, detailLink, orgLink]);

    /**
     * Handle the export of subcontractor cost.
     */
    const handleExport = useCallback(async () => {
      setIsExporting(true);
      const { status, data } = await exportSubcontractorCosts({
        type: OrganizationReportType.SUBCONTRACTOR_COST,
        organizationCode: org.code,
        subcontractorId: originId!,
        driverReportIds: driverReportIds ?? [],
        startDate: startDate ? startOfDayToISOString(startDate) : null,
        endDate: endDate ? endOfDayToISOString(endDate) : null,
        locale: locale as LocaleType,
      });

      if (status === HttpStatusCode.BadRequest) {
        showNotification({
          color: "info",
          title: t("report.subcontractors.no_data"),
        });
      } else if (status !== HttpStatusCode.Ok) {
        showNotification({
          color: "error",
          title: t("report.subcontractors.download_error_title"),
          message: t("report.subcontractors.download_error"),
        });
      } else {
        window.open(data);
        showNotification({
          color: "success",
          title: t("report.subcontractors.download_success_title"),
          message: t("report.subcontractors.download_success"),
        });
      }
      setIsExporting(false);
    }, [driverReportIds, endDate, locale, org.code, originId, showNotification, startDate, t]);

    // Data not found
    if (!isLoading && !costInfo) {
      return <DetailDataNotFound goBackLink={`${orgLink}/reports/subcontractors`} />;
    }

    return (
      <>
        <PageHeader
          title={t("report.subcontractors.title")}
          subTitle={t("report.subcontractors.detail.description", {
            name: costInfo.name,
            startDate: formatDate(startDate, t("common.format.date")),
            endDate: formatDate(endDate, t("common.format.date")),
          })}
          className="sm:border-b-0"
          actionHorizontal
          actionComponent={
            <Authorization resource="report-statistics-subcontractor" action="export" alwaysAuthorized={canExport()}>
              <Button loading={isExporting} icon={PiMicrosoftExcelLogo} onClick={handleExport}>
                {t("report.subcontractors.download")}
              </Button>
            </Authorization>
          }
        />

        {/* Tabs */}
        <Tabs items={tabs} selectedTab={selectedTab} onTabChange={setSelectedTab} className="mb-6 sm:mb-10" />

        {/* Subcontractor Info Tab Panel  */}
        <TabPanel item={tabs[0]} selectedTab={selectedTab}>
          <SubcontractorInfoTab loading={isLoading} costInfo={costInfo} />
        </TabPanel>

        {/* Trips Info Tab Panel */}
        <TabPanel item={tabs[1]} selectedTab={selectedTab}>
          <TripsInfoTab
            subcontractorId={originId!}
            startDate={startDate ? startOfDayToISOString(startDate) : null}
            endDate={endDate ? endOfDayToISOString(endDate) : null}
            driverReportIds={driverReportIds ?? []}
          />
        </TabPanel>
      </>
    );
  },
  {
    resource: "report-statistics-subcontractor",
    action: ["detail"],
  }
);
