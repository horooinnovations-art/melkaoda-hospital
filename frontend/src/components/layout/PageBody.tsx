import { cn } from "@/lib/utils";

/**
 * The lit field under every interior page hero.
 *
 * This used to be a light canvas with an aura and a mesh over it, which is why
 * an interior page turned white a few hundred pixels below a dark opening. It
 * now carries the same three layers as the homepage field, defined in
 * nova-page.css: a drifting rail layer on the same interval as the hero above
 * it, one wash that decays over the first screenful, and flat charcoal for the
 * long tail of a list page.
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
    <div className="nv-pb relative -mx-[calc((100vw-100%)/2)] w-screen">
      <span className="nv-pb__glow" aria-hidden />
      <div
        className={cn(
          "nv-pb__inner mx-auto px-5 py-14 lg:px-8 lg:py-16",
          narrow ? "max-w-4xl" : "max-w-7xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
