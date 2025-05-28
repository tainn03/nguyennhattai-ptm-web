"use client";

import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Authorization, Button, InputGroup, Loading } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useOrganizationRoles, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { deleteOrganizationRole } from "@/services/client/organizationRole";
import { OrganizationRoleInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

import { RoleEditModal } from "./components";

export default withOrg(
  ({ orgLink, orgId, userId }) => {
    const t = useTranslations();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);

    const { organizationRoles, isLoading, mutate } = useOrganizationRoles({ organizationId: orgId });
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("organization-role");

    const organizationRoleRef = useRef<OrganizationRoleInfo>();

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_role.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_role.title"), link: `${orgLink}/settings/role` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the initiation of the organization role update process.
     *
     * @function
     * @param {OrganizationRoleInfo} organizationRole - The organization role to be updated.
     * @returns {void}
     */
    const handleOrgRoleUpdate = useCallback(
      (organizationRole: OrganizationRoleInfo) => () => {
        organizationRoleRef.current = organizationRole;
        setUpdateModalOpen(true);
      },
      []
    );

    /**
     * Callback function for show  a dialog.
     */
    const handleModalConfirm = useCallback(() => {
      setUpdateModalOpen(true);
    }, []);

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleModalCancel = useCallback(() => {
      setUpdateModalOpen(false);
      organizationRoleRef.current = undefined;
    }, []);

    /**
     * Callback function for opening a dialog with maintenance type data.
     *
     * @param item - The maintenance type data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: OrganizationRoleInfo) => () => {
        organizationRoleRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deleting an organization role.
     *
     * @async
     * @function
     * @returns {Promise<void>} A promise that resolves after the delete operation is completed.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (organizationRoleRef.current?.id && userId) {
        const { error } = await deleteOrganizationRole(
          {
            organizationId: orgId,
            id: Number(organizationRoleRef.current.id),
            updatedById: userId,
          },
          organizationRoleRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: organizationRoleRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: organizationRoleRef.current?.name,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

    if (isLoading) {
      return <Loading fullScreen size="large" />;
    }

    return (
      <>
        <div className="space-y-12">
          <InputGroup
            title={t("org_setting_role.general_title")}
            description={t("org_setting_role.general_description")}
            showBorderBottom={false}
          >
            <div className="col-span-full">
              <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-baseline">
                    <h3 className="text-sm font-medium leading-6 text-gray-900">{t("org_setting_role.list_title")}</h3>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    {t("org_setting_role.list_description")}
                  </p>
                </div>
                <div className="mt-3 flex sm:ml-4 sm:mt-0">
                  <Authorization resource="organization-role" action="new">
                    <Button icon={PlusIcon} onClick={handleModalConfirm}>
                      {t("org_setting_role.list_button_add")}
                    </Button>
                  </Authorization>
                </div>
              </div>

              <ul role="list" className="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
                {organizationRoles.map((item, index) => (
                  <li key={index} className="flex justify-between gap-x-6 py-6">
                    <div className="flex flex-col">
                      <label className="font-medium text-gray-900">{item.name}</label>
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    </div>

                    <div className="flex flex-row items-center">
                      <Authorization
                        alwaysAuthorized={canEdit() || (canEditOwn() && equalId(item.createdByUser.id, userId))}
                      >
                        <button onClick={handleOrgRoleUpdate(item)} className="h-8 w-8">
                          <PencilSquareIcon
                            title={t("org_setting_role.update_button")}
                            className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                          />
                        </button>
                      </Authorization>

                      {!item.type && (
                        <Authorization
                          alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(item.createdByUser.id, userId))}
                        >
                          <button onClick={handleDelete(item)} className="h-8 w-8">
                            <TrashIcon
                              title={t("org_setting_role.delete_button")}
                              className="h-5 w-5 text-red-400 group-hover:text-red-500"
                              aria-hidden="true"
                            />
                          </button>
                        </Authorization>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </InputGroup>
        </div>

        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: organizationRoleRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        <RoleEditModal
          orgId={orgId}
          userId={userId}
          open={updateModalOpen}
          orgRole={organizationRoleRef.current}
          onClose={handleModalCancel}
          mutate={mutate}
        />
      </>
    );
  },
  {
    resource: "organization-role",
    action: ["find"],
  }
);
