"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";

import { NumberField } from "@/components/molecules";
import { VehicleInputForm } from "@/forms/vehicle";
import { formatError } from "@/utils/yup";

const VehicleTransportationInfoForm = () => {
  const t = useTranslations();
  const { values, touched, errors, handleChange } = useFormikContext<VehicleInputForm>();

  return (
    <>
      <div className="sm:col-span-2 sm:col-start-1">
        <NumberField
          label={t("vehicle.length")}
          name="maxLength"
          value={values.maxLength}
          onChange={handleChange}
          errorText={formatError(t, touched.maxLength && errors.maxLength)}
          suffixText={t("common.unit.meter")}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          label={t("vehicle.width")}
          name="maxWidth"
          value={values.maxWidth}
          onChange={handleChange}
          errorText={formatError(t, touched.maxWidth && errors.maxWidth)}
          suffixText={t("common.unit.meter")}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          label={t("vehicle.height")}
          name="maxHeight"
          value={values.maxHeight}
          onChange={handleChange}
          errorText={formatError(t, touched.maxHeight && errors.maxHeight)}
          suffixText={t("common.unit.meter")}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          label={t("vehicle.cube_meter")}
          name="cubicMeterCapacity"
          value={values.cubicMeterCapacity}
          onChange={handleChange}
          errorText={formatError(t, touched.cubicMeterCapacity && errors.cubicMeterCapacity)}
          suffixText={t("common.unit.cubic_meter")}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          label={t("vehicle.weight_ton")}
          name="tonPayloadCapacity"
          value={values.tonPayloadCapacity}
          onChange={handleChange}
          errorText={formatError(t, touched.tonPayloadCapacity && errors.tonPayloadCapacity)}
          suffixText={t("common.unit.ton")}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          label={t("vehicle.weight_pallet")}
          name="palletCapacity"
          value={values.palletCapacity}
          onChange={handleChange}
          errorText={formatError(t, touched.palletCapacity && errors.palletCapacity)}
          suffixText={t("common.unit.pallet")}
        />
      </div>
    </>
  );
};

export default VehicleTransportationInfoForm;
