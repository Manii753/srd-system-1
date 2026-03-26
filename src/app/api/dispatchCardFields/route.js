import dbConnect from "@/lib/db";
import Field from "@/models/Field";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    await dbConnect();
    const dispatchCardFields = await Field.find({ inDispatchCard: true, active: true });
    return NextResponse.json({ dispatchCardFields }, { status: 200 });
  } catch (error) {
    console.error("GET /api/dispatchCardFields error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
