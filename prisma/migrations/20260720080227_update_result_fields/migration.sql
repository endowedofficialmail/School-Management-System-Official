-- AlterTable
ALTER TABLE "ExamPerformance" ADD COLUMN     "isAbsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resultStatus" TEXT NOT NULL DEFAULT 'Pass',
ADD COLUMN     "subjectsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subjectsPassed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSubjects" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "isAbsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWithheld" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "practicalMarks" DECIMAL(5,2),
ADD COLUMN     "theoryMarks" DECIMAL(5,2);
