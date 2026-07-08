-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'ADVANCE';

-- AlterEnum
ALTER TYPE "VoucherStatus" ADD VALUE 'ADVANCE';

-- AlterTable
ALTER TABLE "FeeVoucher" ADD COLUMN     "advanceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "partialAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "remainingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FeeVoucherPayment" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'Cash',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeVoucherPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeVoucherPayment_voucherId_idx" ON "FeeVoucherPayment"("voucherId");

-- AddForeignKey
ALTER TABLE "FeeVoucherPayment" ADD CONSTRAINT "FeeVoucherPayment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "FeeVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
