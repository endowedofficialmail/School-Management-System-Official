-- CreateTable
CREATE TABLE "PromotionRecord" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "fromClassId" INTEGER NOT NULL,
    "toClassId" INTEGER NOT NULL,
    "fromAcademicYearId" INTEGER NOT NULL,
    "toAcademicYearId" INTEGER NOT NULL,
    "promotedById" INTEGER NOT NULL,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasPromoted" BOOLEAN NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PromotionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionRecord_studentId_idx" ON "PromotionRecord"("studentId");

-- CreateIndex
CREATE INDEX "PromotionRecord_fromClassId_idx" ON "PromotionRecord"("fromClassId");

-- CreateIndex
CREATE INDEX "PromotionRecord_toClassId_idx" ON "PromotionRecord"("toClassId");

-- CreateIndex
CREATE INDEX "PromotionRecord_fromAcademicYearId_idx" ON "PromotionRecord"("fromAcademicYearId");

-- CreateIndex
CREATE INDEX "PromotionRecord_toAcademicYearId_idx" ON "PromotionRecord"("toAcademicYearId");

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_fromAcademicYearId_fkey" FOREIGN KEY ("fromAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_toAcademicYearId_fkey" FOREIGN KEY ("toAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRecord" ADD CONSTRAINT "PromotionRecord_promotedById_fkey" FOREIGN KEY ("promotedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
