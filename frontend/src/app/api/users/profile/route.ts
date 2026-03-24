import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users/profile?address=0x...
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  return NextResponse.json(user || null);
}

// PUT /api/users/profile — Update name, email, department/industry
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { address, name, email, department, industry } = body;

  if (!address || !name || !email) {
    return NextResponse.json({ error: "address, name and email are required" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      update: { name, email, department, industry },
      create: {
        walletAddress: address.toLowerCase(),
        role: body.role || "STUDENT",  // Use the role sent by the UI (from on-chain detection)
        name,
        email,
        department,
        industry,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
