import { Metadata } from "next";

import { DefaultReactProps } from "@/types";

export const metadata: Metadata = {
  title: "Params",
};

export default function Layout({ children }: DefaultReactProps) {
  return (
    <div className="py-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
