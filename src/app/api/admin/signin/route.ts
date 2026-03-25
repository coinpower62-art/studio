export const runtime = 'edge';
import { NextResponse } from 'next/server';

// This API route is deprecated as of the admin login consolidation.
// Admin login is now handled via the primary /login server action.
export async function POST(request: Request) {
  return NextResponse.json(
    { message: "This route is no longer in use. Please use the main /login page." },
    { status: 410 } // 410 Gone
  );
}
