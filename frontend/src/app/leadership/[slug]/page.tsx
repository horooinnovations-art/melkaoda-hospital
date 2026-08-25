import LeaderDetail from "./LeaderDetail";
import { fetchResourceItem } from "@/lib/api";

export default async function LeadershipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Leader";
  let subtitle = "";
  try {
    const leader = await fetchResourceItem<Record<string, string>>(
      "leadership",
      slug
    );
    if (leader?.name) title = leader.name;
    if (leader?.position) subtitle = leader.position;
  } catch {
    // fallback to default
  }

  return (
    <LeaderDetail slug={slug} heroTitle={title} heroSubtitle={subtitle} />
  );
}
