-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalVariable" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "EnvironmentValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedStepItem" (
    "id" TEXT NOT NULL,
    "sharedStepId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "SharedStepItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "environmentIds" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestVariable" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TestVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSchedule" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'days',
    "runAtTime" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "days" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "TestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStep" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "TestStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "runType" TEXT NOT NULL DEFAULT 'manual',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "request" JSONB,
    "response" JSONB,
    "assertions" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "StepResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Environment_slug_key" ON "Environment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalVariable_key_key" ON "GlobalVariable"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentValue_variableId_environmentId_key" ON "EnvironmentValue"("variableId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TestVariable_testId_key_key" ON "TestVariable"("testId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TestSchedule_testId_key" ON "TestSchedule"("testId");

-- AddForeignKey
ALTER TABLE "EnvironmentValue" ADD CONSTRAINT "EnvironmentValue_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "GlobalVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentValue" ADD CONSTRAINT "EnvironmentValue_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedStepItem" ADD CONSTRAINT "SharedStepItem_sharedStepId_fkey" FOREIGN KEY ("sharedStepId") REFERENCES "SharedStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestVariable" ADD CONSTRAINT "TestVariable_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSchedule" ADD CONSTRAINT "TestSchedule_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStep" ADD CONSTRAINT "TestStep_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepResult" ADD CONSTRAINT "StepResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
