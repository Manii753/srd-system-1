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
  try {
    const body = await req.json();
    const existing = await Company.findOne();

    if (existing) {
      // Flatten body into dot-notation $set to avoid wiping sibling fields
      const setOps = {};
      const flattenObj = (obj, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            flattenObj(v, key);
          } else {
            setOps[key] = v;
          }
        }
      };
      flattenObj(body);

      const updated = await Company.findByIdAndUpdate(
        existing._id,
        { $set: setOps },
        { new: true, runValidators: false }
      );
      return NextResponse.json(updated);
    }

    if (!body.name) body.name = 'My Company';
    const created = await Company.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Company POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
