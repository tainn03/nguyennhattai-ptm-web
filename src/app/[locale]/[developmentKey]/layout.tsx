import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer, Header } from "@/components/organisms";
import { APP_DEVELOPMENT_KEY } from "@/configs/environment";
import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Use of Components",
};

export default function Layout({ params, children }: DefaultReactProps) {
  if (params?.developmentKey !== APP_DEVELOPMENT_KEY) {
    return notFound();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="min-h-full flex-1">
        <Header sidebarMenu={false} searchBar={false} />

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
