import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Redirect /robot.txt to /robots.txt
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return NextResponse.redirect(new URL('/robots.txt', baseUrl), 301);
}

