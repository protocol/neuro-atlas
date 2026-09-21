/* eslint-disable @next/next/no-img-element */
import { atlasPath } from "@/lib/atlas-path";

export function FirmLogo({
  src,
  name,
  size = 18,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={atlasPath(src)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-[5px] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[5px] bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
