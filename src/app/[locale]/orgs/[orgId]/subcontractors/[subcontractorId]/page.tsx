"use client";

import { PlusIcon, TruckIcon, UsersIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter as useNextIntlRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { DetailDataNotFound, Link, TabPanel } from "@/components/atoms";
import { Authorization, Button, CopyToClipboard, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { ConfirmModal, SubcontractorDetail, VehicleList } from "@/components/organisms";
import { useIdParam, usePermission, useSubcontractor } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useSubcontractorState } from "@/redux/states";
import { deleteSubcontractor } from "@/services/client/subcontractor";
import { BreadcrumbItem } from "@/types";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

enum SubcontractorsTab {
  INFORMATION = "subcontractor",
  VEHICLE = "vehicles",
}

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const routerNextIntl = useNextIntlRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { originId, encryptedId } = useIdParam({ name: "subcontractorId" });
    const { showNotification } = useNotification();
    const { searchQueryString } = useSubcontractorState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("subcontractor");
    const { canFind: canFindRoute } = usePermission("vehicle");

    const { subcontractor, isLoading } = useSubcontractor({ organizationId: orgId, id: originId! });

    let detailSubcontractorsTab: TabItem[] = [
      {
        label: t("subcontractor.tab_subcontractor"),
        value: SubcontractorsTab.INFORMATION,
        icon: UsersIcon,
      },
      { label: t("subcontractor.tab_vehicle"), value: SubcontractorsTab.VEHICLE, icon: TruckIcon },
    ];

    if (!canFindRoute()) {
      detailSubcontractorsTab = [
        {
          label: t("subcontractor.tab_subcontractor"),
          value: SubcontractorsTab.INFORMATION,
          icon: UsersIcon,
        },
      ];
    }

    const [selectedDetailSubcontractorsTab, setSelectedDetailSubcontractorsTab] = useState(
      detailSubcontractorsTab[0].value
    );

    /**
     * Select tab when load page with url "tab" param
     */
    useEffect(() => {
      const tab = searchParams.get("tab");
      if (tab && (tab === SubcontractorsTab.INFORMATION || tab === SubcontractorsTab.VEHICLE)) {
        setSelectedDetailSubcontractorsTab(tab);
      }
    }, [canFindRoute, searchParams]);

    useEffect(() => {
      const paramsNew = new URLSearchParams(searchParams);
      paramsNew.delete("tab");
      if (paramsNew.size > 0) {
        router.replace(`${pathname}?${paramsNew}&tab=${selectedDetailSubcontractorsTab}`);
      } else {
        router.replace(`${pathname}?tab=${selectedDetailSubcontractorsTab}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDetailSubcontractorsTab]);

    useEffect(() => {
      const payload: BreadcrumbItem[] = [
        { name: t("subcontractor.management"), link: orgLink },
        { name: t("subcontractor.title"), link: `${orgLink}/subcontractors${searchQueryString}` },
        {
          name: subcontractor?.name || `${encryptedId}`,
          link: `${orgLink}/subcontractors/${encryptedId}?tab=${SubcontractorsTab.INFORMATION}`,
        },
      ];
      if (selectedDetailSubcontractorsTab === SubcontractorsTab.VEHICLE) {
        payload.push({
          name: t("vehicle.title"),
          link: `${orgLink}/subcontractors/${encryptedId}?tab=${SubcontractorsTab.VEHICLE}`,
        });
      }

      setBreadcrumb(payload);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcontractor?.name, selectedDetailSubcontractorsTab, orgLink]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the cancel event for deleting and closes the deletion confirmation modal.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteSubcontractor(
          {
            organizationId: orgId,
            id: originId!,
            updatedById: userId,
            userId: subcontractor?.user?.id ? subcontractor?.user?.id : null,
          },
          subcontractor?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: subcontractor?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: subcontractor?.name,
            }),
          });
        }
      }
      routerNextIntl.push(`${orgLink}/subcontractors${searchQueryString}`);
    }, [
      orgId,
      orgLink,
      originId,
      routerNextIntl,
      searchQueryString,
      showNotification,
      subcontractor?.name,
      subcontractor?.updatedAt,
      subcontractor?.user?.id,
      t,
      userId,
    ]);

    // Data not found
    if (!isLoading && !subcontractor) {
      return <DetailDataNotFound goBackLink={`${orgLink}/subcontractors${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          actionHorizontal
          title={
            <>
              {t("subcontractor.feature")}: <span className="italic">{subcontractor?.name}</span>
              <CopyToClipboard value={subcontractor?.name ?? ""} className="ml-3" />
            </>
          }
          actionComponent={
            <>
              {selectedDetailSubcontractorsTab === SubcontractorsTab.VEHICLE ? (
                <Authorization resource="vehicle" action="new">
                  <Button as={Link} icon={PlusIcon} href={`${orgLink}/subcontractors/${encryptedId}/vehicles/new`}>
                    {t("subcontractor.new_vehicle")}
                  </Button>
                </Authorization>
              ) : (
                <>
                  {/* Delete */}
                  <Authorization
                    resource="subcontractor"
                    action="delete"
                    alwaysAuthorized={canDeleteOwn() && equalId(subcontractor?.createdByUser.id, userId)}
                  >
                    <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                      {t("common.delete")}
                    </Button>
                  </Authorization>

                  {/* Copy */}
                  <Authorization resource="subcontractor" action="new">
                    <Button
                      as={Link}
                      variant="outlined"
                      disabled={isLoading}
                      href={`${orgLink}/subcontractors/new?copyId=${encryptedId}`}
                    >
                      {t("common.copy")}
                    </Button>
                  </Authorization>

                  {/* Edit */}
                  <Authorization
                    resource="subcontractor"
                    action="edit"
                    alwaysAuthorized={canEditOwn() && equalId(subcontractor?.createdByUser.id, userId)}
                  >
                    <Button as={Link} disabled={isLoading} href={`${orgLink}/subcontractors/${encryptedId}/edit`}>
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
          items={detailSubcontractorsTab}
          selectedTab={selectedDetailSubcontractorsTab}
          onTabChange={setSelectedDetailSubcontractorsTab}
          className="col-span-full"
        />

        <TabPanel item={detailSubcontractorsTab[0]} selectedTab={selectedDetailSubcontractorsTab}>
          <SubcontractorDetail subcontractor={subcontractor} isLoading={isLoading} />
        </TabPanel>

        <Authorization resource="vehicle" action="find">
          <TabPanel item={detailSubcontractorsTab[1]} selectedTab={selectedDetailSubcontractorsTab}>
            <VehicleList orgId={orgId} orgLink={orgLink} userId={userId} subcontractorId={originId} />
          </TabPanel>
        </Authorization>

        <ConfirmModal
          open={isDeleteConfirmOpen ?? false}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: subcontractor?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "subcontractor",
    action: "detail",
  }
);
