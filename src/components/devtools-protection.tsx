"use client";

import { useDisableDevtools } from "@/lib/use-disable-devtools";

export function DevtoolsProtection() {
  useDisableDevtools();
  return null;
}
