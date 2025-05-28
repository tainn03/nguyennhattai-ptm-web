import { Metadata } from "next";

import { Footer } from "@/components/organisms";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { createTranslator } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const t = await createTranslator(locale);

  return {
    title: {
      template: `%s | ${t("common.app.name")}`,
      default: t("forgot_password.title"),
    },
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center">
      {children}
      <Footer />
    </div>
  );
}
