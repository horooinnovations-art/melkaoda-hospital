import { fetchHome } from "@/lib/api";
import type { HomeData } from "@/lib/types";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  let initialData: HomeData | null = null;
  try {
    initialData = await fetchHome();
  } catch {
    initialData = null;
  }

  return <HomeClient initialData={initialData} />;
}
