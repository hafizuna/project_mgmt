-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WeeklyPlan', 'WeeklyReport');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('Draft', 'Submitted', 'UnderReview', 'Approved', 'NeedsRevision', 'Overdue');

-- CreateEnum
CREATE TYPE "StressLevel" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('Initial', 'FirstReminder', 'FinalReminder', 'Overdue');

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL,
    "sections" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "goals" JSONB NOT NULL,
    "priorities" JSONB NOT NULL,
    "timeAllocation" JSONB NOT NULL,
    "focusAreas" JSONB NOT NULL,
    "blockers" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'Draft',
    "submittedAt" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT,
    "weeklyPlanId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "achievements" JSONB NOT NULL,
    "goalsProgress" JSONB NOT NULL,
    "actualTimeSpent" JSONB NOT NULL,
    "blockers" JSONB,
    "support" JSONB,
    "learnings" JSONB,
    "nextWeekPrep" JSONB,
    "productivityScore" DOUBLE PRECISION,
    "satisfactionScore" DOUBLE PRECISION,
    "stressLevel" "StressLevel",
    "status" "SubmissionStatus" NOT NULL DEFAULT 'Draft',
    "submittedAt" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "planId" TEXT,
    "reportId" TEXT,
    "parentId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReportReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planDueDay" INTEGER NOT NULL DEFAULT 1,
    "planDueTime" TEXT NOT NULL DEFAULT '10:00',
    "planReminderDays" INTEGER[] DEFAULT ARRAY[0, 1]::INTEGER[],
    "reportDueDay" INTEGER NOT NULL DEFAULT 5,
    "reportDueTime" TEXT NOT NULL DEFAULT '17:00',
    "reportReminderDays" INTEGER[] DEFAULT ARRAY[3, 4, 5]::INTEGER[],
    "isEnforced" BOOLEAN NOT NULL DEFAULT true,
    "gracePeriodHours" INTEGER NOT NULL DEFAULT 24,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "managerNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportTemplate_orgId_type_idx" ON "ReportTemplate"("orgId", "type");

-- CreateIndex
CREATE INDEX "WeeklyPlan_orgId_weekStart_idx" ON "WeeklyPlan"("orgId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyPlan_userId_status_idx" ON "WeeklyPlan"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_userId_weekStart_key" ON "WeeklyPlan"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_weeklyPlanId_key" ON "WeeklyReport"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "WeeklyReport_orgId_weekStart_idx" ON "WeeklyReport"("orgId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_status_idx" ON "WeeklyReport"("userId", "status");

-- CreateIndex
CREATE INDEX "WeeklyReport_reviewedBy_reviewedAt_idx" ON "WeeklyReport"("reviewedBy", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReportReminder_userId_weekStart_type_idx" ON "ReportReminder"("userId", "weekStart", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSettings_orgId_key" ON "ReportSettings"("orgId");

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ReportComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReminder" ADD CONSTRAINT "ReportReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReminder" ADD CONSTRAINT "ReportReminder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSettings" ADD CONSTRAINT "ReportSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
