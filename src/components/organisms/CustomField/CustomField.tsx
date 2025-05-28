/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
import clsx from "clsx";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { CardContent, CardHeader, Checkbox } from "@/components/atoms";
import { Combobox, DatePicker, FileUploader, InputGroup, NumberField, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { useAuth } from "@/hooks";
import { getCustomFieldByType } from "@/services/client/customField";
import { YubObjectSchema } from "@/types";
import { CustomFieldFile } from "@/types/customField";
import { UploadInputValue } from "@/types/file";
import { CustomFieldInfo } from "@/types/strapi";
import { createValidationSchema } from "@/utils/customField";
import { isValidDate, parseDate } from "@/utils/date";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

type CustomFieldProps = {
  type: CustomFieldType;
  title?: string;
  variant?: "card" | "input-group";
  showBorderBottom?: boolean;
  onLoaded: (_schema: YubObjectSchema<any>, _customFields: CustomFieldInfo[]) => void;
};

export const CustomField = ({ type, variant, title, showBorderBottom, onLoaded }: CustomFieldProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const [customFields, setCustomFields] = useState<CustomFieldInfo[]>([]);
  const { values, touched, errors, setFieldValue } = useFormikContext<any>();

  useEffect(() => {
    const fetchCustomFields = async () => {
      const result = await getCustomFieldByType({ organizationId: orgId, type });
      setCustomFields(result);
      onLoaded(createValidationSchema(result), result);
    };

    fetchCustomFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (field: CustomFieldInfo) => (e: any) => {
      const { id, dataType } = field;
      let value;
      switch (dataType) {
        case CustomFieldDataType.BOOLEAN:
          value = e.target.checked;
          break;
        case CustomFieldDataType.DATE:
        case CustomFieldDataType.DATETIME:
          value = parseDate(e);
          break;
        case CustomFieldDataType.NUMBER:
          value = isNumeric(e.target.value) ? Number(e.target.value) : null;
          break;
        case CustomFieldDataType.FILE:
          value = e as UploadInputValue[];
          break;
        case CustomFieldDataType.CHOICE:
          value = e;
          break;
        default:
          value = e.target.value;
          break;
      }
      if (dataType === CustomFieldDataType.FILE) {
        const newValue = (value as CustomFieldFile[]).length > 0 ? [...(value as CustomFieldFile[])] : null;
        setFieldValue(ensureString(id), newValue);
      } else {
        setFieldValue(ensureString(id), value);
      }
    },
    [setFieldValue]
  );

  const renderField = useCallback(
    (field: CustomFieldInfo) => {
      const { id, name, key, value, isRequired, dataType, max, min } = field;
      const keyProp = ensureString(id);
      const currentValue = values[keyProp];
      const props = {
        label: name,
        name: key,
        required: dataType === CustomFieldDataType.BOOLEAN ? false : isRequired,
        onChange: handleChange(field),
        ...((dataType === CustomFieldDataType.DATE || dataType === CustomFieldDataType.DATETIME) && {
          selected: isValidDate(currentValue) ? parseDate(currentValue) : null,
          isClearable: true,
        }),
        errorText: formatError(t, (touched[keyProp] && errors[keyProp]) as string),
        className: "[&_label]:!whitespace-pre-wrap [&_label]:break-all",
      };

      switch (dataType) {
        case CustomFieldDataType.TEXT:
        case CustomFieldDataType.EMAIL:
          return <TextField {...props} maxLength={max ?? undefined} value={currentValue ?? ""} />;
        case CustomFieldDataType.NUMBER:
          return (
            <NumberField
              {...props}
              max={max ?? undefined}
              min={min ?? undefined}
              value={isNumeric(currentValue) ? Number(currentValue) : null}
            />
          );
        case CustomFieldDataType.DATE:
          return <DatePicker {...props} isClearable={false} />;
        case CustomFieldDataType.DATETIME:
          return (
            <DatePicker
              {...props}
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              isClearable={false}
            />
          );
        case CustomFieldDataType.BOOLEAN: {
          return (
            <Checkbox
              {...props}
              checked={typeof currentValue === "boolean" ? currentValue : false}
              className="col-span-full [&_label]:!whitespace-pre-wrap [&_label]:break-all"
            />
          );
        }
        case CustomFieldDataType.FILE:
          return (
            <FileUploader
              {...props}
              value={Array.isArray(currentValue) ? currentValue : []}
              type="CUSTOM_FIELD"
              className="h-fit [&_label]:!whitespace-pre-wrap [&_label]:break-all"
              multiple
            />
          );
        case CustomFieldDataType.CHOICE:
          // eslint-disable-next-line no-case-declarations
          let result: ComboboxItem[] = [];
          if (value) {
            result = value.split("\n").map((pair: string) => {
              if (pair) {
                const val = pair.split(",")[0];
                return {
                  label: val,
                  value: val,
                };
              }
              return pair;
            }) as unknown as ComboboxItem[];
          }
          return <Combobox placement="top" {...props} items={result} value={currentValue} />;

        default:
          return null;
      }
    },
    [values, handleChange, t, touched, errors]
  );

  const customFieldComponents = useMemo(() => {
    return customFields
      .sort((component1, component2) => {
        const order1 = component1.displayOrder || 0;
        const order2 = component2.displayOrder || 0;
        return order1 - order2;
      })
      .map((field) => (
        <div
          className={clsx({
            "sm:col-span-3 xl:col-span-2":
              field.dataType === CustomFieldDataType.DATE || field.dataType === CustomFieldDataType.DATETIME,
            "col-span-full mt-2":
              field.dataType !== CustomFieldDataType.DATE && field.dataType !== CustomFieldDataType.DATETIME,
          })}
          key={field.id}
        >
          {renderField(field)}
        </div>
      ));
  }, [customFields, renderField]);

  if (!customFields.length) {
    return null;
  }

  return (
    <>
      {variant === "card" ? (
        <>
          {title && <CardHeader title={t("custom_field.input_group_title")} />}
          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
            {customFieldComponents}
          </CardContent>
        </>
      ) : variant === "input-group" && title ? (
        <InputGroup showBorderBottom={showBorderBottom} title={title}>
          {customFieldComponents}
        </InputGroup>
      ) : (
        <>{customFieldComponents}</>
      )}
    </>
  );
};

export default memo(CustomField);
