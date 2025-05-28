"use client";
import { ReactNode } from "react";

interface VisibleProps {
  when: boolean;
  except?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function Visible({ when, children, fallback, except }: VisibleProps) {
  if (when || except) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}
