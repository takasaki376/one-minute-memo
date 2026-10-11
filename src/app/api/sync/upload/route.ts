import { postSyncUpload } from "@/lib/sync/syncRoutes";

export async function POST(request: Request): Promise<Response> {
  return postSyncUpload(request);
}
