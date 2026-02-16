import { NextRequest, NextResponse } from "next/server";

const IMAGE_API =
  process.env.NEXT_PUBLIC_IMAGE_API || "https://dev-image-s.russoft-it.ru";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${IMAGE_API}/${targetPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { headers });

    const contentType =
      res.headers.get("Content-Type") || "application/octet-stream";

    if (contentType.startsWith("image/")) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: { "Content-Type": contentType },
      });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    console.error(`[PROXY] Error GET ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = `${IMAGE_API}/${targetPath}${request.nextUrl.search}`;

  const formData = await request.formData();
  const headers: Record<string, string> = {};
  const auth = request.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, { method: "POST", headers, body: formData });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error(`[PROXY] Error POST ${url}:`, error);
    return new NextResponse(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
    });
  }
}
