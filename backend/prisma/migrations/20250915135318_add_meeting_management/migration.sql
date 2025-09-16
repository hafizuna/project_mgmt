-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('Scheduled', 'InProgress', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('Pending', 'Accepted', 'Declined', 'Tentative');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('Open', 'InProgress', 'Completed');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "agenda" JSONB,
    "notes" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'Scheduled',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'Pending',
    "respondedAt" TIMESTAMP(3),
    "actuallyAttended" BOOLEAN,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingActionItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionItemStatus" NOT NULL DEFAULT 'Open',
    "taskId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
