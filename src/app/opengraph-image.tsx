import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Peeked — live draft coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0c",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
            <rect x="38" y="8" width="20" height="20" rx="1" fill="#a1ff36" opacity="0.45" />
            <path d="M 6 22 H 42 V 58 H 6 Z" fill="#a1ff36" />
            <path d="M 18 22 L 30 58 L 22 58 L 10 22 Z" fill="#0a0a0c" />
          </svg>
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#f5f4f7",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span>peeked</span>
            <span style={{ color: "#a1ff36", margin: "0 4px" }}>·</span>
            <span style={{ color: "#999", fontWeight: 400 }}>app</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#999",
            letterSpacing: "0.04em",
          }}
        >
          live draft coach · league + dota · public APIs
        </div>
      </div>
    ),
    { ...size },
  );
}
