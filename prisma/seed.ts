import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.stepResult.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testStep.deleteMany();
  await prisma.test.deleteMany();
  await prisma.sharedStepItem.deleteMany();
  await prisma.sharedStep.deleteMany();
  await prisma.environmentValue.deleteMany();
  await prisma.globalVariable.deleteMany();
  await prisma.environment.deleteMany();

  const dev = await prisma.environment.create({
    data: {
      name: "Development",
      slug: "development",
      baseUrl: "https://jsonplaceholder.typicode.com",
      color: "blue",
      isDefault: true,
      sortOrder: 0,
    },
  });

  const staging = await prisma.environment.create({
    data: {
      name: "Staging",
      slug: "staging",
      baseUrl: "https://jsonplaceholder.typicode.com",
      color: "amber",
      isDefault: false,
      sortOrder: 1,
    },
  });

  const apiKey = await prisma.globalVariable.create({
    data: {
      key: "apiKey",
      description: "API authentication key",
      isSecret: true,
      values: {
        create: [
          { environmentId: dev.id, value: "dev-secret-key" },
          { environmentId: staging.id, value: "staging-secret-key" },
        ],
      },
    },
  });

  const userId = await prisma.globalVariable.create({
    data: {
      key: "userId",
      description: "Default user ID for tests",
      isSecret: false,
      values: {
        create: [
          { environmentId: dev.id, value: "1" },
          { environmentId: staging.id, value: "2" },
        ],
      },
    },
  });

  void apiKey;
  void userId;

  const authShared = await prisma.sharedStep.create({
    data: {
      name: "Fetch User",
      description: "Gets a user by ID from global variable",
      items: {
        create: [
          {
            sortOrder: 0,
            type: "http",
            config: {
              method: "GET",
              url: "/users/{{userId}}",
              headers: { Accept: "application/json" },
            },
          },
          {
            sortOrder: 1,
            type: "assert",
            config: {
              assertions: [
                { type: "status", expected: 200 },
                { type: "jsonPath", target: "$.id", expected: "{{userId}}" },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.test.create({
    data: {
      name: "Get User Profile",
      description: "Fetches user profile and validates response",
      timeoutMs: 15000,
      environmentIds: [],
      tags: ["users", "smoke"],
      steps: {
        create: [
          {
            sortOrder: 0,
            type: "shared_ref",
            config: { sharedStepId: authShared.id },
          },
        ],
      },
    },
  });

  await prisma.test.create({
    data: {
      name: "List Posts",
      description: "GET all posts and verify array response",
      timeoutMs: 10000,
      environmentIds: [dev.id],
      tags: ["posts"],
      steps: {
        create: [
          {
            sortOrder: 0,
            type: "http",
            config: {
              method: "GET",
              url: "/posts",
              headers: { Accept: "application/json" },
            },
          },
          {
            sortOrder: 1,
            type: "assert",
            config: {
              assertions: [
                { type: "status", expected: 200 },
                { type: "responseTime", expected: 5000 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.test.create({
    data: {
      name: "Create Post",
      description: "POST a new post to the API",
      timeoutMs: 20000,
      environmentIds: [],
      tags: ["posts", "write"],
      steps: {
        create: [
          {
            sortOrder: 0,
            type: "http",
            config: {
              method: "POST",
              url: "/posts",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                title: "Test Post",
                body: "Created by API Tests App",
                userId: "{{userId}}",
              }),
            },
          },
          {
            sortOrder: 1,
            type: "assert",
            config: {
              assertions: [{ type: "status", expected: 201 }],
            },
          },
        ],
      },
    },
  });

  console.log("Seed completed: 2 environments, 2 variables, 1 shared step, 3 tests");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
