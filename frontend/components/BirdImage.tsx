import { FALLBACK_BIRD_IMAGE, birdImageSrc } from "@/lib/birds";
import { useTheme } from "@/components/ThemeProvider";

type BirdImageProps = {
  filename: string | null | undefined;
  widthPx: number;
  className?: string;
};

export function BirdImage({
  filename,
  widthPx,
  className = "",
}: BirdImageProps) {
  const { theme } = useTheme();
  const src = birdImageSrc(filename, theme);
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = birdImageSrc(FALLBACK_BIRD_IMAGE, theme) as string;
      }}
      alt=""
      aria-hidden="true"
      className={`bird-img shrink-0 object-contain ${className}`}
      style={{ width: `${widthPx}px`, height: "auto" }}
    />
  );
}
