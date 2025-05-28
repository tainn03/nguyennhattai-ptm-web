import { Metadata } from "next";

import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { createTranslator } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const t = await createTranslator(locale);

  return {
    title: t("sign_up.activation.title"),
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
