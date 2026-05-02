import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Riot Data Dragon
      { protocol: "https", hostname: "ddragon.leagueoflegends.com" },
      // Steam CDN for Dota hero icons
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
    ],
  },
};

export default nextConfig;
