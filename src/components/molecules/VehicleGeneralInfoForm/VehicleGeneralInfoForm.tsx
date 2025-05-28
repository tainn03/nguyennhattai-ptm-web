"use client";

import { VehicleOwnerType } from "@prisma/client";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { Combobox, DatePicker, NumberField, RadioGroup, Select, TextField, UploadInput } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { SelectItem } from "@/components/molecules/Select/Select";
import { NewSubcontractorModal, NewTrailerModal, NewVehicleTypeModal } from "@/components/organisms";
import { FUEL_TYPE_OPTIONS } from "@/constants/vehicles";
import { VehicleInputForm } from "@/forms/vehicle";
import { usePermission, useSubcontractorOptions, useTrailerOptions, useVehicleTypeOptions } from "@/hooks";
import { UploadInputValue } from "@/types/file";
import { ScreenMode } from "@/types/form";
import { SubcontractorInfo, TrailerInfo, VehicleInfo, VehicleTypeInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { moveDisabledToBottom } from "@/utils/sort";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

export type VehicleGeneralInfoFormProps = {
  screenMode: ScreenMode;
  orgLink: string;
  orgId: number;
  subcontractorId?: number | null;
  onMultiFileChange: (file?: UploadInputValue, index?: number) => void;
  fileImages: UploadInputValue[];
  inModal?: boolean;
  vehicleInfo: VehicleInfo | undefined;
};

const VehicleGeneralInfoForm = ({
  screenMode,
  orgId,
  subcontractorId,
  onMultiFileChange,
  fileImages,
  inModal,
  vehicleInfo,
}: VehicleGeneralInfoFormProps) => {
  const t = useTranslations();
  const { canNew } = usePermission("trailer");
  const { canNew: canNewSubcontractor } = usePermission("subcontractor");
  const { canNew: canNewVehicleType } = usePermission("vehicle-type");

  const [isNewVehicleTypeModalOpen, setIsNewVehicleTypeModalOpen] = useState(false);
  const [isNewTrailerModalOpen, setIsNewTrailerModalOpen] = useState(false);
  const [isNewSubcontractorModalOpen, setIsNewSubcontractorModalOpen] = useState(false);

  const { values, touched, errors, handleChange, setFieldValue } = useFormikContext<VehicleInputForm>();

  const statusOptions: RadioItem[] = [
    { value: "true", label: t("vehicle.status_active") },
    { value: "false", label: t("vehicle.status_inactive") },
  ];

  const ownerOptions: RadioItem[] = [
    { value: VehicleOwnerType.ORGANIZATION, label: t("vehicle.organization") },
    { value: VehicleOwnerType.SUBCONTRACTOR, label: t("vehicle.subcontractor") },
  ];

  const {
    subcontractors,
    isLoading: isSubcontractorOptionsLoading,
    mutate: mutateSubcontractor,
  } = useSubcontractorOptions({
    organizationId: orgId,
  });

  const {
    vehicleTypes,
    isLoading: isVehicleTypeOptionsLoading,
    mutate: mutateVehicleType,
  } = useVehicleTypeOptions({ organizationId: orgId });

  const {
    trailers,
    isLoading: isTrailerOptionsLoading,
    mutate: mutateTrailer,
  } = useTrailerOptions({
    organizationId: orgId,
  });

  const subcontractorOptions: ComboboxItem[] = useMemo(
    () =>
      subcontractors.map((item: SubcontractorInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.code),
        subLabel: ensureString(item.name),
      })),
    [subcontractors]
  );

  const vehicleTypeOptions: ComboboxItem[] = useMemo(
    () => vehicleTypes.map((item: VehicleTypeInfo) => ({ value: ensureString(item.id), label: item.name ?? "" })),
    [vehicleTypes]
  );

  const trailerOptions: ComboboxItem[] = useMemo(() => {
    const trailersWithoutVehicle: ComboboxItem[] = [];
    const trailersWithVehicle: ComboboxItem[] = [];
    trailers.map((item: TrailerInfo) => {
      if (!item.vehicle) {
        trailersWithoutVehicle.push({
          value: ensureString(item.id),
          label: item.trailerNumber,
        });
      } else {
        trailersWithVehicle.push({
          value: ensureString(item.id),
          label: item.trailerNumber,
          subLabel: item.vehicle.vehicleNumber,
          disabled: screenMode === "EDIT" && equalId(vehicleInfo?.trailer?.id, item.id) ? false : true,
        });
      }
    });
    return moveDisabledToBottom([...trailersWithoutVehicle, ...trailersWithVehicle]);
  }, [screenMode, trailers, vehicleInfo?.trailer?.id]);

  const yearSelectList: SelectItem[] = useMemo(
    () =>
      Array.from({ length: new Date().getFullYear() - 1800 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { label: year.toString(), value: year.toString() };
      }),
    []
  );

  const handleNewVehicleTypeModalClose = useCallback(() => {
    setIsNewVehicleTypeModalOpen(false);
  }, []);

  const handleNewVehicleTypeModalOpen = useCallback(() => {
    setIsNewVehicleTypeModalOpen(true);
  }, []);

  const handleNewVehicleTypeModalSubmit = useCallback(
    (id: number) => {
      setIsNewVehicleTypeModalOpen(false);
      if (id) {
        setFieldValue("typeId", id);
        mutateVehicleType();
      }
    },
    [mutateVehicleType, setFieldValue]
  );

  const handleNewTrailerModalClose = useCallback(() => {
    setIsNewTrailerModalOpen(false);
  }, []);

  const handleNewTrailerModalOpen = useCallback(() => {
    setIsNewTrailerModalOpen(true);
  }, []);

  const handleNewTrailerModalSubmit = useCallback(
    (id?: number) => {
      setIsNewTrailerModalOpen(false);
      if (id) {
        setFieldValue("trailerId", id);
        mutateTrailer();
      }
    },
    [mutateTrailer, setFieldValue]
  );

  const handleNewSubcontractorModalClose = useCallback(() => {
    setIsNewSubcontractorModalOpen(false);
  }, []);

  const handleNewSubcontractorModalOpen = useCallback(() => {
    setIsNewSubcontractorModalOpen(true);
  }, []);

  const handleNewSubcontractorModalSubmit = useCallback(
    (id?: number) => {
      setIsNewSubcontractorModalOpen(false);
      if (id) {
        setFieldValue("subcontractorId", id);
        mutateSubcontractor();
      }
    },
    [mutateSubcontractor, setFieldValue]
  );

  const handleOwnerChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("ownerType", item.value);
    },
    [setFieldValue]
  );

  const handleSelectChange = useCallback(
    (name: string) => (value: string) => {
      setFieldValue(name, value);
    },
    [setFieldValue]
  );

  const handleDateChange = useCallback(
    (name: string) => (date: Date) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  const handleActiveChange = useCallback(
    (item: RadioItem) => setFieldValue("isActive", item.value === "true"),
    [setFieldValue]
  );

  const handleFileChange = useCallback(
    (index?: number) => (file?: UploadInputValue) => {
      onMultiFileChange && onMultiFileChange(file, index);
    },
    [onMultiFileChange]
  );

  const viewMultipleFile = useMemo(
    () => (
      <div className="grid grid-cols-4 gap-4">
        {fileImages.map((item, index) => (
          <div key={index} className="col-span-2 sm:col-span-1">
            <UploadInput
              key={index}
              value={{
                name: item.name ?? "",
                url: item.url ?? "",
              }}
              type="VEHICLE"
              name="image"
              onChange={handleFileChange(index)}
              previewGrid={false}
            />
          </div>
        ))}
      </div>
    ),
    [fileImages, handleFileChange]
  );

  return (
    <>
      <div className="col-span-full">
        <RadioGroup
          label={t("vehicle.owner")}
          name="owner"
          items={ownerOptions}
          value={values.ownerType}
          onChange={handleOwnerChange}
          disabled={!!subcontractorId}
        />
      </div>

      {values.ownerType === VehicleOwnerType.SUBCONTRACTOR && (
        <div className="sm:col-span-4">
          <Combobox
            label={t("vehicle.subcontractor")}
            items={subcontractorOptions}
            value={ensureString(values.subcontractorId)}
            onChange={handleSelectChange("subcontractorId")}
            placeholder={isSubcontractorOptionsLoading ? t("common.loading") : t("vehicle.select_subcontractor")}
            newButtonText={canNewSubcontractor() ? t("vehicle.create_new_subcontractor") : undefined}
            onNewButtonClick={canNewSubcontractor() ? handleNewSubcontractorModalOpen : undefined}
            disabled={!!subcontractorId}
          />
        </div>
      )}

      <div className="sm:col-span-2 sm:col-start-1">
        <TextField
          label={t("vehicle.vehicle_number")}
          name="vehicleNumber"
          value={values.vehicleNumber}
          required
          maxLength={20}
          onChange={handleChange}
          errorText={formatError(t, touched.vehicleNumber && errors.vehicleNumber)}
        />
      </div>

      <div className="sm:col-span-2">
        <TextField
          label={t("vehicle.vehicle_id_number")}
          name="idNumber"
          value={ensureString(values.idNumber)}
          maxLength={20}
          onChange={handleChange}
          errorText={formatError(t, touched.idNumber && errors.idNumber)}
        />
      </div>

      <div className="sm:col-span-2 sm:col-start-1">
        <TextField
          label={t("vehicle.model")}
          name="model"
          value={ensureString(values.model)}
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.model && errors.model)}
        />
      </div>

      <div className="sm:col-span-2">
        <Combobox
          label={t("vehicle.vehicle_type")}
          items={vehicleTypeOptions}
          value={ensureString(values.typeId)}
          onChange={handleSelectChange("typeId")}
          placeholder={isVehicleTypeOptionsLoading ? t("common.loading") : t("vehicle.select_vehicle_type")}
          newButtonText={canNewVehicleType() ? t("vehicle.create_new_vehicle_type") : undefined}
          onNewButtonClick={canNewVehicleType() ? handleNewVehicleTypeModalOpen : undefined}
        />
      </div>

      {!inModal && (
        <div className="sm:col-span-2">
          <Combobox
            label={t("vehicle.trailer")}
            items={trailerOptions}
            value={ensureString(values.trailerId)}
            onChange={handleSelectChange("trailerId")}
            placeholder={isTrailerOptionsLoading ? t("common.loading") : t("vehicle.select_trailer")}
            newButtonText={canNew() ? t("vehicle.create_new_trailer") : undefined}
            onNewButtonClick={canNew() ? handleNewTrailerModalOpen : undefined}
            emptyLabel={t("vehicle.none_select_trailer")}
          />
        </div>
      )}

      <div className="sm:col-span-1 sm:col-start-1">
        <TextField
          type="color"
          label={t("vehicle.color")}
          name="color"
          value={ensureString(values.color)}
          onChange={handleChange}
          errorText={formatError(t, touched.color && errors.color)}
        />
      </div>

      <div className="sm:col-span-2">
        <Combobox
          label={t("vehicle.year_of_manufacture")}
          items={yearSelectList}
          value={ensureString(values.yearOfManufacture)}
          onChange={handleSelectChange("yearOfManufacture")}
        />
      </div>

      <div className="sm:col-span-2">
        <DatePicker
          label={t("vehicle.usage_date")}
          name="startUsageDate"
          placeholder="DD/MM/YYYY"
          selected={values.startUsageDate && new Date(values.startUsageDate)}
          onChange={handleDateChange("startUsageDate")}
        />
      </div>

      <div className="sm:col-span-3 sm:col-start-1">
        <TextField
          label={t("vehicle.brand")}
          name="brand"
          value={ensureString(values.brand)}
          maxLength={255}
          onChange={handleChange}
          errorText={formatError(t, touched.brand && errors.brand)}
        />
      </div>

      <div className="sm:col-span-2">
        <Select
          label={t("vehicle.fuel_type")}
          items={FUEL_TYPE_OPTIONS}
          value={ensureString(values.fuelType)}
          onChange={handleSelectChange("fuelType")}
        />
      </div>

      <div className="sm:col-span-3">
        <NumberField
          label={t("vehicle.fuel_consumption", { unit: t("vehicle.fuel_consumption_unit") })}
          name="fuelConsumption"
          value={values.fuelConsumption}
          onChange={handleChange}
          errorText={formatError(t, touched.fuelConsumption && errors.fuelConsumption)}
          suffixText={t("vehicle.fuel_consumption_unit")}
        />
      </div>

      {!inModal && (
        <>
          <div className="col-span-full">
            {viewMultipleFile}
            <UploadInput
              showPreview={false}
              label={t("vehicle.picture")}
              type="VEHICLE"
              name="image"
              onChange={handleFileChange(undefined)}
              value={undefined}
              multiple
            />
          </div>

          <div className="col-span-full">
            <TextField
              label={t("vehicle.description")}
              name="description"
              value={ensureString(values.description)}
              multiline
              rows={4}
              maxLength={500}
              showCount
              onChange={handleChange}
              errorText={formatError(t, touched.description && errors.description)}
            />
          </div>

          <div className="col-span-full">
            <RadioGroup
              label={t("vehicle.status")}
              name="status"
              items={statusOptions}
              value={ensureString(values.isActive)}
              onChange={handleActiveChange}
            />
          </div>
        </>
      )}

      {/* New Vehicle Type Modal */}
      <NewVehicleTypeModal
        open={isNewVehicleTypeModalOpen}
        onClose={handleNewVehicleTypeModalClose}
        onSubmit={handleNewVehicleTypeModalSubmit}
      />
      {/* New Trailer Modal */}
      <NewTrailerModal
        open={isNewTrailerModalOpen}
        onClose={handleNewTrailerModalClose}
        onSubmit={handleNewTrailerModalSubmit}
      />
      {/* New Subcontractor Modal */}
      <NewSubcontractorModal
        open={isNewSubcontractorModalOpen}
        onClose={handleNewSubcontractorModalClose}
        onSubmit={handleNewSubcontractorModalSubmit}
      />
    </>
  );
};

export default VehicleGeneralInfoForm;
