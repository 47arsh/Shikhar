import { GameplayScreen } from "@/components/GameplayScreen";
import { notFound } from "next/navigation";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  // Validate mode instead of blindly casting
  if (mode !== "daily" && mode !== "free") {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GameplayScreen mode={mode as "daily" | "free"} />
    </div>
  );
}
