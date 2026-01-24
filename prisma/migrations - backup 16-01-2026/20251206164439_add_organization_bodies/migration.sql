-- CreateTable
CREATE TABLE "Forum" (
    "forumId" TEXT NOT NULL,
    "forumCode" TEXT NOT NULL,
    "forumName" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "establishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "Forum_pkey" PRIMARY KEY ("forumId")
);

-- CreateTable
CREATE TABLE "Area" (
    "areaId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "establishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("areaId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "unitId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "establishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("unitId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Forum_forumCode_key" ON "Forum"("forumCode");

-- CreateIndex
CREATE INDEX "Forum_forumCode_idx" ON "Forum"("forumCode");

-- CreateIndex
CREATE INDEX "Forum_adminUserId_idx" ON "Forum"("adminUserId");

-- CreateIndex
CREATE INDEX "Area_forumId_idx" ON "Area"("forumId");

-- CreateIndex
CREATE INDEX "Area_adminUserId_idx" ON "Area"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_forumId_areaCode_key" ON "Area"("forumId", "areaCode");

-- CreateIndex
CREATE INDEX "Unit_areaId_idx" ON "Unit"("areaId");

-- CreateIndex
CREATE INDEX "Unit_forumId_idx" ON "Unit"("forumId");

-- CreateIndex
CREATE INDEX "Unit_adminUserId_idx" ON "Unit"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_areaId_unitCode_key" ON "Unit"("areaId", "unitCode");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("forumId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("areaId") ON DELETE RESTRICT ON UPDATE CASCADE;
