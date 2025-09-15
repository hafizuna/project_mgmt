-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "priority" "ProjectPriority" NOT NULL DEFAULT 'Medium';
