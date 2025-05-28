export type LocaleType = "vi" | "en" | "ja";

export type Locale = {
  /**
   * Language code
   */
  code: LocaleType;

  /**
   * Language name
   */
  name: string;
};
