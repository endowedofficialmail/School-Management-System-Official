-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_classId_fkey";

-- AlterTable
ALTER TABLE "Exam" ALTER COLUMN "classId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExamClass" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollNumberSlip" (
    "id" SERIAL NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "issuedById" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venue" TEXT,
    "instructions" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RollNumberSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamClass_examId_classId_key" ON "ExamClass"("examId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "RollNumberSlip_rollNumber_key" ON "RollNumberSlip"("rollNumber");

-- CreateIndex
CREATE INDEX "RollNumberSlip_examId_idx" ON "RollNumberSlip"("examId");

-- CreateIndex
CREATE INDEX "RollNumberSlip_studentId_idx" ON "RollNumberSlip"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "RollNumberSlip_studentId_examId_key" ON "RollNumberSlip"("studentId", "examId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollNumberSlip" ADD CONSTRAINT "RollNumberSlip_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollNumberSlip" ADD CONSTRAINT "RollNumberSlip_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollNumberSlip" ADD CONSTRAINT "RollNumberSlip_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
