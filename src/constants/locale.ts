import { Locale, LocaleType } from "@/types/locale";

export const DEFAULT_LOCALE: LocaleType = "vi";

export const LOCALE_OPTIONS: Locale[] = [
  { code: "vi", name: "Tiếng Việt" },
  // { code: "en", name: "English" },
  // { code: "ja", name: "日本語" },
];

export const LOCALES = LOCALE_OPTIONS.map(({ code }) => code);
