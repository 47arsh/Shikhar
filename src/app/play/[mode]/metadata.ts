import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mode: string }> | { mode: string };
}): Promise<Metadata> {
  const { mode } = await params;
  const modeLabel = mode === "daily" ? "Daily Climb" : "Free Climb";

  return {
    title: `Shikhar - ${modeLabel}`,
    description: `Play Shikhar - the ${modeLabel.toLowerCase()}. Name real answers and climb Kanchenjunga.`,
    openGraph: {
      title: `Shikhar - ${modeLabel}`,
      description: `Play Shikhar - the ${modeLabel.toLowerCase()}. Name real answers and climb Kanchenjunga.`,
      type: "website",
    },
  };
}
