"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  InfoBox,
  Link,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useCustomerGroup, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useCustomerGroupState } from "@/redux/states";
import { deleteCustomerGroup, updateCustomerListInCustomerGroup } from "@/services/client/customerGroup";
import { ErrorType } from "@/types";
import { CustomerInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { CustomerGroupModal } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId, encryptId } = useIdParam();
    const { searchQueryString } = useCustomerGroupState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleteCustomerConfirmOpen, setIsDeleteCustomerConfirmOpen] = useState(false);
    const [isCustomerGroupOpen, setIsCustomerGroupOpen] = useState(false);
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("customer-group");
    const selectedCustomerRef = useRef<Partial<CustomerInfo>>();

    const { customerGroup, isLoading, mutate } = useCustomerGroup({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("customer_group.title"), link: `${orgLink}/customer-groups${searchQueryString}` },
        {
          name: customerGroup?.name || `${encryptedId}`,
          link: `${orgLink}/customer-groups/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerGroup?.name, orgLink]);

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
        const { error } = await deleteCustomerGroup(
          {
            id: originId,
            organizationId: orgId,
            updatedById: userId,
          },
          customerGroup?.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: customerGroup?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: customerGroup?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: customerGroup?.name,
            }),
          });
        }
      }
      router.push(`${orgLink}/customer-groups${searchQueryString}`);
    }, [
      customerGroup?.updatedAt,
      customerGroup?.name,
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      showNotification,
      t,
    ]);

    /**
     * Checks if the customer group has vehicles.
     * Returns true if the customer group exists and contains at least one customer, otherwise returns false.
     */
    const hasCustomers = useMemo(() => customerGroup?.customers && customerGroup.customers.length > 0, [customerGroup]);

    /**
     * This function handles the event to open the delete customer confirmation modal.
     * @param {Partial<VehicleInfo>} item - The customer to be deleted.
     * @returns {function} - A function that sets the selected customer and opens the modal.
     */
    const handleOpenDeleteCustomerConfirmModal = useCallback(
      (item: Partial<CustomerInfo>) => () => {
        selectedCustomerRef.current = item;
        setIsDeleteCustomerConfirmOpen(true);
      },
      []
    );

    /**
     * Handles closing the delete customer confirmation modal.
     * It clears the selected customer reference and closes the modal.
     */
    const handleCloseDeleteCustomerConfirmModal = useCallback(() => {
      setIsDeleteCustomerConfirmOpen(false);
      selectedCustomerRef.current = undefined;
    }, []);

    /**
     * Handles the removal of a customer from the customer group.
     * This function removes the selected customer from the customer group and updates the list of vehicles.
     */
    const handleConfirmDeleteCustomer = useCallback(async () => {
      // Get the ID of the selected customer
      const id = Number(selectedCustomerRef.current?.id);

      // Filter out the selected customer from the list of vehicles in the customer group
      const customers = customerGroup?.customers.filter((item) => !equalId(id, item.id)) || [];

      // If the vehicle ID exists
      if (id) {
        // Update the list of vehicles in the vehicle group
        const result = await updateCustomerListInCustomerGroup(
          {
            id: Number(customerGroup?.id),
            updatedById: userId,
            organizationId: orgId,
            customers,
          },
          customerGroup?.updatedAt
        );

        // If there's an error during the update
        if (result.error) {
          // Handle different error types
          let message = "";
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: selectedCustomerRef.current?.name });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.delete_error_unknown", { name: selectedCustomerRef.current?.name });
              break;
            default:
              break;
          }

          // Show an error notification
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message,
          });
        } else {
          // Show a success notification and refresh the customer group data
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedCustomerRef.current?.name,
            }),
          });
          mutate(); // Refresh the data by refetching
        }
      }

      // Reset the selected vehicle and close the confirmation modal
      selectedCustomerRef.current = undefined;
      setIsDeleteCustomerConfirmOpen(false);
    }, [
      mutate,
      orgId,
      showNotification,
      t,
      userId,
      customerGroup?.id,
      customerGroup?.updatedAt,
      customerGroup?.customers,
    ]);

    /**
     * Handles opening the customer modal.
     * This function sets the state to open the customer modal.
     */
    const handleOpenCustomersModal = useCallback(() => {
      setIsCustomerGroupOpen(true);
    }, []);

    /**
     * Handles closing the customer modal.
     * This function sets the state to close the customer modal.
     */
    const handleCloseCustomersModal = useCallback(() => {
      setIsCustomerGroupOpen(false);
    }, []);

    /**
     * Handles submitting the customer modal.
     * This function refreshes the data by refetching.
     */
    const handleSubmitCustomersModal = useCallback(() => {
      mutate();
    }, [mutate]);

    // Data not found
    if (!isLoading && isEmpty(customerGroup)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/customer-groups${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("customer_group.title")}
          description={t("customer_group.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="customer-group"
                action="delete"
                alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(customerGroup?.createdByUser?.id, userId))}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="customer-group" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/customer-groups/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="customer-group"
                action="edit"
                alwaysAuthorized={canEdit() || (canEditOwn() && equalId(customerGroup?.createdByUser?.id, userId))}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/customer-groups/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader loading={isLoading} title={t("customer_group.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("customer_group.name")} loading={isLoading}>
                  {customerGroup?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("customer_group.description")} loading={isLoading}>
                  {customerGroup?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer_group.manager")} loading={isLoading}>
                  {getAccountInfo(customerGroup?.manager?.member).displayName}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer_group.phone_number")} loading={isLoading}>
                  {ensureString(customerGroup?.manager?.phoneNumber)}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer_group.status")} loading={isLoading}>
                  <Badge
                    label={
                      customerGroup?.isActive ? t("customer_group.status_active") : t("customer_group.status_inactive")
                    }
                    color={customerGroup?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={customerGroup} />
          </div>
        </div>
        <Card className="mt-4 sm:mt-6 lg:mt-8 lg:flex-row">
          <CardHeader
            loading={isLoading}
            title={t("customer_group.customers_title")}
            actionComponent={
              <Authorization
                resource="customer-group"
                action="edit"
                alwaysAuthorized={canEdit() || (canEditOwn() && equalId(customerGroup?.createdByUser?.id, userId))}
              >
                <Button
                  size="small"
                  disabled={isLoading}
                  variant="outlined"
                  onClick={handleOpenCustomersModal}
                  icon={PlusIcon}
                >
                  {t("customer_group.add_customer")}
                </Button>
              </Authorization>
            }
          />
          <CardContent padding={isLoading}>
            <TableContainer variant="paper" inside>
              <Table dense={!isLoading}>
                <TableHead uppercase>
                  <TableRow>
                    <TableCell>{t("customer_group.customer")}</TableCell>
                    <TableCell>{t("customer.email")}</TableCell>
                    <TableCell>{t("customer.phone_number")}</TableCell>
                    <TableCell>{t("customer.representative")}</TableCell>
                    <TableCell>
                      <span className="sr-only">{t("common.actions")}</span>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {isLoading && !hasCustomers && <SkeletonTableRow rows={7} columns={5} />}

                  {!isLoading && !hasCustomers && (
                    <TableRow hover={false}>
                      <TableCell colSpan={5}>
                        <EmptyListSection
                          description={t("customer_group.empty_list")}
                          actionLabel={t("customer_group.add_customer")}
                          onClick={
                            isLoading ||
                            !(canEdit() || (canEditOwn() && equalId(customerGroup?.createdByUser?.id, userId)))
                              ? undefined
                              : handleOpenCustomersModal
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {(customerGroup?.customers || []).map((item) => {
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Authorization
                            resource="customer"
                            action="detail"
                            fallbackComponent={<InfoBox label={item.code} subLabel={item.name} />}
                          >
                            <InfoBox
                              as={Link}
                              href={`${orgLink}/customers/${encryptId(item.id)}`}
                              label={item.code}
                              subLabel={item.name}
                            />
                          </Authorization>
                        </TableCell>
                        <TableCell>{item.email || t("common.empty")}</TableCell>
                        <TableCell>{item.phoneNumber || t("common.empty")}</TableCell>
                        <TableCell>{item.contactName || t("common.empty")}</TableCell>
                        <TableCell align="right" className="space-x-2 !pr-4">
                          <Authorization
                            resource="customer-group"
                            action="edit"
                            alwaysAuthorized={
                              canEdit() || (canEditOwn() && equalId(customerGroup?.createdByUser?.id, userId))
                            }
                          >
                            <button
                              type="button"
                              data-tooltip-id="tooltip"
                              data-tooltip-content={t("common.delete")}
                              onClick={handleOpenDeleteCustomerConfirmModal(item)}
                            >
                              <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                            </button>
                          </Authorization>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        {/* Delete group confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: customerGroup?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        {/* Delete customer confirmation dialog */}
        <ConfirmModal
          open={isDeleteCustomerConfirmOpen}
          icon="question"
          title={t("common.confirmation.delete_title", { name: selectedCustomerRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleCloseDeleteCustomerConfirmModal}
          onCancel={handleCloseDeleteCustomerConfirmModal}
          onConfirm={handleConfirmDeleteCustomer}
        />
        {customerGroup && (
          <CustomerGroupModal
            open={isCustomerGroupOpen}
            customerGroup={customerGroup}
            onClose={handleCloseCustomersModal}
            onSubmit={handleSubmitCustomersModal}
          />
        )}
      </>
    );
  },
  {
    resource: "customer-group",
    action: "detail",
  }
);
