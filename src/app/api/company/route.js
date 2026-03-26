import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();
  const company = await Company.findOne();
  return NextResponse.json(company || {});
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const existing = await Company.findOne();
  if (existing) {
    const updated = await Company.findByIdAndUpdate(existing._id, body, { new: true });
    return NextResponse.json(updated);
  }
  const created = await Company.create(body);
  return NextResponse.json(created, { status: 201 });
}
