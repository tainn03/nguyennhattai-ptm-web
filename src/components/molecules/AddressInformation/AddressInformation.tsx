"use client";

import { AdministrativeUnit, AdministrativeUnitType } from "@prisma/client";
import clsx from "clsx";
import { FieldMetaProps } from "formik";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import React, { ChangeEvent, useCallback, useEffect, useMemo } from "react";

import { Combobox, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import useAdministrativeUnits from "@/hooks/useAdministrativeUnits";
import { AnyObject } from "@/types";
import { AddressInformationInfo } from "@/types/strapi";
import { formatError } from "@/utils/yup";

export type AddressInformationProps = {
  address?: Partial<AddressInformationInfo>;
  setFieldValue: (_name: string, _value: string | null | Pick<AdministrativeUnit, "id" | "code" | "name">) => void;
  parentName?: string;
  getFieldMeta: (_name: string) => FieldMetaProps<AnyObject<string>>;
  isShowCountry?: boolean;
};

const AddressInformation = ({
  address,
  setFieldValue,
  parentName,
  getFieldMeta,
  isShowCountry = false,
}: AddressInformationProps) => {
  const t = useTranslations();
  const parent = useMemo(() => (parentName ? `${parentName}.` : ""), [parentName]);

  const { administrativeUnits: countries, isLoading: isCountryLoading } = useAdministrativeUnits({
    type: AdministrativeUnitType.COUNTRY,
    parentCode: null,
  });

  useEffect(() => {
    if (!isEmpty(countries) && countries?.length === 1) {
      setFieldValue(`${parent}country`, {
        id: Number(countries[0].id),
        name: countries[0].name,
        code: countries[0].code,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, address?.country?.code]);

  const { administrativeUnits: cities, isLoading: isCityLoading } = useAdministrativeUnits({
    type: AdministrativeUnitType.CITY,
    parentCode: address?.country?.code ?? null,
  });
  const { administrativeUnits: districts, isLoading: isDistrictLoading } = useAdministrativeUnits({
    type: AdministrativeUnitType.DISTRICT,
    parentCode: address?.city?.code ?? null,
  });
  const { administrativeUnits: wards, isLoading: isWardLoading } = useAdministrativeUnits({
    type: AdministrativeUnitType.WARD,
    parentCode: address?.district?.code ?? null,
  });

  // Countries
  const countryItems: ComboboxItem[] = useMemo(
    () => countries.map(({ code, name }) => ({ value: code, label: name })),
    [countries]
  );

  // Cities
  const cityItems: ComboboxItem[] = useMemo(
    () => (address?.country ? cities.map(({ code, name }) => ({ value: code, label: name })) : []),
    [address?.country, cities]
  );

  // Districts
  const districtItems: ComboboxItem[] = useMemo(
    () => (address?.city ? districts.map(({ code, name }) => ({ value: code, label: name })) : []),
    [address?.city, districts]
  );

  // Wards
  const wardItems: ComboboxItem[] = useMemo(
    () => (address?.district ? wards.map(({ code, name }) => ({ value: code, label: name })) : []),
    [address?.district, wards]
  );

  const handleChange = useCallback(
    (name: string) => (value: string) => {
      let searchResult;
      switch (name) {
        case "country":
          searchResult = countries.find((item) => item.code === value);
          if (searchResult) {
            setFieldValue(`${parent}${name}`, {
              id: Number(searchResult?.id),
              name: searchResult?.name,
              code: searchResult?.code,
            });
          } else {
            setFieldValue(`${parent}${name}`, null);
          }

          setFieldValue(`${parent}city`, null);
          setFieldValue(`${parent}district`, null);
          setFieldValue(`${parent}ward`, null);
          break;
        case "city":
          searchResult = cities.find((item) => item.code === value);
          if (searchResult) {
            setFieldValue(`${parent}${name}`, {
              id: Number(searchResult?.id),
              name: searchResult?.name,
              code: searchResult?.code,
            });
          } else {
            setFieldValue(`${parent}${name}`, null);
          }
          setFieldValue(`${parent}district`, null);
          setFieldValue(`${parent}ward`, null);
          break;
          break;
        case "district":
          searchResult = districts.find((item) => item.code === value);
          if (searchResult) {
            setFieldValue(`${parent}${name}`, {
              id: Number(searchResult?.id),
              name: searchResult?.name,
              code: searchResult?.code,
            });
          } else {
            setFieldValue(`${parent}${name}`, null);
          }
          setFieldValue(`${parent}ward`, null);
          break;
        case "ward":
          searchResult = wards.find((item) => item.code === value);
          if (searchResult) {
            setFieldValue(`${parent}${name}`, {
              id: Number(searchResult?.id),
              name: searchResult?.name,
              code: searchResult?.code,
            });
          } else {
            setFieldValue(`${parent}${name}`, null);
          }
          break;
        default:
          break;
      }
    },
    [cities, countries, districts, parent, setFieldValue, wards]
  );

  const handleAddressLine1Change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFieldValue(`${parent}addressLine1`, event.target.value);
    },
    [parent, setFieldValue]
  );

  return (
    <>
      {isShowCountry && (
        <div className="sm:col-span-3 sm:col-start-1">
          <Combobox
            label={t("components.address_information.country")}
            items={countryItems}
            value={address?.country?.code}
            onChange={handleChange("country")}
            placeholder={isCountryLoading ? t("common.loading") : ""}
          />
        </div>
      )}

      <div
        className={clsx({
          "sm:col-span-3": isShowCountry,
          "sm:col-span-4 sm:col-start-1": !isShowCountry,
        })}
      >
        <Combobox
          label={t("components.address_information.city")}
          items={cityItems}
          value={address?.city?.code}
          onChange={handleChange("city")}
          placeholder={isCityLoading ? t("common.loading") : ""}
        />
      </div>

      <div className="sm:col-span-3 sm:col-start-1">
        <Combobox
          label={t("components.address_information.district")}
          items={districtItems}
          value={address?.district?.code}
          onChange={handleChange("district")}
          placeholder={isDistrictLoading ? t("common.loading") : ""}
        />
      </div>

      <div className="sm:col-span-3">
        <Combobox
          label={t("components.address_information.ward")}
          items={wardItems}
          value={address?.ward?.code}
          onChange={handleChange("ward")}
          placeholder={isWardLoading ? t("common.loading") : ""}
        />
      </div>

      <div className="col-span-full">
        <TextField
          label={t("components.address_information.address_line1")}
          id="addressLine1"
          name={`${parent}addressLine1`}
          type="text"
          maxLength={225}
          onChange={handleAddressLine1Change}
          value={address?.addressLine1 ?? ""}
          helperText={t("components.address_information.address_line1_helper_text")}
          errorText={formatError(
            t,
            getFieldMeta(`${parent}addressLine1`).touched && getFieldMeta(`${parent}addressLine1`).error
          )}
        />
      </div>
    </>
  );
};

export default AddressInformation;
