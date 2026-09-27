import type { Platform, PlatformProfile } from "../types";

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  "TikTok": {
    name: "TikTok",
    weights: { hook: 0.35, pacing: 0.30, emotion: 0.15, value: 0.10, cta: 0.10 },
    idealSentenceLength: { min: 5, max: 9 },
    hookMaxWords: 10,
  },
  "YouTube Shorts": {
    name: "YouTube Shorts",
    weights: { hook: 0.30, pacing: 0.25, emotion: 0.15, value: 0.20, cta: 0.10 },
    idealSentenceLength: { min: 6, max: 11 },
    hookMaxWords: 12,
  },
  "Instagram Reels": {
    name: "Instagram Reels",
    weights: { hook: 0.25, pacing: 0.25, emotion: 0.25, value: 0.10, cta: 0.15 },
    idealSentenceLength: { min: 6, max: 11 },
    hookMaxWords: 12,
  },
};

export function getPlatformProfile(platform?: string): PlatformProfile {
  if (platform && PLATFORM_PROFILES[platform]) {
    return PLATFORM_PROFILES[platform];
  }
  return PLATFORM_PROFILES["YouTube Shorts"];
}
