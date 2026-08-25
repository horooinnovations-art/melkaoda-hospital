/** Compatibility wrapper — page enter is handled once in PublicShell. */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
