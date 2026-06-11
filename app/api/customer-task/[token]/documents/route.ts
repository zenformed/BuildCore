import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'deprecated',
      message: 'Use direct upload: POST /api/customer-task/[token]/direct-uploads/prepare',
    },
    { status: 410 }
  );
}
