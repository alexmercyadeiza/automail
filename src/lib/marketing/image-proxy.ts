import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";

export async function proxyImageToStorage(imageUrl: string): Promise<string> {
  if (SUPABASE_URL && imageUrl.startsWith(SUPABASE_URL)) {
    return imageUrl;
  }
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn(
        `Failed to fetch external image (${response.status}): ${imageUrl}`,
      );
      return imageUrl;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = extMap[contentType] || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const path = `marketing-emails/${filename}`;

    const buffer = Buffer.from(await response.arrayBuffer());

    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from("uploads")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      console.warn(`Failed to upload proxied image: ${error.message}`);
      return imageUrl;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
    console.log(`Proxied external image: ${imageUrl} → ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(
      "Image proxy error:",
      err instanceof Error ? err.message : err,
    );
    return imageUrl;
  }
}

export async function proxyExternalImages(html: string): Promise<string> {
  if (!SUPABASE_URL) return html;

  const imgSrcRegex = /<img\s[^>]*src\s*=\s*"([^"]+)"/gi;
  const matches: { url: string }[] = [];
  let match: RegExpExecArray | null;

  while (true) {
    match = imgSrcRegex.exec(html);
    if (!match) break;
    const url = match[1];
    if (url && !url.startsWith(SUPABASE_URL) && !url.startsWith("data:")) {
      matches.push({ url });
    }
  }

  if (matches.length === 0) return html;

  const uniqueUrls = [...new Set(matches.map((m) => m.url))];

  const results = await Promise.all(
    uniqueUrls.map(async (url) => ({
      original: url,
      proxied: await proxyImageToStorage(url),
    })),
  );

  let result = html;
  for (const { original, proxied } of results) {
    if (proxied !== original) {
      result = result.replaceAll(original, proxied);
    }
  }

  return result;
}
