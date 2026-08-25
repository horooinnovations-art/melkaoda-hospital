/** Injects favicon <link> tags pointing at the hospital logo in /public. */
export default function FaviconLinks() {
  return (
    <>
      <link rel="icon" href="/vercel.svg" type="image/svg+xml" sizes="any" />
      <link rel="shortcut icon" href="/vercel.svg" />
      <link rel="apple-touch-icon" href="/vercel.svg" />
    </>
  );
}
