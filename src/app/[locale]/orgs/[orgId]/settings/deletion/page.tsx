"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Button, SectionHeader } from "@/components/molecules";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { deleteOrganization } from "@/services/client/organization";
import { withOrg } from "@/utils/client";

import { DeleteOrganizationModal } from "./components";

export default withOrg(
  ({ orgId, orgLink, org, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_deletion.title"), link: `${orgLink}/settings/deletion` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handle the click event for initiating a delete action
     */
    const handleDeleteClick = useCallback(() => {
      setDeleteModalOpen(true);
    }, []);

    /**
     * Handle canceling the delete operation
     */
    const handleDeleteCancel = useCallback(() => {
      setDeleteModalOpen(false);
    }, []);

    const handleConfirmClick = useCallback(async () => {
      const { error } = await deleteOrganization({
        id: orgId,
        name: org.name,
        updatedById: userId,
      });

      if (error) {
        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message: t("org_deletion.deletion_error", { name: org?.name }),
        });
        return;
      } else {
        // Show a success notification
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_title", { name: org?.name }),
        });
        router.push("/orgs");
      }
    }, [org.name, orgId, router, showNotification, t, userId]);

    return (
      <>
        <div>
          <SectionHeader
            title={t("org_deletion.title")}
            description={
              <>
                {t.rich("org_deletion.title_description", {
                  strong: (chunks) => <span className="font-bold">{chunks}</span>,
                })}
              </>
            }
          />
          <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
            {t.rich("org_deletion.deletion_confirmed_message", {
              strong: (chunks) => <span className="font-bold">{chunks}</span>,
              name: org?.name,
            })}
          </p>

          <Button color="error" onClick={handleDeleteClick} className="mt-5">
            {t("org_deletion.title")}
          </Button>
        </div>

        <DeleteOrganizationModal
          open={deleteModalOpen}
          organizationName={org.name}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleConfirmClick}
        />
      </>
    );
  },
  {
    resource: "organization",
    action: ["delete"],
  }
);
