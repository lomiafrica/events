import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query : null;

    if (!query) {
      return NextResponse.json(
        { error: "Body must include { query: string }" },
        { status: 400 },
      );
    }

    // Forward the request to Sanity API (query in URL for Sanity's GET API)
    const sanityUrl = `https://11qckjsr.api.sanity.io/v2023-05-03/data/query/production?query=${encodeURIComponent(query)}&returnQuery=false`;

    const response = await fetch(sanityUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Only log errors, not successful requests
      console.error(`Sanity API error: ${response.status}`);
      throw new Error(`Sanity API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Sanity proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Sanity" },
      { status: 500 },
    );
  }
}
