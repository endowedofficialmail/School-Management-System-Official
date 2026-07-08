-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('BIRTH', 'SCHOOL_LEAVING', 'CHARACTER');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "studentId" INTEGER NOT NULL,
    "issuedById" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "fatherName" TEXT,
    "motherName" TEXT,
    "fatherCNIC" TEXT,
    "motherCNIC" TEXT,
    "fatherOccupation" TEXT,
    "dateOfLeaving" TIMESTAMP(3),
    "lastClass" TEXT,
    "reasonForLeaving" TEXT,
    "conductDuringStay" TEXT,
    "characterRemarks" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
