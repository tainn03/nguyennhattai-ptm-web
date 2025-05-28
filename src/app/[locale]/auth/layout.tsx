import { Metadata } from "next";

import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { createTranslator } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const t = await createTranslator(locale);

  return {
    title: {
      template: `%s | ${t("common.app.name")}`,
      default: t("common.app.name"),
    },
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
