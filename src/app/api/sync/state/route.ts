import { readSyncState } from "@/lib/sync/syncRoutes";

export async function GET(request: Request): Promise<Response> {
  return readSyncState(request);
}
