import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Thay đổi gói",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
