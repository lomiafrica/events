import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Simple version without signature verification
// ⚠️ ONLY use this if you can't get signature verification working
// This is less secure but will work for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log(
      "Simple webhook received from:",
      request.headers.get("user-agent"),
    );

    const payload = JSON.parse(body);
    const { _type, slug } = payload;

    console.log("Revalidating for:", { _type, slug });

    // Revalidate based on content type
    switch (_type) {
      case "event":
        revalidateTag("events");
        if (slug?.current) {
          revalidateTag(`event-${slug.current}`);
          console.log(`Revalidated event: ${slug.current}`);
        }
        revalidatePath("/");
        revalidatePath("/events");
        break;

      case "post":
        revalidateTag("posts");
        if (slug?.current) {
          revalidateTag(`post-${slug.current}`);
        }
        revalidatePath("/blog");
        revalidatePath("/");
        break;

      default:
        revalidatePath("/");
        console.log(`Revalidated homepage for content type: ${_type}`);
    }

    return NextResponse.json({
      message: "Simple revalidation completed",
      type: _type,
      slug: slug?.current,
    });
  } catch (error) {
    console.error("Error in simple webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
