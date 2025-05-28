"use client";

import { CustomFieldType, DriverContractType, Gender } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionImage,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, ProfileInfo, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal, CustomFieldsDisplay } from "@/components/organisms";
import { useDriver, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverState } from "@/redux/states";
import { deleteDriver } from "@/services/client/driver";
import { getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString, getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId, encryptId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useDriverState();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("driver");

    const { driver, addressInfo, bankAccount, isLoading } = useDriver({
      organizationId: orgId,
      id: originId!,
    });

    const fullName = useMemo(
      () => getFullName(driver?.firstName, driver?.lastName),
      [driver?.firstName, driver?.lastName]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("driver.manage"), link: orgLink },
        { name: t("driver.title"), link: `${orgLink}/drivers${searchQueryString}` },
        {
          name: fullName || `${encryptedId}`,
          link: `${orgLink}/drivers/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullName, orgLink]);

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
        const { error } = await deleteDriver(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          driver.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: fullName,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: fullName,
            }),
          });
        }
      }

      router.push(`${orgLink}/drivers${searchQueryString}`);
    }, [originId, userId, router, orgLink, searchQueryString, orgId, driver.updatedAt, showNotification, t, fullName]);

    // Data not found
    if (!isLoading && !driver) {
      return <DetailDataNotFound goBackLink={`${orgLink}/drivers${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("driver.title")}
          description={t("driver.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="driver"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(driver?.createdByUser?.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="driver" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/drivers/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="driver"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(driver?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/drivers/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />
        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8 xl:flex-row">
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 2xl:grid-cols-6">
              {/* General */}
              <Card className="col-span-full">
                <CardHeader loading={isLoading} title={t("driver.general_title")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver.name")} loading={isLoading}>
                    {fullName}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.date_of_birth")} size="short" loading={isLoading}>
                    <DateTimeLabel
                      value={ensureString(driver?.dateOfBirth)}
                      type="date"
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.gender")} size="short" loading={isLoading}>
                    {driver.gender === Gender.MALE && t("driver.gender_male")}
                    {driver.gender === Gender.FEMALE && t("driver.gender_female")}
                    {driver.gender === Gender.UNKNOWN && t("driver.gender_unknown")}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.id_number")} loading={isLoading}>
                    {driver.idNumber}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.issue_date")} size="short" loading={isLoading}>
                    <DateTimeLabel
                      value={ensureString(driver?.idIssueDate)}
                      type="date"
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.place_of_issue")} size="short" loading={isLoading}>
                    {driver.idIssuedBy}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.experience")} size="short" loading={isLoading}>
                    {driver.experienceYears}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.email")} loading={isLoading}>
                    {driver.email}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.phone")} loading={isLoading}>
                    {driver.phoneNumber}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.address")} size="long" loading={isLoading}>
                    {getDetailAddress(addressInfo)}
                  </DescriptionProperty2>
                  <DescriptionProperty2 count={3} multiline label={t("driver.description")} loading={isLoading}>
                    {driver.description}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.status")} loading={isLoading}>
                    <Badge
                      label={driver.isActive ? t("driver.status_active") : t("driver.status_inactive")}
                      color={driver.isActive ? "success" : "error"}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.is_owned_by_subcontractor.belong_to")} loading={isLoading}>
                    {driver.isOwnedBySubcontractor
                      ? t("driver.is_owned_by_subcontractor.subcontractor")
                      : t("driver.is_owned_by_subcontractor.organization")}
                  </DescriptionProperty2>
                </CardContent>
              </Card>

              {/* Bank account */}
              <Card className="2xl:col-span-3">
                <CardHeader loading={isLoading} title={t("driver.bank_account_info_title")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver.account_number")} size="short" loading={isLoading}>
                    {bankAccount?.accountNumber}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.holder_name")} loading={isLoading}>
                    {bankAccount?.holderName}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.bank_name")} loading={isLoading}>
                    {bankAccount?.bankName}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.branch")} size="long" loading={isLoading}>
                    {bankAccount?.bankBranch}
                  </DescriptionProperty2>
                </CardContent>
              </Card>

              {/* Contract */}
              <Card className="2xl:col-span-3">
                <CardHeader loading={isLoading} title={t("driver.contract_title")} />
                <CardContent>
                  <DescriptionProperty2 label={t("driver.basic_salary")} size="short" loading={isLoading}>
                    <NumberLabel value={driver?.basicSalary} type="currency" emptyLabel={t("common.empty")} />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.union_dues")} size="short" loading={isLoading}>
                    <NumberLabel value={driver?.unionDues} type="currency" emptyLabel={t("common.empty")} />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.security_deposit")} size="short" loading={isLoading}>
                    <NumberLabel value={driver?.securityDeposit} type="currency" emptyLabel={t("common.empty")} />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.contract_license_type")} loading={isLoading}>
                    {driver?.contractType === DriverContractType.FIXED_TERM && t("driver.fixed_term_contract")}
                    {driver?.contractType === DriverContractType.PERMANENT && t("driver.permanent_contract")}
                  </DescriptionProperty2>
                  <DescriptionProperty2
                    label={t("driver.contract_license_start_date")}
                    size="short"
                    loading={isLoading}
                  >
                    <DateTimeLabel
                      value={ensureString(driver?.contractStartDate)}
                      type="date"
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("driver.contract_license_end_date")} size="short" loading={isLoading}>
                    <DateTimeLabel
                      value={ensureString(driver?.contractEndDate)}
                      type="date"
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2
                    type="image"
                    label={t("driver.contract")}
                    loading={isLoading}
                    className={clsx({
                      "[&>label]:w-full": driver?.contractDocuments && driver?.contractDocuments?.[0],
                    })}
                  >
                    <DescriptionImage file={driver?.contractDocuments?.[0]} />
                  </DescriptionProperty2>
                </CardContent>
              </Card>

              <CustomFieldsDisplay loading={isLoading} meta={driver?.meta} type={CustomFieldType.DRIVER} />
            </div>
          </div>

          <div className="w-full space-y-4 sm:space-y-6 lg:max-w-xs lg:space-y-8 xl:max-w-sm">
            {/* Vehicle */}
            {driver?.vehicle && (
              <Card>
                <CardHeader loading={isLoading} title={t("driver.vehicle_title")} />
                <CardContent>
                  <DescriptionProperty2 loading={isLoading} label={t("driver.vehicle")} size="short">
                    <Authorization
                      resource="vehicle"
                      action="detail"
                      fallbackComponent={
                        <div>
                          {driver.vehicle?.vehicleNumber}
                          {driver.vehicle?.idNumber && ` (${driver.vehicle?.idNumber})`}
                        </div>
                      }
                    >
                      <Link
                        useDefaultStyle
                        href={`${orgLink}/vehicles/${encryptId(driver.vehicle?.id)}`}
                        emptyLabel={t("common.empty")}
                      >
                        {driver.vehicle?.vehicleNumber}
                        {driver.vehicle?.idNumber && ` (${driver.vehicle?.idNumber})`}
                      </Link>
                    </Authorization>
                  </DescriptionProperty2>
                  <DescriptionProperty2 loading={isLoading} label={t("driver.trailer")} size="short">
                    <Authorization
                      resource="trailer"
                      action="detail"
                      fallbackComponent={<div>{driver.vehicle?.trailer?.trailerNumber}</div>}
                    >
                      <Link
                        useDefaultStyle
                        href={`${orgLink}/trailers/${encryptId(driver.vehicle?.trailer?.id)}`}
                        emptyLabel={t("common.empty")}
                      >
                        {driver.vehicle?.trailer?.trailerNumber}
                      </Link>
                    </Authorization>
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}

            {/* Driver's license */}
            <Card>
              <CardHeader loading={isLoading} title={t("driver.driver_license_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("driver.level")} size="short" loading={isLoading}>
                  {driver.licenseType?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver.driver_license_number")} loading={isLoading}>
                  {driver.licenseNumber}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver.driver_license_issue_date")} size="short" loading={isLoading}>
                  <DateTimeLabel
                    value={ensureString(driver?.licenseIssueDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("driver.driver_license_expiry_date")} size="short" loading={isLoading}>
                  <DateTimeLabel
                    value={ensureString(driver?.licenseExpiryDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2
                  label={t("driver.front")}
                  type="image"
                  count={1}
                  loading={isLoading}
                  className={clsx({ "[&>label]:w-full": driver?.licenseFrontImage })}
                >
                  <DescriptionImage file={driver?.licenseFrontImage} />
                </DescriptionProperty2>
                <DescriptionProperty2
                  label={t("driver.back")}
                  type="image"
                  count={1}
                  loading={isLoading}
                  className={clsx({ "[&>label]:w-full": driver?.licenseBackImage })}
                >
                  <DescriptionImage file={driver?.licenseBackImage} />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* Account */}
            {driver?.user && (
              <Card>
                <CardHeader loading={isLoading} title={t("driver.account_info")} />
                <CardContent>
                  <DescriptionProperty2 className="!gap-x-0" colons={false} type="profile" loading={isLoading}>
                    <ProfileInfo user={driver.user} description={driver?.user?.phoneNumber} />
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}

            {/* System info */}
            <SystemInfoCard loading={isLoading} entity={driver} />
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
    resource: "driver",
    action: "detail",
  }
);
