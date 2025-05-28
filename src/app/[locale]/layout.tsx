import { Metadata } from "next";
import { createTranslator, NextIntlClientProvider } from "next-intl";

import { LOCALES } from "@/constants/locale";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";

type LayoutProps = DefaultReactProps & GenerateMetadataProps;

export async function generateMetadata({ params: { locale } }: LayoutProps): Promise<Metadata> {
  const messages = await getMessages(locale);

  // You can use the core (non-React) APIs when you have to use next-intl
  // outside of components. Potentially this will be simplified in the future
  // (see https://next-intl-docs.vercel.app/docs/next-13/server-components).
  const t = createTranslator({ locale, messages });

  return {
    title: {
      template: `%s | ${t("common.app.name")}`,
      default: t("index.title"),
    },
  };
}

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function Layout({ children, params: { locale } }: LayoutProps) {
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
