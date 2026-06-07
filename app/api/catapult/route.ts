/**
 * POST /api/catapult — Catapult OpenField Webhook Receiver
 *
 * Receives real-time 10Hz data from Catapult Vector 8.
 * Writes to PostgreSQL (Supabase) for live monitoring.
 *
 * Auth: Catapult sends a secret token in headers.
 * Set CATAPULT_WEBHOOK_SECRET in Vercel env vars.
 *
 * Rate: ~200 req/s for 20 athletes @ 10Hz.
 * Vercel Pro or dedicated server recommended for production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SECRET = process.env.CATAPULT_WEBHOOK_SECRET || "kenshin-catapult-2026";

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== SECRET && SECRET !== "kenshin-catapult-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Catapult OpenField webhook payload:
    // { athlete_id, session_id, timestamp, x, y, speed, acceleration, hr, pl }
    const { athlete_id, session_id, timestamp, x, y, speed, acceleration, hr, pl } = body;

    if (!athlete_id || !session_id) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    // Write to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.from("gps_raw_data").insert({
      session_id,
      athlete_id,
      timestamp: timestamp || new Date().toISOString(),
      x: x || null,
      y: y || null,
      speed: speed || null,
      acceleration: acceleration || null,
      heart_rate: hr || null,
      player_load: pl || null,
    });

    if (error) {
      console.error("Catapult insert error:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("Catapult webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** GET /api/catapult — Health check */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    version: "1.0",
    expecting: "POST with Catapult OpenField webhook payload",
    rate: "10Hz per athlete",
  });
}

