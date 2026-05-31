import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { z } from "zod";

const scheduleSchema = z.object({
  active: z.boolean().optional(),
  interval: z.number().int().min(1).optional(),
  unit: z.enum(["hours", "days", "weeks"]).optional(),
  runAtTime: z.boolean().optional(),
  time: z.string().optional().nullable(),
  timezone: z.string().optional(),
  days: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  let schedule = await db.testSchedule.findUnique({ where: { testId: id } });
  if (!schedule) {
    schedule = await db.testSchedule.create({
      data: { testId: id, active: false, days: [] },
    });
  }
  return ok(schedule);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = parseBody(scheduleSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const schedule = await db.testSchedule.upsert({
    where: { testId: id },
    create: {
      testId: id,
      active: parsed.data.active ?? false,
      interval: parsed.data.interval ?? 1,
      unit: parsed.data.unit ?? "days",
      runAtTime: parsed.data.runAtTime ?? false,
      time: parsed.data.time ?? null,
      timezone: parsed.data.timezone ?? "UTC",
      days: (parsed.data.days ?? []) as Prisma.InputJsonValue,
    },
    update: {
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(parsed.data.interval !== undefined && { interval: parsed.data.interval }),
      ...(parsed.data.unit !== undefined && { unit: parsed.data.unit }),
      ...(parsed.data.runAtTime !== undefined && { runAtTime: parsed.data.runAtTime }),
      ...(parsed.data.time !== undefined && { time: parsed.data.time }),
      ...(parsed.data.timezone !== undefined && { timezone: parsed.data.timezone }),
      ...(parsed.data.days !== undefined && { days: parsed.data.days as Prisma.InputJsonValue }),
    },
  });
  return ok(schedule);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.testSchedule.deleteMany({ where: { testId: id } });
  return ok({ deleted: true });
}
