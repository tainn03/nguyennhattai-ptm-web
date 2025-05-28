"use client";

import { OrganizationRoleType } from "@prisma/client";
import isObject from "lodash/isObject";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useDriverByOrganizationMember, useIdParam, useOrganizationMember, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useOrganizationMembersState } from "@/redux/states";
import { deleteOrganizationMember } from "@/services/client/organizationMember";
import { AnyObject } from "@/types";
import { LocaleType } from "@/types/locale";
import { getFullName, isOrganizationOwner as checkIsOrganizationOwner } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ org, orgId, orgLink, user, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { searchQueryString } = useOrganizationMembersState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDelete, canDeleteOwn } = usePermission("organization-member");

    const { organizationMember, isLoading } = useOrganizationMember({
      organization: {
        id: orgId,
      },
      id: originId!,
    });

    const { driver } = useDriverByOrganizationMember({
      member: { id: Number(organizationMember?.member.id) },
      organization: { id: orgId },
    });

    const fullName = useMemo(
      () =>
        getFullName(
          organizationMember?.member.detail?.firstName,
          organizationMember?.member.detail?.lastName,
          user.setting.locale as LocaleType
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [organizationMember]
    );

    const driverDeviceInfo = useMemo(() => {
      if (organizationMember?.role?.type !== OrganizationRoleType.DRIVER) {
        return null;
      }
      const lastDevice = ((organizationMember?.member?.setting?.messageTokens as []) || [])
        .filter((item) => isObject(item))
        .pop() as AnyObject | undefined;

      return lastDevice;
    }, [organizationMember?.member?.setting?.messageTokens, organizationMember?.role?.type]);

    /**
     * Checks if the provided organization member is the owner of the organization.
     *
     * @returns {boolean} - `true` if the organization member is the owner; otherwise, `false`.
     */
    const isOrganizationOwner = useMemo(
      () => checkIsOrganizationOwner(org, organizationMember?.member),
      [org, organizationMember?.member]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_member.title"), link: `${orgLink}/settings/members${searchQueryString}` },
        {
          name: fullName || organizationMember?.username || `${encryptedId}`,
          link: `${orgLink}/settings/members/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationMember?.username, orgLink]);

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
        const isDeleteSuccess = await deleteOrganizationMember(originId, userId);
        if (isDeleteSuccess) {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: fullName,
            }),
          });
        } else {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: fullName,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/members${searchQueryString}`);
    }, [orgLink, originId, router, searchQueryString, showNotification, t, userId, fullName]);

    // Data not found
    if (!isLoading && !organizationMember) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/members${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("org_setting_member.title")}
          description={t("org_setting_member.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              {!equalId(organizationMember?.member.id, userId) && (
                <Authorization
                  resource="organization-member"
                  alwaysAuthorized={
                    !isOrganizationOwner &&
                    (canDelete() || (canDeleteOwn() && equalId(organizationMember?.createdByUser?.id, userId)))
                  }
                >
                  <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                    {t("common.delete")}
                  </Button>
                </Authorization>
              )}

              {/* Edit */}
              <Authorization
                resource="organization-member"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(organizationMember?.createdByUser.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/members/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          <div className="flex-1 space-y-6">
            {/* Account information */}
            <Card>
              <CardHeader loading={isLoading} title={t("org_setting_member.account_info_title")} />
              <CardContent>
                <DescriptionProperty2 size="medium" label={t("org_setting_member.full_name")} loading={isLoading}>
                  {fullName}
                </DescriptionProperty2>
                <DescriptionProperty2 size="short" label={t("org_setting_member.username")} loading={isLoading}>
                  {isOrganizationOwner
                    ? organizationMember?.username || organizationMember?.member.username
                    : organizationMember?.username}
                </DescriptionProperty2>
                <DescriptionProperty2 size="medium" label={t("org_setting_member.email")} loading={isLoading}>
                  {isOrganizationOwner
                    ? organizationMember?.email || organizationMember?.member.email
                    : organizationMember?.email}
                </DescriptionProperty2>
                <DescriptionProperty2 size="short" label={t("org_setting_member.role")} loading={isLoading}>
                  {isOrganizationOwner ? t("org_setting_member.owner") : organizationMember?.role?.name}
                </DescriptionProperty2>
                <DescriptionProperty2
                  count={3}
                  multiline
                  size="long"
                  label={t("org_setting_member.description")}
                  loading={isLoading}
                >
                  {organizationMember?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 size="short" label={t("org_setting_member.status")} loading={isLoading}>
                  <Badge
                    label={
                      organizationMember?.isActive
                        ? t("org_setting_member.status_active")
                        : t("org_setting_member.status_inactive")
                    }
                    color={organizationMember?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* Contact information */}
            <Card>
              <CardHeader loading={isLoading} title={t("org_setting_member.contact_title")} />
              <CardContent>
                <DescriptionProperty2 size="short" label={t("org_setting_member.phone_number")} loading={isLoading}>
                  {isOrganizationOwner
                    ? organizationMember?.phoneNumber || organizationMember?.member.phoneNumber
                    : organizationMember?.phoneNumber}
                </DescriptionProperty2>
                <DescriptionProperty2 size="long" label={t("org_setting_member.address")} loading={isLoading}>
                  {getDetailAddress(organizationMember?.member.detail?.address)}
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <div className="flex-1 space-y-6">
              <SystemInfoCard loading={isLoading} entity={organizationMember} />

              {/* Driver */}
              {driver && (
                <Card>
                  <CardHeader loading={isLoading} title={t("org_setting_member.driver_info_title")} />
                  <CardContent>
                    <DescriptionProperty2
                      label={t("org_setting_member.full_name")}
                      loading={isLoading}
                      showEmptyContent={false}
                    >
                      {getFullName(driver.firstName, driver.lastName)}
                    </DescriptionProperty2>
                    <DescriptionProperty2
                      label={t("org_setting_member.driver_id_number")}
                      loading={isLoading}
                      showEmptyContent={false}
                    >
                      {driver.idNumber}
                    </DescriptionProperty2>
                    <DescriptionProperty2
                      label={t("org_setting_member.driver_vehicle_number")}
                      loading={isLoading}
                      showEmptyContent={false}
                    >
                      {driver.vehicle?.vehicleNumber}
                    </DescriptionProperty2>
                  </CardContent>
                </Card>
              )}

              {/* Device */}
              {driverDeviceInfo && (
                <Card>
                  <CardHeader loading={isLoading} title={t("org_setting_member.device_title")} />
                  <CardContent>
                    <DescriptionProperty2
                      label={t("org_setting_member.device_id")}
                      loading={isLoading}
                      showEmptyContent={false}
                    >
                      {[driverDeviceInfo?.model, driverDeviceInfo?.appVersion].filter(Boolean).join(", ")}
                    </DescriptionProperty2>
                    <DescriptionProperty2
                      label={t("org_setting_member.os_info")}
                      loading={isLoading}
                      showEmptyContent={false}
                    >
                      {[driverDeviceInfo?.platform, driverDeviceInfo?.osVersion].filter(Boolean).join(", ")}
                    </DescriptionProperty2>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: fullName })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "organization-member",
    action: "detail",
  }
);
