import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// Sanity webhook secret - add this to your environment variables
const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;

async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!SANITY_WEBHOOK_SECRET) {
    console.error('SANITY_WEBHOOK_SECRET is not configured');
    return false;
  }

  const expectedSignature = createHmac('sha256', SANITY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('sanity-webhook-signature') || '';

    // Verify webhook signature
    if (!await verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { _type, slug } = payload;

    console.log('Sanity webhook received:', { _type, slug });

    // Revalidate based on content type
    switch (_type) {
      case 'event':
        // Revalidate by tags (more efficient)
        revalidateTag('events');
        if (slug?.current) {
          revalidateTag(`event-${slug.current}`);
          console.log(`Revalidated event: ${slug.current}`);
        }
        // Also revalidate specific paths
        revalidatePath('/');
        revalidatePath('/events');
        break;

      case 'post':
        // Revalidate by tags
        revalidateTag('posts');
        if (slug?.current) {
          revalidateTag(`post-${slug.current}`);
          console.log(`Revalidated blog post: ${slug.current}`);
        }
        // Also revalidate specific paths
        revalidatePath('/blog');
        revalidatePath('/');
        break;

      case 'product':
        // Revalidate by tags
        revalidateTag('products');
        if (slug?.current) {
          revalidateTag(`product-${slug.current}`);
          console.log(`Revalidated product: ${slug.current}`);
        }
        // Also revalidate specific paths
        revalidatePath('/shop');
        break;

      case 'story':
        // Revalidate story-related content
        revalidateTag('story');
        revalidatePath('/story');
        revalidatePath('/');
        break;

      case 'homepage':
        // Revalidate homepage-specific content
        revalidateTag('homepage');
        revalidateTag('videos');
        revalidatePath('/');
        console.log('Revalidated homepage content');
        break;

      default:
        // For any other content type, revalidate homepage
        revalidatePath('/');
        console.log(`Revalidated homepage for content type: ${_type}`);
    }

    return NextResponse.json({ 
      message: 'Revalidation triggered successfully',
      type: _type,
      slug: slug?.current 
    });

  } catch (error) {
    console.error('Error in revalidate webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 