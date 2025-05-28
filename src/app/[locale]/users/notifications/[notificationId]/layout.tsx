import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Chi tiết thông báo",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
