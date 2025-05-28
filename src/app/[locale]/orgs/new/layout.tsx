import { Metadata } from "next";
import { createTranslator } from "next-intl";

import { Footer, Header } from "@/components/organisms";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const messages = await getMessages(locale);
  const t = createTranslator({ locale, messages });

  return {
    title: t("new_org.title"),
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="min-h-full flex-1">
        <Header sidebarMenu={false} searchBar={false} />

        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
