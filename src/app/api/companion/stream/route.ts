import { getLatestFrame, subscribe } from "@/lib/companion/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/companion/stream?token=...
 * SSE endpoint. Emits the latest frame on connect (if one exists), then every
 * subsequent frame as the companion pushes it. Heartbeat every 25s to keep the
 * connection alive through proxies.
 *
 * Token in querystring is acceptable for Phase 0. Phase 1 should swap to a
 * short-lived signed sub-token to avoid token leakage in referrers/logs.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) {
    return new Response("Missing or malformed token", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller closed; cleanup happens via the abort listener
        }
      };

      // Replay the latest frame so the page hydrates immediately on reconnect.
      const latest = getLatestFrame(token);
      if (latest) send("frame", latest);
      else send("hello", { paired: false });

      const unsubscribe = subscribe(token, (frame) => send("frame", frame));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
