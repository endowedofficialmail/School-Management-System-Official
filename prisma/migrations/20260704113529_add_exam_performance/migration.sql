-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "remarks" TEXT;

-- CreateTable
CREATE TABLE "ExamPerformance" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "totalMarksObtained" DECIMAL(8,2) NOT NULL,
    "totalPossibleMarks" DECIMAL(8,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "grade" TEXT NOT NULL,
    "rank" INTEGER,
    "isPassed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamPerformance_examId_studentId_key" ON "ExamPerformance"("examId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamPerformance" ADD CONSTRAINT "ExamPerformance_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPerformance" ADD CONSTRAINT "ExamPerformance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
