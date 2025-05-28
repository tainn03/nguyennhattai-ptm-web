import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Vai trò, quyền",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
