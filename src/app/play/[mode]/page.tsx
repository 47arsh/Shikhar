import { GameplayScreen } from "@/components/GameplayScreen";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GameplayScreen mode={mode as "daily" | "free"} />
    </div>
  );
}
