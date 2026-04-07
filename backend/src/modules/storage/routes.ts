import { Router } from "express";
import { sendApiError } from "../../lib/httpErrors.js";
import { buildObjectPath, createSupabaseSignedUpload, validateUploadInput } from "../../lib/storageUpload.js";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth.js";

const router = Router();

router.post(
  "/storage/signed-upload",
  requireAuth,
  requireRole(["customer", "seller", "admin"]),
  async (req: AuthedRequest, res) => {
    const parsed = validateUploadInput(req.body, req.session!);
    if (!parsed.ok) {
      return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
    }
    try {
      const objectPath = buildObjectPath(
        req.session!,
        parsed.data.folder,
        parsed.data.fileName,
        parsed.data.contentType,
      );
      const signed = await createSupabaseSignedUpload(objectPath);
      return res.json({
        success: true,
        upload: {
          provider: "supabase",
          objectPath: signed.objectPath,
          signedUploadUrl: signed.signedUploadUrl,
          publicUrl: signed.publicUrl,
          expiresInSec: signed.expiresInSec,
          contentType: parsed.data.contentType,
          requestedFileSizeBytes: parsed.data.fileSizeBytes,
        },
      });
    } catch (error: any) {
      return sendApiError(res, 503, "INTERNAL_ERROR", "Unable to generate upload URL", {
        reason: String(error?.message || "unknown"),
      });
    }
  },
);

export default router;
