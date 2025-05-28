import { Metadata } from "next";
import { createTranslator } from "next-intl";

import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const messages = await getMessages(locale);
  const _ = createTranslator({ locale, messages });

  return {
    title: "Danh sách yêu cầu đặt hàng",
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
