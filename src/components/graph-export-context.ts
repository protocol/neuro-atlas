"use client";
import { createContext } from "react";
import type { GraphExportRequest } from "@/lib/chart-export-api";
export const GraphExportContext = createContext<GraphExportRequest | null>(null);
