"use client";

import { CustomFieldType, Subcontractor, VehicleOwnerType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionImage,
  DescriptionProperty2,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, SystemInfoCard } from "@/components/molecules";
import { CustomFieldsDisplay } from "@/components/organisms";
import { FUEL_TYPE_OPTIONS } from "@/constants/vehicles";
import { useIdParam } from "@/hooks";
import { VehicleInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

export type VehicleDetailViewProps = {
  vehicle: VehicleInfo | undefined | null;
  subcontractor: Subcontractor | undefined | null;
  isLoading: boolean;
  orgLink?: string;
};

const VehicleDetailView = ({ vehicle, subcontractor, isLoading, orgLink }: VehicleDetailViewProps) => {
  const t = useTranslations();
  const { encryptId } = useIdParam();

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5  lg:gap-8 2xl:grid-cols-6">
      <div className="space-y-6 lg:col-span-3 2xl:col-span-4">
        <Card>
          <CardHeader title={t("vehicle.general_title")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("vehicle.owner")} loading={isLoading}>
              {vehicle?.ownerType === VehicleOwnerType.ORGANIZATION ? (
                t("vehicle.organization")
              ) : (
                <Authorization
                  resource="subcontractor"
                  action="detail"
                  fallbackComponent={<>{t("vehicle.subcontractor")}</>}
                >
                  <Link
                    useDefaultStyle
                    href={`${orgLink}/subcontractors/${encryptId(vehicle?.subcontractorId)}`}
                    emptyLabel={t("common.empty")}
                  >
                    {t("vehicle.subcontractor")}
                  </Link>
                </Authorization>
              )}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.vehicle_number")} loading={isLoading}>
              {vehicle?.vehicleNumber}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.vehicle_id_number")} loading={isLoading}>
              {vehicle?.idNumber}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.model")} loading={isLoading}>
              {vehicle?.model}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.vehicle_type")} loading={isLoading}>
              {vehicle?.type?.name}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.trailer")} loading={isLoading}>
              {vehicle?.trailer?.trailerNumber}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.color")} loading={isLoading}>
              {vehicle?.color && <div className={clsx(`bg-[${vehicle?.color}] w-full`)}>{vehicle?.color}</div>}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.year_of_manufacture")} loading={isLoading}>
              {vehicle?.yearOfManufacture}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.usage_date")} loading={isLoading}>
              <DateTimeLabel type="date" value={ensureString(vehicle?.startUsageDate)} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.brand")} loading={isLoading}>
              {vehicle?.brand}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.fuel_type")} loading={isLoading}>
              {FUEL_TYPE_OPTIONS.find((item) => {
                return item.value === vehicle?.fuelType;
              })?.label ?? ""}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.fuel_consumption")} loading={isLoading}>
              <NumberLabel
                value={vehicle?.fuelConsumption}
                unit={t("vehicle.fuel_consumption_unit")}
                showUnitWhenEmpty={false}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2
              type="image"
              label={t("vehicle.picture")}
              loading={isLoading}
              multiline
              className="[&>label]:w-full"
            >
              {vehicle?.images && vehicle.images.map((item) => <DescriptionImage key={item.id} file={item} />)}
            </DescriptionProperty2>

            <DescriptionProperty2 size="long" label={t("vehicle.description")} multiline loading={isLoading}>
              {vehicle?.description}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.status")} loading={isLoading}>
              <Badge
                label={vehicle?.isActive ? t("vehicle.status_active") : t("vehicle.status_inactive")}
                color={vehicle?.isActive ? "success" : "error"}
              />
            </DescriptionProperty2>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("vehicle.transportation_info_title")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("vehicle.length")} loading={isLoading}>
              <NumberLabel value={vehicle?.maxLength} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.width")} loading={isLoading}>
              <NumberLabel value={vehicle?.maxWidth} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.height")} loading={isLoading}>
              <NumberLabel value={vehicle?.maxHeight} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.weight_ton")} loading={isLoading}>
              <NumberLabel value={vehicle?.tonPayloadCapacity} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.weight_pallet")} loading={isLoading}>
              <NumberLabel value={vehicle?.palletCapacity} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.cube_meter")} loading={isLoading}>
              <NumberLabel value={vehicle?.cubicMeterCapacity} emptyLabel={t("common.empty")} />
            </DescriptionProperty2>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("vehicle.license_info_title")} loading={isLoading} />
          <CardContent>
            <DescriptionProperty2 label={t("vehicle.technical_safety_registration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.technicalSafetyRegistrationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.technical_safety_expiration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.technicalSafetyExpirationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2
              type="image"
              label={t("vehicle.technical_safety_certificate")}
              loading={isLoading}
              className={clsx({ "[&>label]:w-full": vehicle?.technicalSafetyCertificate?.[0]?.url })}
            >
              {vehicle?.technicalSafetyCertificate?.[0]?.url && (
                <DescriptionImage file={vehicle?.technicalSafetyCertificate?.[0]} />
              )}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.insurance_registration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.liabilityInsuranceRegistrationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.insurance_expiration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.liabilityInsuranceExpirationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2
              type="image"
              label={t("vehicle.insurance")}
              loading={isLoading}
              className={clsx({ "[&>label]:w-full": vehicle?.liabilityInsuranceCertificate?.[0]?.url })}
            >
              {vehicle?.liabilityInsuranceCertificate?.[0]?.url && (
                <DescriptionImage file={vehicle?.liabilityInsuranceCertificate?.[0]} />
              )}
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.license_registration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.registrationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2 label={t("vehicle.license_expiration_date")} loading={isLoading}>
              <DateTimeLabel
                type="date"
                value={ensureString(vehicle?.registrationExpirationDate)}
                emptyLabel={t("common.empty")}
              />
            </DescriptionProperty2>

            <DescriptionProperty2
              type="image"
              label={t("vehicle.license_certificate")}
              loading={isLoading}
              className={clsx({ "[&>label]:w-full": vehicle?.registrationCertificate?.[0]?.url })}
            >
              {vehicle?.registrationCertificate?.[0]?.url && (
                <DescriptionImage file={vehicle?.registrationCertificate?.[0]} />
              )}
            </DescriptionProperty2>
          </CardContent>
        </Card>
        <CustomFieldsDisplay loading={isLoading} meta={vehicle?.meta} type={CustomFieldType.VEHICLE} />
      </div>

      <div className="space-y-6 lg:col-span-2 2xl:col-span-2">
        {vehicle?.driver && (
          <Card>
            <CardHeader title={t("vehicle.driver_info_title")} loading={isLoading} />
            <CardContent>
              <DescriptionProperty2 label={t("vehicle.driver_name")} loading={isLoading}>
                {vehicle?.driver.publishedAt && (
                  <Authorization
                    resource="driver"
                    action="detail"
                    fallbackComponent={
                      <span>{`${ensureString(vehicle?.driver?.lastName)} ${ensureString(
                        vehicle?.driver?.firstName
                      )}`}</span>
                    }
                  >
                    <Link useDefaultStyle color="primary" href={`${orgLink}/drivers/${encryptId(vehicle?.driver.id)}/`}>
                      {ensureString(vehicle?.driver?.firstName)} {ensureString(vehicle?.driver?.lastName)}
                    </Link>
                  </Authorization>
                )}
              </DescriptionProperty2>

              <DescriptionProperty2 label={t("vehicle.driver_email")} loading={isLoading}>
                {ensureString(vehicle?.driver?.email)}
              </DescriptionProperty2>

              <DescriptionProperty2 label={t("vehicle.driver_phone")} loading={isLoading}>
                {ensureString(vehicle?.driver?.phoneNumber)}
              </DescriptionProperty2>
            </CardContent>
          </Card>
        )}

        {vehicle?.type && (
          <Card>
            <CardHeader title={t("vehicle.vehicle_type_info_title")} loading={isLoading} />
            <CardContent>
              <DescriptionProperty2 label={t("vehicle.vehicle_type_name")} loading={isLoading}>
                <Authorization resource="vehicle-type" action="detail" fallbackComponent={vehicle?.type?.name}>
                  <Link
                    useDefaultStyle
                    color="primary"
                    href={`${orgLink}/settings/vehicle-types/${encryptId(vehicle.type?.id)}/`}
                  >
                    {vehicle?.type?.name}
                  </Link>
                </Authorization>
              </DescriptionProperty2>

              <DescriptionProperty2
                count={3}
                label={t("vehicle.vehicle_type_description")}
                multiline
                loading={isLoading}
              >
                {vehicle?.type?.description}
              </DescriptionProperty2>
            </CardContent>
          </Card>
        )}

        {vehicle?.trailer && (
          <Card>
            <CardHeader title={t("vehicle.trailer_info_title")} loading={isLoading} />
            <CardContent>
              <DescriptionProperty2 label={t("vehicle.trailer_number")} loading={isLoading}>
                {vehicle?.trailer.trailerNumber}
              </DescriptionProperty2>
              <DescriptionProperty2 label={t("vehicle.trailer_id_number")} loading={isLoading}>
                {vehicle?.trailer.idNumber}
              </DescriptionProperty2>
            </CardContent>
          </Card>
        )}

        {subcontractor && (
          <Card>
            <CardHeader title={t("vehicle.subcontractor_info_title")} loading={isLoading} />
            <CardContent>
              <DescriptionProperty2 label={t("vehicle.subcontractor_name")} loading={isLoading}>
                <Authorization resource="subcontractor" action="detail" fallbackComponent={<>{subcontractor.name}</>}>
                  <Link
                    useDefaultStyle
                    href={`${orgLink}/subcontractors/${encryptId(vehicle?.subcontractorId)}`}
                    emptyLabel={t("common.empty")}
                  >
                    {subcontractor.name}
                  </Link>
                </Authorization>
              </DescriptionProperty2>

              <DescriptionProperty2 label={t("vehicle.subcontractor_email")} loading={isLoading}>
                <Link useDefaultStyle href={`mailto:${subcontractor.email}`} emptyLabel={t("common.empty")}>
                  {subcontractor.email}
                </Link>
              </DescriptionProperty2>

              <DescriptionProperty2 label={t("vehicle.subcontractor_phone")} loading={isLoading}>
                <Link useDefaultStyle href={`tel:${subcontractor.phoneNumber}`} emptyLabel={t("common.empty")}>
                  {subcontractor.phoneNumber}
                </Link>
              </DescriptionProperty2>
            </CardContent>
          </Card>
        )}

        <SystemInfoCard loading={isLoading} entity={vehicle} />
      </div>
    </div>
  );
};

export default VehicleDetailView;
