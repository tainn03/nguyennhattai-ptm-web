export const NAM_PHONG_ORGANIZATION_ID = 6;

export const NAM_PHONG_BILL_NO_FIELD_ID = 3;

export const NAM_PHONG_CONT_NO_FIELD_ID = 2;

export const NAM_PHONG_DECLARATION_NUMBER_ID = 4;

export enum CustomerImportType {
  TAP_KIDO = "TAP_Kido",
  TAP_HUU_NGHI = "TAP_HuuNghi",
}

export const CUSTOMER_IMPORT_TYPE_LABELS = {
  [CustomerImportType.TAP_KIDO]: "KIDO",
  [CustomerImportType.TAP_HUU_NGHI]: "Hữu Nghị",
};
