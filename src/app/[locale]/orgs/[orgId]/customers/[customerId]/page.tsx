"use client";

import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { CustomerType } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter as useNextIntlRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";
import { TbRoute as TbRouteIcon } from "react-icons/tb";

import { DetailDataNotFound, Link, TabPanel } from "@/components/atoms";
import { Authorization, Button, CopyToClipboard, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { ConfirmModal } from "@/components/organisms";
import { useCustomer, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomerState } from "@/redux/states";
import { deleteCustomer } from "@/services/client/customers";
import { BreadcrumbItem } from "@/types";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { CustomerDetailTab, CustomerRouteTab } from "./components";

enum CustomerTab {
  INFORMATION = "information",
  ROUTES = "routes",
}

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const { originId, encryptedId } = useIdParam({ name: "customerId" });
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { searchQueryString } = useCustomerState();
    const router = useRouter();
    const nextIntlRouter = useNextIntlRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("customer");
    const { canFind: canFindRoute } = usePermission("customer-route");
    const { customer, isLoading } = useCustomer({ organizationId: orgId, id: originId! });
    const [detailCustomerTab, setDetailCustomerTab] = useState<TabItem[]>([
      { label: t("customer.customer_info"), value: "information", icon: UsersIcon },
    ]);
    const [selectedDetailCustomerTab, setSelectedDetailCustomerTab] = useState(detailCustomerTab[0].value);

    useEffect(() => {
      const paramsNew = new URLSearchParams(searchParams);
      paramsNew.delete("tab");
      if (paramsNew.size > 0) {
        router.replace(`${pathname}?${paramsNew}&tab=${selectedDetailCustomerTab}`);
      } else {
        router.replace(`${pathname}?tab=${selectedDetailCustomerTab}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDetailCustomerTab]);

    /**
     * Select tab when load page with url "tab" param
     */
    useEffect(() => {
      const tab = searchParams.get("tab");
      if (tab && (tab === CustomerTab.INFORMATION || tab === CustomerTab.ROUTES)) {
        setSelectedDetailCustomerTab(tab);
      }
    }, [canFindRoute, searchParams]);

    useEffect(() => {
      if (canFindRoute() && customer?.type === CustomerType.FIXED) {
        setDetailCustomerTab([
          { label: t("customer.customer_info"), value: CustomerTab.INFORMATION, icon: UsersIcon },
          { label: t("customer.route.title"), value: CustomerTab.ROUTES, icon: TbRouteIcon },
        ]);
      }
    }, [canFindRoute, customer?.type, t]);

    useEffect(() => {
      const payload: BreadcrumbItem[] = [
        { name: t("customer.manage"), link: orgLink },
        { name: t("customer.title"), link: `${orgLink}/customers${searchQueryString}` },
        {
          name: customer?.name || ensureString(encryptedId),
          link: `${orgLink}/customers/${encryptedId}?tab=${CustomerTab.INFORMATION}`,
        },
      ];
      if (selectedDetailCustomerTab === CustomerTab.ROUTES) {
        payload.push({
          name: t("customer.route.title"),
          link: `${orgLink}/customers/${encryptedId}?tab=${CustomerTab.ROUTES}`,
        });
      }
      setBreadcrumb(payload);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer?.name, selectedDetailCustomerTab, orgLink]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId) {
        const { error } = await deleteCustomer(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          customer?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: customer?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: customer?.name,
            }),
          });
        }
      }
      nextIntlRouter.push(`${orgLink}/customers${searchQueryString}`);
    }, [
      originId,
      nextIntlRouter,
      orgLink,
      searchQueryString,
      orgId,
      userId,
      customer?.updatedAt,
      customer?.name,
      showNotification,
      t,
    ]);

    /**
     * Handles the cancel event for deleting and closes the deletion confirmation modal.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, [setIsDeleteConfirmOpen]);

    // Data not found
    if (!isLoading && !customer) {
      return <DetailDataNotFound goBackLink={`${orgLink}/customers${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          actionHorizontal
          title={
            <>
              {t("customer.feature")}: <span className="italic">{customer?.name}</span>
              <CopyToClipboard value={customer?.name ?? ""} className="ml-3 h-5 w-5" />
            </>
          }
          actionComponent={
            <>
              {selectedDetailCustomerTab === "routes" && (
                <Authorization resource="customer-route" action="new">
                  <Button as={Link} icon={PlusIcon} href={`${orgLink}/customers/${encryptedId}/routes/new`}>
                    {t("customer.route.new_route")}
                  </Button>
                </Authorization>
              )}
              {selectedDetailCustomerTab !== "routes" && customer?.type === CustomerType.FIXED && (
                <>
                  {/* Delete */}
                  <Authorization
                    resource="customer"
                    action="delete"
                    alwaysAuthorized={canDeleteOwn() && equalId(customer?.createdByUser.id, userId)}
                  >
                    <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                      {t("common.delete")}
                    </Button>
                  </Authorization>

                  {/* Copy */}
                  <Authorization resource="customer" action="new">
                    <Button
                      as={Link}
                      variant="outlined"
                      disabled={isLoading}
                      href={`${orgLink}/customers/new?copyId=${encryptedId}`}
                    >
                      {t("common.copy")}
                    </Button>
                  </Authorization>

                  {/* Edit */}
                  <Authorization
                    resource="customer"
                    action="edit"
                    alwaysAuthorized={canEditOwn() && equalId(customer?.createdByUser.id, userId)}
                  >
                    <Button as={Link} disabled={isLoading} href={`${orgLink}/customers/${encryptedId}/edit`}>
                      {t("common.edit")}
                    </Button>
                  </Authorization>
                </>
              )}
            </>
          }
          className="sm:border-b-0"
        />
        <Tabs
          items={detailCustomerTab}
          selectedTab={selectedDetailCustomerTab}
          onTabChange={setSelectedDetailCustomerTab}
          className="col-span-full"
        />

        <TabPanel item={detailCustomerTab[0]} selectedTab={selectedDetailCustomerTab}>
          <CustomerDetailTab customer={customer} isLoading={isLoading} />
        </TabPanel>

        {customer?.type === CustomerType.FIXED && detailCustomerTab.length > 1 && (
          <Authorization resource="customer-route" action="find">
            <TabPanel item={detailCustomerTab[1]} selectedTab={selectedDetailCustomerTab}>
              <CustomerRouteTab />
            </TabPanel>
          </Authorization>
        )}

        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: customer?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "customer",
    action: "detail",
  }
);
