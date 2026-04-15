import { NextResponse } from "next/server";

import { runAgentTest } from "@/lib/agents/test-run";

export async function GET() {
  const result = runAgentTest();

  return NextResponse.json(result);
}
