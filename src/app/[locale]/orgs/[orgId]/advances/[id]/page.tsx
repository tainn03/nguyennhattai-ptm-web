"use client";

import { CheckCircleIcon, HandRaisedIcon } from "@heroicons/react/24/outline";
import { AdvanceAdvanceType, AdvanceStatus, AdvanceType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { ADVANCE_STATUS } from "@/constants/advance";
import { useAdvance, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useAdvanceState } from "@/redux/states";
import { deleteAdvance } from "@/services/client/advance";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId, formatCurrency } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { AdvanceConfirmModal, AdvanceRejectModal } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId, encryptId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useAdvanceState();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("advance");
    const { advance, isLoading, mutate } = useAdvance({ organizationId: orgId, id: originId! });
    const advanceAmount = useMemo(() => formatCurrency(ensureString(advance?.amount)), [advance]);

    const borrower = useMemo(() => {
      return advance?.type === AdvanceType.DRIVER
        ? { ...advance?.driver, name: getFullName(advance.driver?.firstName, advance.driver?.lastName) }
        : advance?.subcontractor;
    }, [advance]);

    const borrowerName = useMemo(() => {
      return advance?.type === AdvanceType.DRIVER
        ? getFullName(advance.driver?.firstName, advance.driver?.lastName)
        : advance?.subcontractor?.name;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [borrower]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("advance.management"), link: orgLink },
        { name: t("advance.title"), link: `${orgLink}/advances${searchQueryString}` },
        {
          name: borrowerName || ensureString(encryptedId),
          link: `${orgLink}/advances/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgLink, borrower]);

    /**
     * Handles the toggling of the delete confirmation dialog.
     */
    const handleToggleDeleteModal = useCallback(() => {
      setIsDeleteConfirmOpen((prev) => !prev);
    }, []);

    /**
     * Handles the toggling of the confirmation dialog.
     */
    const handleToggleConfirmModal = useCallback(() => {
      setIsConfirmOpen((prev) => !prev);
    }, []);

    /**
     * Handles the confirmation of the advance.
     * Sends a request, and displays a notification based on the result.
     */
    const handleAdvanceConfirm = useCallback(() => {
      setIsConfirmOpen(false);
      mutate();
    }, [mutate]);

    /**
     * Handles the toggling of the rejection dialog.
     */
    const handleToggleRejectModal = useCallback(() => {
      setIsRejectOpen((prev) => !prev);
    }, []);

    /**
     * Handles the confirmation of the rejection.
     * Sends a request, and displays a notification based on the result.
     */
    const handleAdvanceReject = useCallback(() => {
      setIsRejectOpen(false);
      mutate();
    }, [mutate]);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteAdvance(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          advance?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: t("advance.display_name_amount", {
                amount: advanceAmount,
                name: borrower?.name,
              }),
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: t("advance.display_name_amount", {
                amount: advanceAmount,
                name: borrower?.name,
              }),
            }),
          });
        }
      }
      router.push(`${orgLink}/advances${searchQueryString}`);
    }, [
      advance?.updatedAt,
      advanceAmount,
      borrower?.name,
      originId,
      orgId,
      orgLink,
      router,
      searchQueryString,
      showNotification,
      userId,
      t,
    ]);

    // Data not found
    if (!isLoading && !advance) {
      return <DetailDataNotFound goBackLink={`${orgLink}/advances${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("advance.title")}
          description={t("advance.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {(advance?.status === AdvanceStatus.PENDING || advance?.status === AdvanceStatus.ACCEPTED) && (
                <>
                  <Authorization resource="advance" action="pay">
                    <Button
                      disabled={isLoading}
                      type="button"
                      icon={CheckCircleIcon}
                      color="success"
                      onClick={handleToggleConfirmModal}
                    >
                      {t("advance.pay")}
                    </Button>
                  </Authorization>
                  <Authorization resource="advance" action="reject">
                    <Button
                      disabled={isLoading}
                      type="button"
                      icon={HandRaisedIcon}
                      variant="outlined"
                      color="error"
                      onClick={handleToggleRejectModal}
                    >
                      {t("advance.status_rejected")}
                    </Button>
                  </Authorization>
                </>
              )}

              {/* Delete */}
              <Authorization
                resource="advance"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(advance?.createdByUser?.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleToggleDeleteModal}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="advance" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/advances/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="advance"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(advance?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/advances/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />
        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex-1">
            <Card>
              <CardHeader
                loading={isLoading}
                title={t("advance.general_title")}
                description={t("advance.general_description")}
              />
              <CardContent>
                <DescriptionProperty2 label={t("advance.name")} loading={isLoading}>
                  {advance?.type === AdvanceType.DRIVER ? t("advance.driver") : t("advance.subcontractor")}
                </DescriptionProperty2>
                <DescriptionProperty2
                  label={advance?.type === AdvanceType.DRIVER ? t("advance.driver") : t("advance.subcontractor")}
                  loading={isLoading}
                >
                  <Authorization
                    resource={advance?.type === AdvanceType.DRIVER ? "driver" : "subcontractor"}
                    action="detail"
                    fallbackComponent={borrower?.name}
                  >
                    <Link
                      useDefaultStyle
                      href={`${orgLink}/${
                        advance?.type === AdvanceType.DRIVER ? "drivers" : "subcontractors"
                      }/${encryptId(borrower?.id)}`}
                    >
                      {borrower?.name}
                    </Link>
                  </Authorization>
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("advance.email")} loading={isLoading}>
                  <Link useDefaultStyle href={`mailto:${borrower?.email}`} emptyLabel={t("common.empty")}>
                    {borrower?.email}
                  </Link>
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("advance.phone_number")} loading={isLoading}>
                  <Link useDefaultStyle href={`tel:${borrower?.phoneNumber}`} emptyLabel={t("common.empty")}>
                    {borrower?.phoneNumber}
                  </Link>
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("advance.advance_type")} loading={isLoading}>
                  {advance?.advanceType === AdvanceAdvanceType.COST ? t("advance.cost") : t("advance.salary")}
                </DescriptionProperty2>
                {advance?.advanceType === AdvanceAdvanceType.COST && (
                  <DescriptionProperty2 label={t("advance.order_trip")} loading={isLoading}>
                    {advance?.orderTrip?.code}
                  </DescriptionProperty2>
                )}
                <DescriptionProperty2 label={t("advance.amount")} loading={isLoading}>
                  <NumberLabel value={advance?.amount} type="currency" emptyLabel={t("common.empty")} />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("advance.approved_amount")} loading={isLoading}>
                  <NumberLabel value={advance?.approvedAmount} type="currency" emptyLabel={t("common.empty")} />
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("advance.advance_note")} loading={isLoading}>
                  {advance?.reason}
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          <div className="flex w-full flex-col gap-5 lg:max-w-xs xl:max-w-sm">
            <Card>
              <CardHeader
                loading={isLoading}
                title={t("advance.advance_status_title")}
                description={t("advance.advance_status_description")}
              />
              <CardContent>
                <DescriptionProperty2 label={t("advance.status")} loading={isLoading}>
                  {advance && (
                    <Badge
                      label={t(ADVANCE_STATUS[advance.status].label)}
                      color={ADVANCE_STATUS[advance.status].color}
                    />
                  )}
                </DescriptionProperty2>

                {advance?.status === AdvanceStatus.REJECTED && (
                  <>
                    <DescriptionProperty2 label={t("advance.reject_date")} loading={isLoading}>
                      <DateTimeLabel value={ensureString(advance?.rejectionDate)} type="date" />
                    </DescriptionProperty2>
                    <DescriptionProperty2 count={3} multiline label={t("advance.reason_reject")} loading={isLoading}>
                      {advance?.rejectionReason}
                    </DescriptionProperty2>
                  </>
                )}

                {advance?.status === AdvanceStatus.PAYMENT && (
                  <>
                    <DescriptionProperty2 label={t("advance.payment_by")} loading={isLoading}>
                      {getAccountInfo(advance?.paymentBy).displayName}
                    </DescriptionProperty2>
                    <DescriptionProperty2 label={t("advance.payment_date")} loading={isLoading}>
                      <DateTimeLabel value={ensureString(advance?.paymentDate)} type="date" />
                    </DescriptionProperty2>
                  </>
                )}

                <DescriptionProperty2 count={3} multiline label={t("advance.payment_note")} loading={isLoading}>
                  {advance?.description}
                </DescriptionProperty2>
              </CardContent>
            </Card>
            <SystemInfoCard loading={isLoading} entity={advance} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", {
            name: t("advance.display_name_amount", {
              amount: advanceAmount,
              name: borrower?.name,
            }),
          })}
          message={t("common.confirmation.delete_message")}
          onClose={handleToggleDeleteModal}
          onCancel={handleToggleDeleteModal}
          onConfirm={handleDeleteConfirm}
        />

        {advance?.id && (
          <>
            <AdvanceConfirmModal
              open={isConfirmOpen}
              id={Number(advance.id)}
              borrower={ensureString(borrowerName)}
              amount={advance?.amount}
              lastUpdatedAt={advance?.updatedAt}
              onConfirm={handleAdvanceConfirm}
              onClose={handleToggleConfirmModal}
            />
            <AdvanceRejectModal
              open={isRejectOpen}
              id={Number(advance.id)}
              borrower={ensureString(borrowerName)}
              amount={advance?.amount}
              lastUpdatedAt={advance?.updatedAt}
              onReject={handleAdvanceReject}
              onClose={handleToggleRejectModal}
            />
          </>
        )}
      </>
    );
  },
  {
    resource: "advance",
    action: "detail",
  }
);
