/**
 * Represents the rules for formatting addresses in reports.
 * This type is used in conjunction with the REPORT_ADDRESS_FORMATTING_RULES flag.
 */
export type AddressFormattingRulesInReport = {
  country?: boolean;
  city?: boolean;
  district?: boolean;
  ward?: boolean;
  postalCode?: boolean;
  addressLine1?: boolean;
  addressLine2?: boolean;
};
