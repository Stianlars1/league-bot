import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
          <rect x="38" y="8" width="20" height="20" rx="1" fill="#a1ff36" opacity="0.45" />
          <path d="M 6 22 H 42 V 58 H 6 Z" fill="#a1ff36" />
          <path d="M 18 22 L 30 58 L 22 58 L 10 22 Z" fill="#0a0a0c" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
