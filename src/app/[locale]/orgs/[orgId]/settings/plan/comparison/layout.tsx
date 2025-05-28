import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "So sánh tính năng",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
