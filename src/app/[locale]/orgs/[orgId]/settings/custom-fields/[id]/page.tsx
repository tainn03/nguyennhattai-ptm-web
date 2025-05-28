"use client";

import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
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
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { CUSTOM_FIELD_DATA_TYPE, CUSTOM_FIELD_TYPE } from "@/constants/custom-fields";
import { useCustomField, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomFieldState } from "@/redux/states";
import { deleteCustomField } from "@/services/client/customField";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useCustomFieldState();
    const { setBreadcrumb } = useBreadcrumb();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("custom-field");
    const { customField, isLoading } = useCustomField({ organizationId: orgId, id: originId! });

    const customFieldTypeOptions = useMemo(
      () => CUSTOM_FIELD_TYPE.map((item) => ({ ...item, label: t(item.label) })),
      [t]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("custom_field.title"), link: `${orgLink}/settings/custom-fields${searchQueryString}` },
        {
          name: customField?.name || `${encryptedId}`,
          link: `${orgLink}/settings/custom-fields/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customField?.name, orgLink]);

    /**
     * Handles the delete button click.
     */
    const handleToggleDeleteConfirm = useCallback(() => {
      setIsDeleteConfirmOpen((prev) => !prev);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteCustomField(
          { organizationId: orgId, id: originId, updatedById: userId },
          customField?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: customField?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: customField?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/custom-fields${searchQueryString}`);
    }, [
      customField?.updatedAt,
      customField?.name,
      orgId,
      orgLink,
      originId,
      router,
      searchQueryString,
      showNotification,
      t,
      userId,
    ]);

    // Data not found
    if (!isLoading && !customField) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/custom-fields${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("custom_field.title")}
          description={t("custom_field.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="custom-field"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(customField?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleToggleDeleteConfirm}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="custom-field" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/custom-fields/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="custom-field"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(customField?.createdByUser.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/custom-fields/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex-1 space-y-6">
            <Card>
              <CardHeader loading={isLoading} title={t("custom_field.general_title")} />
              <CardContent>
                <DescriptionProperty2 size="short" label={t("custom_field.feature")} loading={isLoading}>
                  {customFieldTypeOptions.find((data) => data.value === customField?.type)?.label}
                </DescriptionProperty2>
                <DescriptionProperty2 size="short" label={t("custom_field.data_type")} loading={isLoading}>
                  {CUSTOM_FIELD_DATA_TYPE.find((item) => item.value === customField?.dataType)?.label}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("custom_field.field_name")} loading={isLoading}>
                  {customField?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("custom_field.key")} loading={isLoading}>
                  {customField?.key}
                </DescriptionProperty2>
                {customField?.dataType === CustomFieldDataType.CHOICE && (
                  <>
                    <DescriptionProperty2 size="short" label={t("custom_field.value")} loading={isLoading}>
                      {customField?.value
                        ?.split("\n")
                        .map((item, index) => (
                          <Badge
                            key={index}
                            label={item.split(",")[0]}
                            customColor={item.split(",")[1]}
                            className="ml-1"
                          />
                        ))}
                    </DescriptionProperty2>
                  </>
                )}
                <DescriptionProperty2
                  size="long"
                  count={3}
                  multiline
                  label={t("custom_field.description")}
                  loading={isLoading}
                >
                  {customField?.description}
                </DescriptionProperty2>
                <DescriptionProperty2
                  size="long"
                  count={3}
                  multiline
                  label={t("custom_field.display_order")}
                  loading={isLoading}
                >
                  {customField?.displayOrder}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("custom_field.status")} loading={isLoading}>
                  <Badge
                    label={customField?.isActive ? t("custom_field.status_active") : t("custom_field.status_inactive")}
                    color={customField?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            <Card>
              <CardHeader loading={isLoading} title={t("custom_field.validation_title")} />
              <CardContent>
                {(customField?.dataType === CustomFieldDataType.TEXT ||
                  customField?.dataType === CustomFieldDataType.NUMBER) && (
                  <>
                    <DescriptionProperty2
                      size="short"
                      label={
                        customField?.dataType === CustomFieldDataType.NUMBER
                          ? t("custom_field.min_value")
                          : t("custom_field.min_length")
                      }
                      loading={isLoading}
                    >
                      {customField?.min && <NumberLabel value={customField.min} />}
                    </DescriptionProperty2>
                    <DescriptionProperty2
                      size="short"
                      label={
                        customField?.dataType === CustomFieldDataType.NUMBER
                          ? t("custom_field.max_value")
                          : t("custom_field.max_length")
                      }
                      loading={isLoading}
                    >
                      {customField?.max && <NumberLabel value={customField.max} />}
                    </DescriptionProperty2>
                  </>
                )}

                <DescriptionProperty2 size="short" label={t("custom_field.is_required")} loading={isLoading}>
                  <Badge
                    label={customField?.isRequired ? t("custom_field.required") : t("custom_field.not_required")}
                    color={customField?.isRequired ? "info" : "warning"}
                  />
                </DescriptionProperty2>

                {customField?.type === CustomFieldType.ORDER_TRIP && (
                  <>
                    <DescriptionProperty2 size="short" label={t("custom_field.can_view_by_driver")} loading={isLoading}>
                      <Badge
                        label={
                          customField?.canViewByDriver
                            ? t("custom_field.boolean.checked")
                            : t("custom_field.boolean.un_checked")
                        }
                        color={customField?.canViewByDriver ? "info" : "warning"}
                      />
                    </DescriptionProperty2>

                    <DescriptionProperty2 size="short" label={t("custom_field.can_edit_by_driver")} loading={isLoading}>
                      <Badge
                        label={
                          customField?.canEditByDriver
                            ? t("custom_field.boolean.checked")
                            : t("custom_field.boolean.un_checked")
                        }
                        color={customField?.canEditByDriver ? "info" : "warning"}
                      />
                    </DescriptionProperty2>
                  </>
                )}

                {(customField?.dataType === CustomFieldDataType.TEXT ||
                  customField?.dataType === CustomFieldDataType.EMAIL) && (
                  <DescriptionProperty2 size="long" label={t("custom_field.regex")} loading={isLoading}>
                    {customField?.validationRegex}
                  </DescriptionProperty2>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={customField} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: customField?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleToggleDeleteConfirm}
          onCancel={handleToggleDeleteConfirm}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "custom-field",
    action: "detail",
  }
);
