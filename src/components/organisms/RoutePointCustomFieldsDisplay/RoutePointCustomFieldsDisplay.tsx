"use client";

import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
import isObject from "lodash/isObject";
import isString from "lodash/isString";
import { useTranslations } from "next-intl";
import { Fragment, useMemo } from "react";

import { Badge, DateTimeLabel, DescriptionImage, DescriptionProperty2, NumberLabel } from "@/components/atoms";
import { useAuth, useCustomFieldByType } from "@/hooks";
import { AnyObject } from "@/types";
import { CustomFieldFile } from "@/types/customField";
import { CustomFieldInfo } from "@/types/strapi";
import { isValidDate } from "@/utils/date";
import { equalId, isNumeric } from "@/utils/number";
import { ensureString, randomString, randomUUID, stringToColor } from "@/utils/string";

type RoutePointCustomFieldsDisplayProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
  loading?: boolean;
};

const RoutePointCustomFieldsDisplay = ({ meta, loading }: RoutePointCustomFieldsDisplayProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { customFields } = useCustomFieldByType({ organizationId: orgId, type: CustomFieldType.ROUTE_POINT });

  const metaCustomFields = useMemo(() => meta?.customFields || [], [meta]);

  /**
   * Handle render label of custom fields
   */
  const handleRenderCustomFieldLabel = useMemo(
    () => (
      <>
        {customFields &&
          customFields.map((field: CustomFieldInfo) => {
            const data = (metaCustomFields || []).find((item: AnyObject) => equalId(field.id, item.id));
            const emptyLabel = "-";
            const checkType = field.dataType === data?.dataType;

            switch (field.dataType) {
              case CustomFieldDataType.TEXT:
              case CustomFieldDataType.EMAIL: {
                const value = isString(data?.value) && checkType ? ensureString(data?.value) : null;
                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>*]:break-all [&>label]:!whitespace-pre-wrap"
                    label={field.name}
                    loading={loading}
                  >
                    {value}
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.NUMBER: {
                const value = isNumeric(data?.value) && checkType ? Number(data?.value) : null;
                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                    label={field.name}
                    loading={loading}
                  >
                    <NumberLabel value={value} emptyLabel={emptyLabel} />
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.DATE: {
                const value = isValidDate(data?.value as Date) && checkType ? (data?.value as Date) : null;
                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                    label={field.name}
                    loading={loading}
                  >
                    <DateTimeLabel type="date" value={value} emptyLabel={emptyLabel} />
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.DATETIME: {
                const value = isValidDate(data?.value as Date) && checkType ? (data?.value as Date) : null;
                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                    label={field.name}
                    loading={loading}
                  >
                    <DateTimeLabel type="datetime" value={value} emptyLabel={emptyLabel} />
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.BOOLEAN: {
                const value = typeof data?.value === "boolean" && checkType ? data?.value : null;
                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                    loading={loading}
                    label={field.name}
                  >
                    <Badge
                      label={value ? t("custom_field.boolean.checked") : t("custom_field.boolean.un_checked")}
                      color={value ? "success" : "error"}
                    />
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.CHOICE: {
                const value = data?.value || null;
                let color = null;
                if (field?.value && value) {
                  const listValues = field.value!.split("\n");
                  color =
                    listValues
                      .find((val) => {
                        const valueLabel = val.split(",")[0];
                        return valueLabel.toLowerCase() === value.toLowerCase();
                      })
                      ?.split(",")[1] || null;
                  if (!color) {
                    const rdStr = randomString(randomUUID().length);
                    color = stringToColor(rdStr);
                  }
                }

                return (
                  <DescriptionProperty2
                    key={field.id}
                    size="short"
                    className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                    loading={loading}
                    label={field.name}
                  >
                    {value && <Badge label={value} customColor={color} />}
                  </DescriptionProperty2>
                );
              }
              case CustomFieldDataType.FILE: {
                const files = isObject(data?.value) && checkType ? (data?.value as CustomFieldFile[]) : null;
                return (
                  <>
                    <DescriptionProperty2
                      key={field.id}
                      size="short"
                      className="col-span-full block space-x-2 space-y-1 [&>label]:!whitespace-pre-wrap [&>label]:break-all"
                      loading={loading}
                      label={field.name}
                    >
                      {files && files.length > 0 ? (
                        <div className="flex flex-row flex-wrap gap-4">
                          {files.map((file, index) => (
                            <DescriptionImage
                              className="flex-shrink-0"
                              file={file}
                              key={`custom-field-${index}-${field.id}`}
                            />
                          ))}
                        </div>
                      ) : (
                        t("common.empty")
                      )}
                    </DescriptionProperty2>
                  </>
                );
              }

              default:
                break;
            }
          })}
      </>
    ),
    [customFields, metaCustomFields, loading, t]
  );

  if (!customFields || customFields.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-b-1 border-gray-200 ">
        <DescriptionProperty2 label={t("order.route_card.custom_field_title")} loading={loading}>
          <Fragment />
        </DescriptionProperty2>
      </div>
      <div className="group col-span-full grid grid-cols-1 gap-1 overflow-hidden rounded-lg pl-4 md:grid-cols-2">
        {handleRenderCustomFieldLabel}
      </div>
    </>
  );
};

export default RoutePointCustomFieldsDisplay;
