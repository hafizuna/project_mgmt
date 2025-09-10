/*
  Warnings:

  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `ProjectMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Active', 'Completed', 'Archived', 'OnHold');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('Owner', 'Manager', 'Member');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Todo', 'InProgress', 'Review', 'Done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- DropForeignKey
ALTER TABLE "ProjectMember" DROP CONSTRAINT "ProjectMember_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "settings" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN "role",
ADD COLUMN     "role" "ProjectMemberRole" NOT NULL DEFAULT 'Member';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "position" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'Todo',
DROP COLUMN "priority",
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'Medium';

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
