import { DEFAULT_DISCOVERY_INPUT, discoverCreators } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const input = {
      ...DEFAULT_DISCOVERY_INPUT,
      ...body,
      keywords: Array.isArray(body?.keywords)
        ? body.keywords.filter(Boolean)
        : DEFAULT_DISCOVERY_INPUT.keywords,
      platforms: Array.isArray(body?.platforms) && body.platforms.length
        ? body.platforms
        : DEFAULT_DISCOVERY_INPUT.platforms,
    };

    const profiles = await discoverCreators(input);
    return Response.json({ profiles });
  } catch (error) {
    return Response.json(
      { error: error.message || "Discovery failed" },
      { status: 500 },
    );
  }
}
