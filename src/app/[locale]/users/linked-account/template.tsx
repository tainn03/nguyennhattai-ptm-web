"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { NEXT_PUBLIC_GOOGLE_CLIENT_ID } from "@/configs/environment";
import { DefaultReactProps } from "@/types";

export default function Template({ children }: DefaultReactProps) {
  return <GoogleOAuthProvider clientId={NEXT_PUBLIC_GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}
