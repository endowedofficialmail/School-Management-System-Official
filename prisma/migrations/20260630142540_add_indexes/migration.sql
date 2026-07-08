-- CreateIndex
CREATE INDEX "Attendance_classId_idx" ON "Attendance"("classId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "FeeInvoice_status_idx" ON "FeeInvoice"("status");

-- CreateIndex
CREATE INDEX "FeeInvoice_year_idx" ON "FeeInvoice"("year");

-- CreateIndex
CREATE INDEX "FeeInvoice_studentId_idx" ON "FeeInvoice"("studentId");

-- CreateIndex
CREATE INDEX "Result_examId_idx" ON "Result"("examId");

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");
