import { Metadata } from "next";
import { redirect } from "next/navigation";

import { Footer } from "@/components/organisms";
import { checkUserAlreadyExists } from "@/services/server/user";
import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Initialize AUTOTMS Settings",
};

export default async function Layout({ children }: DefaultReactProps) {
  const exists = await checkUserAlreadyExists();
  if (exists) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex min-h-full flex-col">
      {children}
      <Footer />
    </div>
  );
}
