import { CustomFieldDataType, UploadFile } from "@prisma/client";

import { SelectItem } from "@/components/molecules/Select/Select";
import { UploadInputValue } from "@/types/file";

export type CustomFieldMetaType = {
  id: number;
  dataType: CustomFieldDataType;
  value: string | number | boolean | Date | string[] | UploadInputValue[] | CustomFieldFile[];
  canViewByDriver?: boolean;
  canEditByDriver?: boolean;
};

export type CustomFieldFile = Pick<UploadFile, "id" | "name" | "url">;

export type CustomFieldSelectItem = SelectItem & {
  modelSchema: string;
};

export type Meta = {
  [key: string]: unknown;
};

export type MetaObject<T> = Partial<T> & Meta;
