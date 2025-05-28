import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: {
    template: "%s | TMS",
    default: "Cài đặt gói",
  },
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
