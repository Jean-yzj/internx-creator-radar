import CreatorRadarWorkspace from "@/components/CreatorRadarWorkspace";
import { seedProfiles } from "@/data/seedProfiles";
import { DEFAULT_DISCOVERY_INPUT } from "@/lib/discovery";

export const dynamic = "force-dynamic";

function createInitialProfiles() {
  return seedProfiles.map((profile, index) => ({
    ...profile,
    bio: profile.bio || "頁面載入後會自動補齊最新公開簡介與粉絲數。",
    score: 60 - index,
    collabAngleShort: "待同步",
  }));
}

export default function Home() {
  return (
    <CreatorRadarWorkspace
      initialProfiles={createInitialProfiles()}
      initialInput={DEFAULT_DISCOVERY_INPUT}
    />
  );
}
