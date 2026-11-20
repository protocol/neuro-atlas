"use client";
import { createContext, useContext } from "react";
import { graphNavigationHref } from "@/lib/field-velocity/graph-navigation";

// Outside the routes, the chart components still support their embedded dialog layout.
export const FieldVelocityRouteContext = createContext<string | null>(null);
export function useGraphHref(anchor: string) {
  const current = useContext(FieldVelocityRouteContext);
  return current === null ? undefined : graphNavigationHref(anchor, current || undefined);
}
