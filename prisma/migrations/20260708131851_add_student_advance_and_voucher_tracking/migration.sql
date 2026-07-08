-- AlterTable
ALTER TABLE "FeeVoucher" ADD COLUMN     "appliedAdvance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "originalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "advanceBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdvanceBalanceLog" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "adjustmentAmount" DECIMAL(10,2) NOT NULL,
    "previousBalance" DECIMAL(10,2) NOT NULL,
    "newBalance" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "adminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvanceBalanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdvanceBalanceLog_studentId_idx" ON "AdvanceBalanceLog"("studentId");

-- AddForeignKey
ALTER TABLE "AdvanceBalanceLog" ADD CONSTRAINT "AdvanceBalanceLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
