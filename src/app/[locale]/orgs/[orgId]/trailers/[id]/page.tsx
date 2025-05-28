"use client";

import { CustomFieldType, TrailerOwnerType } from "@prisma/client";
import clsx from "clsx";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

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
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal, CustomFieldsDisplay } from "@/components/organisms";
import { useIdParam, usePermission, useTrailer } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useTrailerState } from "@/redux/states";
import { getPartialSubcontractor } from "@/services/client/subcontractor";
import { deleteTrailer } from "@/services/client/trailer";
import { SubcontractorInfo } from "@/types/strapi";
import { OrgPageProps, withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { encryptId } from "@/utils/security";
import { ensureString } from "@/utils/string";

export type trailerFormProps = OrgPageProps & {
  subcontractorId?: string | null;
};

export default withOrg(
  ({ orgId, orgLink, userId }: trailerFormProps) => {
    const t = useTranslations();
    const { originId, encryptedId } = useIdParam();
    const router = useRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchQueryString } = useTrailerState();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("trailer");
    const [subcontractor, setSubcontractor] = useState<SubcontractorInfo | undefined>(undefined);

    const { trailer, isLoading } = useTrailer({ organizationId: orgId, id: originId! });

    useEffect(() => {
      setBreadcrumb([
        { name: t("trailer.manage"), link: orgLink },
        { name: t("trailer.title"), link: `${orgLink}/trailers${searchQueryString}` },
        {
          name: trailer?.trailerNumber || `${encryptedId}`,
          link: `${orgLink}/trailers/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgLink, searchQueryString, trailer?.trailerNumber]);

    /**
     * Handle the click event for deleting a customer.
     * Initiates the delete action, shows a success or error notification, and redirects to the customer list page.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originId && userId) {
        const { error } = await deleteTrailer(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          trailer?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: trailer?.trailerNumber,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: trailer?.trailerNumber,
            }),
          });
        }
      }
      router.push(`${orgLink}/trailers?${searchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      trailer?.updatedAt,
      trailer?.trailerNumber,
      showNotification,
      t,
    ]);

    /**
     * Handle the click event for initiating a delete action.
     * Sets the 'isDeleteConfirmOpen' state to true to confirm the deletion.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the cancel event for deleting and closes the deletion confirmation modal.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, [setIsDeleteConfirmOpen]);

    /**
     * Fetch subcontractor information based on the trailer's subcontractorId, if available.
     */
    const fetchSubcontractorId = useCallback(async () => {
      if (trailer?.subcontractorId) {
        const result = await getPartialSubcontractor(orgId, trailer?.subcontractorId);
        if (result) {
          setSubcontractor(result);
        }
      }
    }, [orgId, trailer?.subcontractorId]);

    useEffect(() => {
      fetchSubcontractorId();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trailer?.subcontractorId]);

    // Data not found
    if (!isLoading && !trailer) {
      return <DetailDataNotFound goBackLink={`${orgLink}/subcontractors${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("trailer.title")}
          description={t("trailer.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="trailer"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(trailer?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="trailer" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/trailers/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="trailer"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(trailer?.createdByUser.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/trailers/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5 lg:flex-row lg:gap-8 2xl:grid-cols-6">
          <div className="space-y-6 lg:col-span-3 2xl:col-span-4">
            <Card>
              <CardHeader title={t("trailer.general_title")} loading={isLoading} />
              <CardContent>
                <DescriptionProperty2 label={t("trailer.owner")} loading={isLoading}>
                  {trailer?.ownerType === TrailerOwnerType.ORGANIZATION ? (
                    t("trailer.organization")
                  ) : (
                    <Authorization
                      resource="subcontractor"
                      action="detail"
                      fallbackComponent={<span>{t("trailer.subcontractor")}</span>}
                    >
                      <Link
                        useDefaultStyle
                        className="cursor-pointer"
                        href={`${orgLink}/subcontractors/${encryptId(trailer?.subcontractorId)}`}
                      >
                        {t("trailer.subcontractor")}
                      </Link>
                    </Authorization>
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.trailer_number")} loading={isLoading} size="short">
                  {trailer?.trailerNumber}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.trailer_id_number")} loading={isLoading} size="short">
                  {trailer?.idNumber}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.color")} loading={isLoading} size="short">
                  {trailer?.color && <div className={clsx(`bg-[${trailer?.color}] w-full`)}>{trailer?.color}</div>}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.year_of_manufacture")} loading={isLoading} size="short">
                  {trailer?.yearOfManufacture}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.usage_date")} loading={isLoading} size="medium">
                  <DateTimeLabel
                    value={ensureString(trailer?.startUsageDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.brand")} loading={isLoading} size="short">
                  {trailer?.brand}
                </DescriptionProperty2>

                <DescriptionProperty2
                  type="image"
                  label={t("trailer.picture")}
                  loading={isLoading}
                  count={1}
                  className={clsx({
                    "[&>label]:w-full": (trailer?.images || []).length > 0,
                  })}
                >
                  {!isEmpty(trailer?.images) &&
                    trailer?.images?.map((item) => <DescriptionImage key={item.id} file={item} />)}
                </DescriptionProperty2>

                <DescriptionProperty2 count={3} label={t("trailer.description")} multiline loading={isLoading}>
                  {trailer?.description}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.status")} loading={isLoading}>
                  <Badge
                    label={trailer?.isActive ? t("trailer.status_active") : t("trailer.status_inactive")}
                    color={trailer?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title={t("trailer.transportation_info_title")} loading={isLoading} />
              <CardContent>
                <DescriptionProperty2 label={t("trailer.length")} loading={isLoading} size="short">
                  {trailer?.maxLength && <NumberLabel value={trailer?.maxLength} />}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.width")} loading={isLoading} size="short">
                  {trailer?.maxWidth && <NumberLabel value={trailer?.maxWidth} />}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.height")} loading={isLoading} size="short">
                  {trailer?.maxHeight && <NumberLabel value={trailer?.maxHeight} />}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.weight_ton")} loading={isLoading} size="short">
                  {trailer?.tonPayloadCapacity && <NumberLabel value={trailer?.tonPayloadCapacity} />}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.weight_pallet")} loading={isLoading} size="short">
                  {trailer?.palletCapacity && <NumberLabel value={trailer?.palletCapacity} />}
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.cube_meter")} loading={isLoading} size="short">
                  {trailer?.cubicMeterCapacity && <NumberLabel value={trailer?.cubicMeterCapacity} />}
                </DescriptionProperty2>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title={t("trailer.license_info_title")} loading={isLoading} />
              <CardContent>
                <DescriptionProperty2 label={t("trailer.license_registration_date")} loading={isLoading} size="medium">
                  <DateTimeLabel
                    value={ensureString(trailer?.registrationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.license_expiration_date")} loading={isLoading} size="medium">
                  <DateTimeLabel
                    value={ensureString(trailer?.registrationExpirationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2
                  type="image"
                  label={t("trailer.license_certificate")}
                  loading={isLoading}
                  count={1}
                  className={clsx({
                    "[&>label]:w-full": trailer?.registrationCertificate?.[0]?.url,
                  })}
                >
                  {trailer?.registrationCertificate?.[0]?.url && (
                    <DescriptionImage file={trailer?.registrationCertificate?.[0]} />
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2
                  label={t("trailer.insurance_registration_date")}
                  loading={isLoading}
                  size="medium"
                >
                  <DateTimeLabel
                    value={ensureString(trailer?.liabilityInsuranceRegistrationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.insurance_expiration_date")} loading={isLoading} size="medium">
                  <DateTimeLabel
                    value={ensureString(trailer?.liabilityInsuranceExpirationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2
                  type="image"
                  label={t("trailer.insurance")}
                  loading={isLoading}
                  count={1}
                  className={clsx({
                    "[&>label]:w-full": trailer?.liabilityInsuranceCertificate?.[0]?.url,
                  })}
                >
                  {trailer?.liabilityInsuranceCertificate?.[0]?.url && (
                    <DescriptionImage file={trailer?.liabilityInsuranceCertificate?.[0]} />
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2
                  label={t("trailer.technical_safety_registration_date")}
                  loading={isLoading}
                  size="medium"
                >
                  <DateTimeLabel
                    value={ensureString(trailer?.technicalSafetyRegistrationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2 label={t("trailer.technical_safety_expiration_date")} loading={isLoading}>
                  <DateTimeLabel
                    value={ensureString(trailer?.technicalSafetyExpirationDate)}
                    type="date"
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2
                  type="image"
                  label={t("trailer.technical_safety_certificate")}
                  loading={isLoading}
                  count={1}
                  className={clsx({
                    "[&>label]:w-full": trailer?.technicalSafetyCertificate?.[0]?.url,
                  })}
                >
                  {trailer?.technicalSafetyCertificate?.[0]?.url && (
                    <DescriptionImage file={trailer?.technicalSafetyCertificate?.[0]} />
                  )}
                </DescriptionProperty2>
              </CardContent>
            </Card>

            <CustomFieldsDisplay loading={isLoading} meta={trailer?.meta} type={CustomFieldType.TRAILER} />
          </div>

          <div className="space-y-6 lg:col-span-2 2xl:col-span-2">
            {trailer?.vehicle && (
              <Card>
                <CardHeader title={t("trailer.vehicle_type_info_title")} loading={isLoading} />
                <CardContent>
                  <DescriptionProperty2 label={t("trailer.vehicle_number")} loading={isLoading} size="short">
                    <Link
                      useDefaultStyle
                      color="primary"
                      href={`${orgLink}/vehicles/${encryptId(trailer?.vehicle.id)}/`}
                    >
                      {trailer?.vehicle?.vehicleNumber}
                    </Link>
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.vehicle_id_number")} loading={isLoading} size="short">
                    {trailer?.vehicle?.idNumber}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.vehicle_type")} loading={isLoading} size="short">
                    {trailer?.vehicle?.type?.name}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.vehicle_color")} loading={isLoading} size="short">
                    {trailer.vehicle?.color && (
                      <div className={clsx(`bg-[${trailer.vehicle?.color}] w-full`)}>{trailer.vehicle?.color}</div>
                    )}
                  </DescriptionProperty2>

                  <DescriptionProperty2
                    label={t("trailer.vehicle_year_of_manufacture")}
                    loading={isLoading}
                    size="short"
                  >
                    {trailer.vehicle?.yearOfManufacture}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.vehicle_usage_date")} loading={isLoading} size="medium">
                    <DateTimeLabel
                      value={ensureString(trailer.vehicle?.startUsageDate)}
                      type="date"
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}

            {trailer?.type && (
              <Card>
                <CardHeader title={t("trailer.trailer_type_info_title")} loading={isLoading} />
                <CardContent>
                  <DescriptionProperty2 label={t("trailer.trailer_type_name")} loading={isLoading} size="short">
                    <Authorization
                      resource="trailer-type"
                      action="detail"
                      fallbackComponent={<span>{trailer?.type?.name}</span>}
                    >
                      <Link
                        useDefaultStyle={false}
                        className="text-sm font-medium leading-6 text-blue-700 hover:text-blue-600"
                        href={`${orgLink}/settings/trailer-types/${encryptId(trailer?.type.id)}/`}
                      >
                        {trailer?.type?.name}
                      </Link>
                    </Authorization>
                  </DescriptionProperty2>

                  <DescriptionProperty2
                    label={t("trailer.trailer_type_description")}
                    multiline
                    loading={isLoading}
                    count={3}
                  >
                    {trailer?.type?.description}
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}

            {subcontractor && (
              <Card>
                <CardHeader title={t("trailer.subcontractor_info_title")} loading={isLoading} />
                <CardContent>
                  <DescriptionProperty2 label={t("trailer.subcontractor_name")} loading={isLoading} size="short">
                    {subcontractor.name}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.subcontractor_email")} loading={isLoading} size="short">
                    {subcontractor.email}
                  </DescriptionProperty2>

                  <DescriptionProperty2 label={t("trailer.subcontractor_phone")} loading={isLoading} size="short">
                    {subcontractor.phoneNumber}
                  </DescriptionProperty2>
                </CardContent>
              </Card>
            )}

            <SystemInfoCard loading={isLoading} entity={trailer} />
          </div>
        </div>

        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: trailer?.trailerNumber })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "trailer",
    action: "detail",
  }
);
