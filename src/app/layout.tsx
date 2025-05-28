import "./globals.scss";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { NotificationStack } from "@/components/organisms";
import { authOptions } from "@/configs/nextauth";
import { RootProvider } from "@/providers";
import { DefaultReactProps } from "@/types";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | AUTOTMS",
    absolute: "AUTOTMS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: DefaultReactProps) {
  const session = await getServerSession(authOptions);

  return (
    <html>
      <body className={inter.className}>
        <RootProvider session={session}>
          {children}
          <NotificationStack />
        </RootProvider>
      </body>
    </html>
  );
}
