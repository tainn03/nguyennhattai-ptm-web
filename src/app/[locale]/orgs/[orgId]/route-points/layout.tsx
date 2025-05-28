import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Địa điểm",
  };
}

export default function Layout({ children }: DefaultReactProps) {
  return children;
}
