-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CertificateType" ADD VALUE 'BONAFIDE';
ALTER TYPE "CertificateType" ADD VALUE 'OFFER_LETTER';
ALTER TYPE "CertificateType" ADD VALUE 'EXPERIENCE_LETTER';
ALTER TYPE "CertificateType" ADD VALUE 'RESIGNATION_LETTER';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "lastWorkingDate" TIMESTAMP(3),
ADD COLUMN     "leavingDate" TIMESTAMP(3),
ADD COLUMN     "noticePeriod" TEXT,
ADD COLUMN     "resignationDate" TIMESTAMP(3),
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "teacherId" INTEGER,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "workingHours" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "familyId" INTEGER,
ADD COLUMN     "photoBase64" TEXT,
ADD COLUMN     "studentCNIC" TEXT;

-- CreateTable
CREATE TABLE "Family" (
    "id" SERIAL NOT NULL,
    "fid" TEXT NOT NULL,
    "guardianCNIC" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeOverride" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "isYearLong" BOOLEAN NOT NULL DEFAULT false,
    "month" INTEGER,
    "year" INTEGER,
    "academicYearId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_fid_key" ON "Family"("fid");

-- CreateIndex
CREATE UNIQUE INDEX "Family_guardianCNIC_key" ON "Family"("guardianCNIC");

-- CreateIndex
CREATE INDEX "StudentFeeOverride_studentId_idx" ON "StudentFeeOverride"("studentId");

-- CreateIndex
CREATE INDEX "StudentFeeOverride_studentId_description_month_year_idx" ON "StudentFeeOverride"("studentId", "description", "month", "year");

-- CreateIndex
CREATE INDEX "Certificate_studentId_idx" ON "Certificate"("studentId");

-- CreateIndex
CREATE INDEX "Certificate_teacherId_idx" ON "Certificate"("teacherId");

-- CreateIndex
CREATE INDEX "Certificate_type_idx" ON "Certificate"("type");

-- CreateIndex
CREATE INDEX "Student_familyId_idx" ON "Student"("familyId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeOverride" ADD CONSTRAINT "StudentFeeOverride_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeOverride" ADD CONSTRAINT "StudentFeeOverride_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
