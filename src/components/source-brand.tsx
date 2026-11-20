/* eslint-disable @next/next/no-img-element */
import { atlasPath } from "@/lib/atlas-path";
import { SOURCE_BRANDS, SOURCE_GROUP_BRANDS, type SourceBrand } from "@/data/source-brands";

export function SourceBrandMark({ brand, compact = false }: { brand: SourceBrand; compact?: boolean }) {
  const box = brand.wordmark ? (compact ? "h-6 w-14" : "h-8 w-24") : (compact ? "h-6 w-7" : "h-8 w-9");
  const width = brand.wordmark ? (compact ? 48 : 88) : (compact ? 22 : 26);
  const height = compact ? 18 : 24;
  return (
    <span data-source-brand-id={brand.id} aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-md border border-black/10 ${brand.darkSurface ? "bg-[#202226]" : "bg-white"} ${box}`}>
      <img src={atlasPath(brand.logo)} alt="" width={width} height={height} loading="lazy" decoding="async" className="object-contain" style={{ width, height }} />
    </span>
  );
}

export function SourceLinkMark({ brand }: { brand?: SourceBrand }) {
  if (brand) return <SourceBrandMark brand={brand} compact />;
  return (
    <span data-source-placeholder aria-hidden="true" className="inline-flex h-6 w-7 shrink-0 items-center justify-center rounded-md border border-black/10 bg-white text-gray-500">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" />
        <path d="M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" />
      </svg>
    </span>
  );
}

export function SourceBrandStrip({ group }: { group: string }) {
  return (
    <span data-source-brands className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {(SOURCE_GROUP_BRANDS[group] ?? []).map(id => {
        const brand = SOURCE_BRANDS[id];
        return (
          <span key={id} className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-4 text-muted">
            <SourceBrandMark brand={brand} />
            <span className={brand.wordmark ? "sr-only" : undefined}>{brand.label}</span>
          </span>
        );
      })}
      <span data-source-more className="inline-flex h-8 items-center whitespace-nowrap text-[11px] font-medium leading-4 text-muted">+ more</span>
    </span>
  );
}
