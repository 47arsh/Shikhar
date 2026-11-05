import { ImageResponse } from "@next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          background: "linear-gradient(180deg, #1E3A8A 0%, #0F172A 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "64px", fontWeight: "bold", margin: 0 }}>
          Shikhar
        </h1>
        <p style={{ fontSize: "32px", color: "#FDE68A", margin: "16px 0" }}>
          Indian Rarity-Trivia Climbing Game
        </p>
        <p style={{ fontSize: "24px", color: "#94A3B8", margin: 0 }}>
          Climb Kanchenjunga with rare answers
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
