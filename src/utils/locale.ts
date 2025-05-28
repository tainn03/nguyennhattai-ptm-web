import { notFound } from "next/navigation";
import { createTranslator as createNextIntlTranslator } from "next-intl";

import { DEFAULT_LOCALE, LOCALES } from "@/constants/locale";
import { LocaleType } from "@/types/locale";

/**
 * Get Messages for a Specific Locale
 *
 * @param {LocaleType} locale - The locale code for the desired language.
 */
export const getMessages = async (locale: LocaleType = DEFAULT_LOCALE) => {
  try {
    if (LOCALES.includes(locale)) {
      return (await import(`../messages/${locale}.json`)).default;
    }
  } catch {
    // nothing
  }
  return notFound();
};

export const createTranslator = async (locale: LocaleType = DEFAULT_LOCALE) => {
  const messages = await getMessages(locale);
  return createNextIntlTranslator({ locale, messages });
};
