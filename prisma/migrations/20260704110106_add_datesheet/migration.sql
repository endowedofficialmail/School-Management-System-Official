-- CreateTable
CREATE TABLE "DatesheetEntry" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatesheetEntry_examId_idx" ON "DatesheetEntry"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "DatesheetEntry_examId_subjectId_key" ON "DatesheetEntry"("examId", "subjectId");

-- AddForeignKey
ALTER TABLE "DatesheetEntry" ADD CONSTRAINT "DatesheetEntry_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatesheetEntry" ADD CONSTRAINT "DatesheetEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
