"use client";

import { DocumentChartBarIcon } from "@heroicons/react/24/outline";
import { OrganizationReportType } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PiPackage as PiPackageIcon } from "react-icons/pi";
import { PiMicrosoftExcelLogo } from "react-icons/pi";

import { DetailDataNotFound, TabPanel } from "@/components/atoms";
import { Authorization, Button, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { useCustomerStatistic, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomerReportState } from "@/redux/states";
import { exportCustomerReport } from "@/services/client/dynamicReport";
import { HttpStatusCode } from "@/types/api";
import { LocaleType } from "@/types/locale";
import { withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString } from "@/utils/date";
import { ensureString } from "@/utils/string";

import { CustomerInfoTab, CustomerOrderInfoTab } from "./components";

enum CustomerReportTab {
  CUSTOMER = "customer-information",
  ORDER_INFORMATION = "order-information",
}

export default withOrg(
  ({ org, orgId, orgLink }) => {
    const t = useTranslations();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { originId, encryptedId } = useIdParam();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchQueryString } = useCustomerReportState();
    const { canExport } = usePermission("report-statistics-customer");

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

    const { statistic, isLoading } = useCustomerStatistic({
      organizationId: orgId,
      customerId: originId!,
      driverReportIds: driverReportIds ?? [],
      startDate: startDate ? startOfDayToISOString(startDate) : null,
      endDate: endDate ? endOfDayToISOString(endDate) : null,
    });

    const customerReportTabs: TabItem[] = [
      {
        label: t("report.customers.customer_info.info_tab"),
        value: CustomerReportTab.CUSTOMER,
        icon: DocumentChartBarIcon,
      },
      {
        label: t("report.customers.customer_info.trip_tab"),
        value: CustomerReportTab.ORDER_INFORMATION,
        icon: PiPackageIcon,
      },
    ];

    const [selectedTab, setSelectedTab] = useState(customerReportTabs[0].value);

    const detailLink = useMemo(() => {
      return t("report.customers.detail_link", {
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
        { name: t("report.customers.title"), link: `${orgLink}/reports/customers${searchQueryString}` },
        {
          name: statistic?.name || ensureString(encryptedId),
          link: detailLink,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statistic?.name, detailLink, orgLink]);

    /**
     * Handle the export of accounts receivable by customer.
     */
    const handleExport = useCallback(async () => {
      setIsExporting(true);
      const { status, data } = await exportCustomerReport({
        organizationCode: org.code,
        customerId: originId!,
        type: OrganizationReportType.ACCOUNTS_RECEIVABLE,
        driverReportIds: driverReportIds ?? [],
        startDate: startDate ? startOfDayToISOString(formatDate(startDate, "YYYY-MM-DD")) : null,
        endDate: endDate ? endOfDayToISOString(formatDate(endDate, "YYYY-MM-DD")) : null,
        locale: locale as LocaleType,
      });

      if (status === HttpStatusCode.BadRequest) {
        showNotification({
          color: "info",
          title: t("report.customers.no_data"),
        });
      } else if (status !== HttpStatusCode.Ok) {
        showNotification({
          color: "error",
          title: t("report.customers.download_error_title"),
          message: t("report.customers.download_error"),
        });
      } else {
        window.open(data);
        showNotification({
          color: "success",
          title: t("report.customers.download_success_title"),
          message: t("report.customers.download_success"),
        });
      }
      setIsExporting(false);
    }, [driverReportIds, endDate, locale, org.code, originId, showNotification, startDate, t]);

    // Data not found
    if (!isLoading && !statistic) {
      return <DetailDataNotFound goBackLink={`${orgLink}/reports/customers`} />;
    }

    return (
      <>
        <PageHeader
          title={t("report.customers.title")}
          subTitle={t("report.customers.customer_info.description", {
            customerName: statistic?.name,
            startDate: formatDate(startDate, t("common.format.date")),
            endDate: formatDate(endDate, t("common.format.date")),
          })}
          className="sm:border-b-0"
          actionHorizontal
          actionComponent={
            <Authorization resource="report-statistics-customer" action="export" alwaysAuthorized={canExport()}>
              <Button loading={isExporting} icon={PiMicrosoftExcelLogo} onClick={handleExport}>
                {t("report.customers.action_menu.download")}
              </Button>
            </Authorization>
          }
        />

        {/* Tabs */}
        <Tabs
          items={customerReportTabs}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          className="mb-6 sm:mb-10"
        />

        {/* Customer Info Tab Panels */}
        <TabPanel item={customerReportTabs[0]} selectedTab={selectedTab}>
          <CustomerInfoTab isLoading={isLoading} customerInfo={statistic} />
        </TabPanel>

        {/* Customer Trip Info Tab Panels */}
        <TabPanel item={customerReportTabs[1]} selectedTab={selectedTab}>
          <CustomerOrderInfoTab
            customerId={originId!}
            startDate={startDate}
            endDate={endDate}
            driverReportIds={driverReportIds ?? []}
          />
        </TabPanel>
      </>
    );
  },
  {
    resource: "report-statistics-customer",
    action: ["detail"],
  }
);
