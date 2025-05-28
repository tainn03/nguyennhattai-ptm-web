import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Bảo mật 2 lớp",
};

export default function Layout({ children }: DefaultReactProps) {
  return <> {children}</>;
}
