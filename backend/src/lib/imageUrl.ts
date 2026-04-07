import env from "../config/env.js";

const hasHttpScheme = (value: string) => /^https?:\/\//i.test(value);

const encodePath = (value: string) =>
  value
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join("/");

const buildSupabasePublicUrl = (bucket: string, path: string): string => {
  const base = env.supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${encodePath(bucket)}/${encodePath(path)}`;
};

export const resolveImageUrl = (rawValue: string | undefined | null): string => {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }
  if (hasHttpScheme(value)) {
    return value;
  }
  if (env.imageStorageProvider !== "supabase" || !env.supabaseUrl) {
    return value;
  }

  if (value.startsWith("supabase://")) {
    const withoutScheme = value.slice("supabase://".length);
    const slashIdx = withoutScheme.indexOf("/");
    if (slashIdx <= 0) {
      return value;
    }
    const bucket = withoutScheme.slice(0, slashIdx);
    const path = withoutScheme.slice(slashIdx + 1);
    if (!bucket || !path) {
      return value;
    }
    return buildSupabasePublicUrl(bucket, path);
  }

  if (!env.supabaseStorageBucket) {
    return value;
  }

  return buildSupabasePublicUrl(env.supabaseStorageBucket, value.replace(/^\/+/, ""));
};

export default resolveImageUrl;
