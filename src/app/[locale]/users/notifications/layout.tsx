import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: {
    template: "%s | TMS",
    default: "Thông báo",
  },
};

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
