import assert from "node:assert/strict";
import test from "node:test";
import { buildObjectPath, validateUploadInput } from "../../lib/storageUpload.js";

const sellerSession = {
  token: "atk_1",
  refreshToken: "rtk_1",
  role: "seller" as const,
  userId: "seller_abc",
  createdAt: new Date().toISOString(),
};

test("validateUploadInput accepts supported image payload", () => {
  const parsed = validateUploadInput(
    {
      fileName: "menu-item.png",
      contentType: "image/png",
      folder: "menu/items",
      fileSizeBytes: 1024,
    },
    sellerSession,
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.fileName, "menu-item.png");
    assert.equal(parsed.data.contentType, "image/png");
    assert.equal(parsed.data.folder, "menu/items");
  }
});

test("validateUploadInput rejects unsupported mime type", () => {
  const parsed = validateUploadInput(
    {
      fileName: "payload.svg",
      contentType: "image/svg+xml",
      fileSizeBytes: 100,
    },
    sellerSession,
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Unsupported contentType");
  }
});

test("validateUploadInput rejects unsafe folder", () => {
  const parsed = validateUploadInput(
    {
      fileName: "menu-item.png",
      contentType: "image/png",
      folder: "../secrets",
      fileSizeBytes: 100,
    },
    sellerSession,
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Invalid folder");
  }
});

test("validateUploadInput rejects folder that role cannot access", () => {
  const parsed = validateUploadInput(
    {
      fileName: "proof.jpg",
      contentType: "image/jpeg",
      folder: "moderation/reports",
      fileSizeBytes: 2048,
    },
    sellerSession,
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Role is not allowed to upload to this folder");
  }
});

test("validateUploadInput rejects oversized payload", () => {
  const parsed = validateUploadInput(
    {
      fileName: "menu-item.png",
      contentType: "image/png",
      folder: "menu/items",
      fileSizeBytes: 10 * 1024 * 1024,
    },
    sellerSession,
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "fileSizeBytes exceeds allowed maximum");
  }
});

test("buildObjectPath scopes path by role and user id", () => {
  const objectPath = buildObjectPath(
    sellerSession,
    "menu",
    "item.jpg",
    "image/jpeg",
  );
  assert.equal(objectPath.startsWith("seller/seller_abc/menu/"), true);
  assert.equal(objectPath.endsWith(".jpg"), true);
});
