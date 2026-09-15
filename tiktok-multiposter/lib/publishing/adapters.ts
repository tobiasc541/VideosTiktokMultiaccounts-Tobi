import { initVideoPost } from "../tiktok";

export type PublishTarget = { platform: "tiktok" | "instagram" | "facebook"; accountId: string; name?: string };
export type StoredVideo = { bytes: Uint8Array; size: number; mimeType: string };
export type PublishPayload = { caption: string; privacyLevel?: string | null; video: StoredVideo };

async function uploadTikTok(bytes: Uint8Array, uploadUrl: string, chunkSize: number, totalChunkCount: number) {
  const total = bytes.byteLength;
  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const endExclusive = i === totalChunkCount - 1 ? total : Math.min(start + chunkSize, total);
    const body = bytes.slice(start, endExclusive);
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${endExclusive - 1}/${total}` },
      body
    });
    if (![200, 201, 206].includes(res.status)) throw new Error(`TikTok upload HTTP ${res.status}`);
  }
}

export async function publishToTarget(target: PublishTarget, payload: PublishPayload) {
  if (target.platform === "tiktok") {
    if (!payload.privacyLevel) throw new Error("Falta privacidad de TikTok.");
    const init = await initVideoPost({
      accountId: target.accountId,
      caption: payload.caption,
      privacyLevel: payload.privacyLevel,
      videoSize: payload.video.size
    });
    await uploadTikTok(payload.video.bytes, init.uploadUrl, init.chunkSize, init.totalChunkCount);
    return { ok: true, platform: "tiktok", publishId: init.publishId };
  }

  // These adapters intentionally keep the queue/platform contract stable while Meta review is pending.
  // When Meta approves the app, only these branches need to call Instagram/Facebook publishing APIs.
  if (target.platform === "instagram") return { ok: false, awaitingApi: true, platform: "instagram", message: "Instagram API pendiente de aprobación." };
  if (target.platform === "facebook") return { ok: false, awaitingApi: true, platform: "facebook", message: "Facebook API pendiente de aprobación." };
  throw new Error("Plataforma no soportada.");
}
