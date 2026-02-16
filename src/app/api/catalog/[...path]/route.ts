import { NextRequest, NextResponse } from "next/server";

const CATALOG_API = process.env.NEXT_PUBLIC_CATALOG_API || "https://dev-catalog-s.russoft-it.ru";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${CATALOG_API}/${targetPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { headers });
    
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error(`[PROXY] Error GET ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${CATALOG_API}/${targetPath}${request.nextUrl.search}`;

  const body = await request.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error(`[PROXY] Error POST ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${CATALOG_API}/${targetPath}${request.nextUrl.search}`;

  const body = await request.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { method: "PATCH", headers, body });
    
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error(`[PROXY] Error PATCH ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${CATALOG_API}/${targetPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { method: "DELETE", headers });
    
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error(`[PROXY] Error DELETE ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), { status: 500 });
  }
}
