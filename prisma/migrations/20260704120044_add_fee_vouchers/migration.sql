-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'CANCELLED');

-- CreateTable
CREATE TABLE "FeeVoucher" (
    "id" SERIAL NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeVoucherItem" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeVoucherItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeVoucher_voucherNumber_key" ON "FeeVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "FeeVoucher_studentId_idx" ON "FeeVoucher"("studentId");

-- CreateIndex
CREATE INDEX "FeeVoucher_status_idx" ON "FeeVoucher"("status");

-- CreateIndex
CREATE INDEX "FeeVoucher_month_year_idx" ON "FeeVoucher"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "FeeVoucher_studentId_month_year_key" ON "FeeVoucher"("studentId", "month", "year");

-- CreateIndex
CREATE INDEX "FeeVoucherItem_voucherId_idx" ON "FeeVoucherItem"("voucherId");

-- AddForeignKey
ALTER TABLE "FeeVoucher" ADD CONSTRAINT "FeeVoucher_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeVoucherItem" ADD CONSTRAINT "FeeVoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "FeeVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
