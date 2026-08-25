"use client";

import { useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  optimizeImageUrl,
  shouldBypassImageOptimizer,
  storageImageCandidates,
} from "@/lib/media";

type SmartImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src: string;
  alt: string;
  /** Requested display width hint for CDN URL rewriting when optimizer is off. */
  optimizeWidth?: number;
  /** Optional fallback UI when the remote image fails. */
  fallback?: React.ReactNode;
};

export default function SmartImage({
  src,
  alt,
  optimizeWidth = 1200,
  unoptimized,
  fallback,
  className,
  ...props
}: SmartImageProps) {
  const candidates = useMemo(() => {
    const list = storageImageCandidates(src);
    return list.map((item) => optimizeImageUrl(item, optimizeWidth) ?? item);
  }, [src, optimizeWidth]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const currentSrc = candidates[Math.min(srcIndex, candidates.length - 1)] ?? src;
  const bypass = unoptimized ?? shouldBypassImageOptimizer(currentSrc);

  if (failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <span
        aria-hidden
        className={
          className
            ? `${className} bg-gradient-to-br from-teal-mist to-teal-deep/20`
            : "absolute inset-0 bg-gradient-to-br from-teal-mist to-teal-deep/20"
        }
      />
    );
  }

  return (
    <Image
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      unoptimized={bypass}
      className={className}
      onError={() => {
        if (srcIndex < candidates.length - 1) {
          setSrcIndex((i) => i + 1);
          return;
        }
        setFailed(true);
      }}
      {...props}
    />
  );
}
