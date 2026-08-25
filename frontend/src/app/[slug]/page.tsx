import { notFound } from "next/navigation";
import CmsPage from "./CmsPage";

const RESERVED = new Set([
  "about",
  "departments",
  "services",
  "doctors",
  "leadership",
  "news",
  "announcements",
  "gallery",
  "contact",
  "emergency",
  "insurance",
  "partnerships",
  "partners",
  "careers",
  "events",
  "testimonials",
  "faqs",
  "health-education",
  "admin",
  "api",
  "_next",
]);

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (RESERVED.has(slug)) {
    notFound();
  }

  return <CmsPage slug={slug} />;
}
