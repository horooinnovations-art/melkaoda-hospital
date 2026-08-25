import { cn } from "@/lib/utils";

/**
 * Fancy institutional canvas used under PageHero on interior pages.
 */
export default function PageBody({
  children,
  className,
  narrow = false,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className="g-pagebody relative -mx-[calc((100vw-100%)/2)] w-screen">
      <div className="g-pagebody__aura" aria-hidden />
      <div className="g-pagebody__mesh" aria-hidden />
      <div
        className={cn(
          "g-pagebody__inner relative z-[1] mx-auto px-5 py-14 lg:px-8 lg:py-16",
          narrow ? "max-w-4xl" : "max-w-7xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
