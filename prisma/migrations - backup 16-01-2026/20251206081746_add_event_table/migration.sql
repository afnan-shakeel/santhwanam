-- CreateTable
CREATE TABLE "Event" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT,
    "eventData" JSONB NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_aggregateId_idx" ON "Event"("aggregateId");

-- CreateIndex
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");
