import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Send Test Email",
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
