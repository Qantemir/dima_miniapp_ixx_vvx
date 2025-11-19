import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buildApiAssetUrl = (path?: string) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    const apiUrl = new URL(API_BASE_URL);
    const trimmedPath = apiUrl.pathname.replace(/\/$/, "");
    const basePath = trimmedPath.endsWith("/api") ? trimmedPath.slice(0, -4) : trimmedPath;
    return `${apiUrl.origin}${basePath}${normalizedPath}`;
  }

  const normalizedBase = API_BASE_URL.endsWith("/api")
    ? API_BASE_URL.slice(0, -4)
    : API_BASE_URL.replace(/\/$/, "");

  return `${normalizedBase}${normalizedPath}`;
};
