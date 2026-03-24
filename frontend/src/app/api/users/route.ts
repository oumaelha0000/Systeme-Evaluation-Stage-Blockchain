import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (address) {
      // Fetch specific user by wallet
      const user = await prisma.user.findUnique({
        where: { walletAddress: address.toLowerCase() },
      });
      return NextResponse.json(user || { error: "User not found" }, { status: user ? 200 : 404 });
    }

    // List all users (Directory feature)
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Convert address to lowercase for DB consistency
    if (data.walletAddress) {
      data.walletAddress = data.walletAddress.toLowerCase();
    }

    const newUser = await prisma.user.create({
      data,
    });
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
