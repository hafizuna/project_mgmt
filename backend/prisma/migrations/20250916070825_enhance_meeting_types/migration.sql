-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('Online', 'InPerson', 'Hybrid');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "actualEndTime" TIMESTAMP(3),
ADD COLUMN     "actualStartTime" TIMESTAMP(3),
ADD COLUMN     "recording" TEXT,
ADD COLUMN     "type" "MeetingType" NOT NULL DEFAULT 'Online',
ADD COLUMN     "videoRoom" TEXT;
