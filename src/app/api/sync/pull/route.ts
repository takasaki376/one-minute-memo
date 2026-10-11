import { postSyncPull } from "@/lib/sync/syncRoutes";

export async function POST(request: Request): Promise<Response> {
  return postSyncPull(request);
}
