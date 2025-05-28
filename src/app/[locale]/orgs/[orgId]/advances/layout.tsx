import { createTranslator } from "next-intl";

import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps) {
  const messages = await getMessages(locale);
  const t = createTranslator({ locale, messages });

  return {
    title: t("advance.title"),
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
