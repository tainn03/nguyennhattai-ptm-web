"use client";

import { DocumentChartBarIcon, TruckIcon } from "@heroicons/react/24/outline";
import { HttpStatusCode } from "axios";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PiMicrosoftExcelLogo } from "react-icons/pi";

import { DetailDataNotFound, TabPanel } from "@/components/atoms";
import { Authorization, Button, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { useDriverSalary, useIdParam } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverSalaryState } from "@/redux/states";
import { exportDriverSalaries } from "@/services/client/dynamicReport";
import { LocaleType } from "@/types/locale";
import { getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString } from "@/utils/date";
import { ensureString } from "@/utils/string";

import { DriverSalaryInfoTab, DriverTripInfoTab } from "./components";

enum DriverSalaryTab {
  SALARY = "salary",
  TRIP_INFORMATION = "trip-information",
}

export default withOrg(
  ({ org, orgId, orgLink }) => {
    const t = useTranslations();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { originId, encryptedId } = useIdParam();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchQueryString } = useDriverSalaryState();

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

    const { driverSalary, isLoading } = useDriverSalary({
      organizationId: orgId,
      driverId: originId!,
      driverReportIds: driverReportIds ?? [],
      startDate: startDate ? startOfDayToISOString(startDate) : null,
      endDate: endDate ? endOfDayToISOString(endDate) : null,
    });

    const driverSalaryTabs: TabItem[] = [
      { label: t("report.drivers.detail.info_tab"), value: DriverSalaryTab.SALARY, icon: DocumentChartBarIcon },
      { label: t("report.drivers.detail.trip_tab"), value: DriverSalaryTab.TRIP_INFORMATION, icon: TruckIcon },
    ];

    const [selectedTab, setSelectedTab] = useState(driverSalaryTabs[0].value);

    const detailLink = useMemo(() => {
      return t("report.drivers.detail_link", {
        orgLink,
        encryptedId,
        startDate: startDate ? formatDate(startDate, "YYYY-MM-DD") : null,
        endDate: endDate ? formatDate(endDate, "YYYY-MM-DD") : null,
        status: (driverReportIds ?? []).join(","),
      });
    }, [t, orgLink, encryptedId, startDate, endDate, driverReportIds]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("report.feature"), link: `${orgLink}/dashboard` },
        { name: t("report.drivers.title"), link: `${orgLink}/reports/drivers${searchQueryString}` },
        {
          name: getFullName(driverSalary.firstName, driverSalary.lastName) || ensureString(encryptedId),
          link: detailLink,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverSalary.firstName, driverSalary.lastName, detailLink, orgLink]);

    /**
     * Handle the export of driver salary.
     */
    const handleExport = useCallback(async () => {
      setIsExporting(true);
      const { status, data } = await exportDriverSalaries({
        organizationCode: org.code,
        driverId: originId!,
        driverReportIds: driverReportIds ?? [],
        startDate: startDate ? startOfDayToISOString(formatDate(startDate, "YYYY-MM-DD")) : null,
        endDate: endDate ? endOfDayToISOString(formatDate(endDate, "YYYY-MM-DD")) : null,
        locale: locale as LocaleType,
      });

      if (status === HttpStatusCode.BadRequest) {
        showNotification({
          color: "info",
          title: t("report.drivers.no_data"),
        });
      } else if (status !== HttpStatusCode.Ok) {
        showNotification({
          color: "error",
          title: t("report.drivers.download_error_title"),
          message: t("report.drivers.download_error"),
        });
      } else {
        window.open(data);
        showNotification({
          color: "success",
          title: t("report.drivers.download_success_title"),
          message: t("report.drivers.download_success"),
        });
      }
      setIsExporting(false);
    }, [driverReportIds, endDate, locale, org.code, originId, showNotification, startDate, t]);

    // Data not found
    if (!isLoading && !driverSalary) {
      return <DetailDataNotFound goBackLink={`${orgLink}/reports/drivers`} />;
    }

    return (
      <>
        <PageHeader
          title={t("report.drivers.title")}
          subTitle={t("report.drivers.detail.description", {
            name: getFullName(driverSalary.firstName, driverSalary.lastName),
            startDate: formatDate(startDate, t("common.format.date")),
            endDate: formatDate(endDate, t("common.format.date")),
          })}
          className="sm:border-b-0"
          actionHorizontal
          actionComponent={
            <Authorization resource="report-statistics-driver" action="export">
              <Button loading={isExporting} icon={PiMicrosoftExcelLogo} onClick={handleExport}>
                {t("report.drivers.download")}
              </Button>
            </Authorization>
          }
        />

        {/* Tabs */}
        <Tabs
          items={driverSalaryTabs}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          className="mb-6 sm:mb-10"
        />

        {/* Driver Salary Info Tab Panels */}
        <TabPanel item={driverSalaryTabs[0]} selectedTab={selectedTab}>
          <DriverSalaryInfoTab loading={isLoading} salaryInfo={driverSalary} />
        </TabPanel>

        {/* Driver Trip Info Tab Panels */}
        <TabPanel item={driverSalaryTabs[1]} selectedTab={selectedTab}>
          <DriverTripInfoTab
            driverId={originId!}
            startDate={startDate}
            endDate={endDate}
            driverReportIds={driverReportIds ?? []}
          />
        </TabPanel>
      </>
    );
  },
  {
    resource: "report-statistics-driver",
    action: ["detail"],
  }
);
