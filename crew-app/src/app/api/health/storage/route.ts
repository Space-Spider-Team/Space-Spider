import { connection } from "next/server";
import { inspectStorageTables } from "@/lib/server/database";

export async function GET() {
  await connection();
  try {
    return Response.json({ healthy: true, ...(await inspectStorageTables()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check database tables.";
    return Response.json({ healthy: false, error: message }, { status: 503 });
  }
}
