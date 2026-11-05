"use client";

import { useEffect, useState } from "react";

interface WindowWithAds extends Window {
  adsbygoogle?: { loaded?: boolean };
}

const win = window as unknown as WindowWithAds;

interface AdSensePlaceholderProps {
  width?: string;
  height?: string;
  adTest?: boolean;
}

export function AdSensePlaceholder({
  width = "100%",
  height = "280px",
  adTest = false,
}: AdSensePlaceholderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!win.adsbygoogle) return;

    // Mark as loaded once the AdSense script initializes
    const interval = setInterval(() => {
      if (win.adsbygoogle?.loaded) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="adsense-placeholder"
      style={{
        width,
        height,
        minHeight: height,
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        border: "1px dashed #cbd5e1",
        borderRadius: "0.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "1rem 0",
      }}
    >
      {loaded ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || ""}
          data-ad-test={adTest}
        ></ins>
      ) : (
        <div className="text-xs text-slate-400 text-center">
          Ad placeholder{adTest ? " (test mode)" : ""}
        </div>
      )}
    </div>
  );
}
