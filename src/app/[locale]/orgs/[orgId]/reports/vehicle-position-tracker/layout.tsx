import { Metadata } from "next";
import { createTranslator } from "next-intl";

import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const messages = await getMessages(locale);
  const t = createTranslator({ locale, messages });

  return {
    title: t("report.vehicle_position_tracker.feature"),
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
