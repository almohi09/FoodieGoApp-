import env from "../config/env.js";
import type { Session } from "../types.js";
import { resolveImageUrl } from "./imageUrl.js";

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;
const SAFE_FOLDER = /^[a-z0-9/_-]+$/;

const contentTypeExtensionMap: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const roleBaseFolderAllowList: Record<Session["role"], string[]> = {
  customer: ["general", "profile", "support"],
  seller: ["general", "menu", "profile", "kyc", "support"],
  admin: ["general", "moderation", "support"],
  rider: ["general", "profile", "support"],
};

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

const normalizeFileName = (raw: string): string => raw.trim().replace(/\s+/g, "_");

const inferExtension = (fileName: string, contentType: string): string => {
  const fromMime = contentTypeExtensionMap[contentType.toLowerCase()];
  if (fromMime) return fromMime;
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (/^[a-z0-9]{2,6}$/.test(ext)) {
    return ext;
  }
  return "bin";
};

const getBaseFolder = (folder: string): string => {
  const normalized = folder.replace(/^\/+|\/+$/g, "");
  return normalized.split("/")[0] || "";
};

const isFolderAllowedForRole = (role: Session["role"], folder: string): boolean => {
  const roleAllowed = roleBaseFolderAllowList[role] || [];
  const baseFolder = getBaseFolder(folder);
  return roleAllowed.includes(baseFolder);
};

export const validateUploadInput = (body: any, session: Session) => {
  const fileName = normalizeFileName(String(body?.fileName || ""));
  const contentType = String(body?.contentType || "").trim().toLowerCase();
  const folder = String(body?.folder || "general").trim().toLowerCase();
  const fileSizeBytes = Number(body?.fileSizeBytes || 0);
  if (!fileName || !SAFE_NAME.test(fileName)) {
    return { ok: false as const, message: "Invalid fileName", details: { field: "fileName" } };
  }
  if (fileName.length > 120) {
    return { ok: false as const, message: "fileName is too long", details: { field: "fileName", max: 120 } };
  }
  if (!contentType) {
    return { ok: false as const, message: "contentType is required", details: { field: "contentType" } };
  }
  if (!env.supabaseAllowedUploadMimeTypes.includes(contentType)) {
    return {
      ok: false as const,
      message: "Unsupported contentType",
      details: { field: "contentType", allowed: env.supabaseAllowedUploadMimeTypes },
    };
  }
  if (!folder || !SAFE_FOLDER.test(folder) || folder.includes("..")) {
    return { ok: false as const, message: "Invalid folder", details: { field: "folder" } };
  }
  const baseFolder = getBaseFolder(folder);
  if (!baseFolder || !env.supabaseAllowedUploadFolders.includes(baseFolder)) {
    return {
      ok: false as const,
      message: "Folder is not allowed",
      details: { field: "folder", allowed: env.supabaseAllowedUploadFolders },
    };
  }
  if (!isFolderAllowedForRole(session.role, folder)) {
    return {
      ok: false as const,
      message: "Role is not allowed to upload to this folder",
      details: { field: "folder", role: session.role, baseFolder },
    };
  }
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { ok: false as const, message: "fileSizeBytes is required", details: { field: "fileSizeBytes" } };
  }
  if (fileSizeBytes > env.supabaseUploadMaxBytes) {
    return {
      ok: false as const,
      message: "fileSizeBytes exceeds allowed maximum",
      details: { field: "fileSizeBytes", maxBytes: env.supabaseUploadMaxBytes },
    };
  }
  return { ok: true as const, data: { fileName, contentType, folder, fileSizeBytes } };
};

const encodePath = (value: string) =>
  value
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join("/");

export const buildObjectPath = (session: Session, folder: string, fileName: string, contentType: string): string => {
  const ext = inferExtension(fileName, contentType);
  return `${session.role}/${session.userId}/${folder}/${Date.now()}_${randomSuffix()}.${ext}`;
};

export const createSupabaseSignedUpload = async (objectPath: string) => {
  if (env.imageStorageProvider !== "supabase") {
    throw new Error("IMAGE_STORAGE_PROVIDER must be supabase for signed uploads.");
  }
  if (!env.supabaseUrl || !env.supabaseStorageBucket || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase storage env is incomplete.");
  }
  const baseUrl = env.supabaseUrl.replace(/\/+$/, "");
  const endpoint = `${baseUrl}/storage/v1/object/upload/sign/${encodePath(env.supabaseStorageBucket)}/${encodePath(objectPath)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
    body: JSON.stringify({ expiresIn: Math.max(30, Math.floor(env.supabaseSignedUploadTtlSec)) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String((payload as any)?.error || (payload as any)?.message || response.statusText);
    throw new Error(`Supabase sign upload failed: ${message}`);
  }
  const token = String((payload as any)?.token || "");
  const signedRelative = String((payload as any)?.signedURL || (payload as any)?.signedUrl || "");
  const signedUploadUrl = signedRelative
    ? /^https?:\/\//i.test(signedRelative)
      ? signedRelative
      : `${baseUrl}${signedRelative.startsWith("/") ? signedRelative : `/${signedRelative}`}`
    : token
      ? `${endpoint}?token=${encodeURIComponent(token)}`
      : "";
  if (!signedUploadUrl) {
    throw new Error("Supabase signed upload response missing URL.");
  }
  return {
    signedUploadUrl,
    objectPath,
    publicUrl: resolveImageUrl(`supabase://${env.supabaseStorageBucket}/${objectPath}`),
    expiresInSec: Math.max(30, Math.floor(env.supabaseSignedUploadTtlSec)),
  };
};
