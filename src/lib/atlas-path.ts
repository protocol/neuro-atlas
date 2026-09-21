/** Build-time setting shared by Next and raw browser asset URLs. */
export const atlasBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
if (atlasBasePath !== "" && !/^(\/[A-Za-z0-9_-]+)+$/.test(atlasBasePath)) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or a slash-prefixed path without a trailing slash (for example /neuro-atlas)");
}

/** For raw img/src, anchor/download and fetch URLs only — never Next Link/router. */
export function atlasPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || !atlasBasePath) return path;
  if (path === atlasBasePath || /^[/#?]/.test(path.slice(atlasBasePath.length)) && path.startsWith(atlasBasePath)) return path;
  return `${atlasBasePath}${path}`;
}

/** usePathname is app-relative; also accept prefixed paths from raw browser URLs. */
export function atlasPathname(pathname: string | null): string {
  if (!pathname) return "/";
  const path = atlasBasePath && (pathname === atlasBasePath || pathname.startsWith(`${atlasBasePath}/`))
    ? pathname.slice(atlasBasePath.length) : pathname;
  return path.replace(/\/+$/, "") || "/";
}
