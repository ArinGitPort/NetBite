import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { AssetRow } from "@/lib/api/types";

export async function getAssets(): Promise<AssetRow[]> {
  const client = getPortalClient();
  const { data, error } = await client.from("content_assets").select("id,lesson_id,object_path,mime_type,byte_size,width,height,alt_text,published").order("created_at", { ascending: false });
  throwIfServiceError(error);
  return Promise.all(((data ?? []) as AssetRow[]).map(async (asset) => {
    const { data: signed } = await client.storage.from("netbite-content").createSignedUrl(asset.object_path, 300);
    return { ...asset, preview_url: signed?.signedUrl };
  }));
}
export async function uploadAsset(file: File, altText: string, dimensions: { width: number; height: number }, lessonId?: string): Promise<void> {
  const client = getPortalClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `drafts/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("netbite-content").upload(path, file, { contentType: file.type });
  throwIfServiceError(uploadError);
  const { error } = await client.from("content_assets").insert({ lesson_id: lessonId || null, object_path: path, mime_type: file.type, byte_size: file.size, width: dimensions.width, height: dimensions.height, alt_text: altText.trim() });
  if (error) {
    await client.storage.from("netbite-content").remove([path]);
    throwIfServiceError(error, "The image details could not be saved. The upload was removed safely.");
  }
}
export async function deleteAsset(asset: AssetRow): Promise<void> {
  const client = getPortalClient();
  const { error: storageError } = await client.storage.from("netbite-content").remove([asset.object_path]);
  throwIfServiceError(storageError);
  const { error } = await client.from("content_assets").delete().eq("id", asset.id);
  throwIfServiceError(error);
}
