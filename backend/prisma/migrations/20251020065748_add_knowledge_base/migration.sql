-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('MARKET_RESEARCH', 'COMPETITOR_ANALYSIS', 'CUSTOMER_INSIGHTS', 'LESSONS_LEARNED');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('Draft', 'Published', 'Archived');

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "content" JSONB NOT NULL,
    "tags" TEXT[],
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'Published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeComment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeEntry_orgId_category_idx" ON "KnowledgeEntry"("orgId", "category");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_orgId_createdAt_idx" ON "KnowledgeEntry"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_authorId_createdAt_idx" ON "KnowledgeEntry"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeComment" ADD CONSTRAINT "KnowledgeComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "KnowledgeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeComment" ADD CONSTRAINT "KnowledgeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeComment" ADD CONSTRAINT "KnowledgeComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
