import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
