import { type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${BACKEND_URL}/api/v1/${targetPath}${queryString}`;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseBody = await response.arrayBuffer();
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      responseHeaders.set(key, value);
    }
  });

  return new Response(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
