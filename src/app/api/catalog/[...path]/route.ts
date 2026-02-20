import { NextRequest, NextResponse } from "next/server";

function getCatalogApi() {
  return (
    process.env.CATALOG_API ||
    process.env.NEXT_PUBLIC_CATALOG_API ||
    "https://dev-catalog-s.russoft-it.ru"
  );
}

function proxyError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[PROXY]", message);
  return new NextResponse(
    JSON.stringify({ error: "Proxy error", detail: message }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const base = getCatalogApi();
  const targetPath = path.join("/");
  const url = `${base}/${targetPath}${request.nextUrl.search}`;

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
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    return proxyError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const base = getCatalogApi();
  const targetPath = path.join("/");
  const url = `${base}/${targetPath}${request.nextUrl.search}`;

  const body = await request.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    return proxyError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const base = getCatalogApi();
  const targetPath = path.join("/");
  const url = `${base}/${targetPath}${request.nextUrl.search}`;

  const body = await request.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    return proxyError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const base = getCatalogApi();
  const targetPath = path.join("/");
  const url = `${base}/${targetPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    return proxyError(error);
  }
}
