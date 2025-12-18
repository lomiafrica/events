import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Forward the request to Sanity API
    const sanityUrl = `https://11qckjsr.api.sanity.io/v2023-05-03/data/query/production?query=${encodeURIComponent(query)}&returnQuery=false`;

    const response = await fetch(sanityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sanity API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Sanity proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Sanity' }, { status: 500 });
  }
}
