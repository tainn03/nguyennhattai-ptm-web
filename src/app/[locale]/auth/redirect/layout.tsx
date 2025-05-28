import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Chuyển hướng",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
