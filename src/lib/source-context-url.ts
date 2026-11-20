/** Conservative citation identity; never match a publisher host or infer an article alias. */
export function normalizeSourceContextUrl(input: unknown): string | undefined {
  if (typeof input !== "string" || /[\s\\<>"`{}]/.test(input) || /%(?![\da-f]{2})/i.test(input)) return undefined;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(input)?.[1];
  if (!authority || /[%@]/.test(authority)) return undefined;
  try {
    const url = new URL(input);
    if (url.username || url.password) return undefined;
    if (url.hostname === "doi.org" || url.hostname === "dx.doi.org") {
      url.hostname = "doi.org";
      url.protocol = "https:";
      url.pathname = url.pathname.toLowerCase();
    }
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return undefined;
  }
}
