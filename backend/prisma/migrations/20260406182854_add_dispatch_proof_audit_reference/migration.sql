-- AlterTable
ALTER TABLE "DispatchOrder" ADD COLUMN     "proofAuditLogId" TEXT,
ADD COLUMN     "proofCapturedAt" TIMESTAMP(3),
ADD COLUMN     "proofHash" TEXT;

-- CreateIndex
CREATE INDEX "DispatchOrder_proofAuditLogId_idx" ON "DispatchOrder"("proofAuditLogId");
