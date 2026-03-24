import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const address = searchParams.get("address")?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    let internships;
    if (role === "student") {
      internships = await prisma.internshipDetails.findMany({ where: { studentAddress: address }, include: { student: true, company: true, supervisor: true } });
    } else if (role === "company") {
      internships = await prisma.internshipDetails.findMany({ where: { companyAddress: address }, include: { student: true, company: true, supervisor: true } });
    } else if (role === "supervisor") {
      internships = await prisma.internshipDetails.findMany({ where: { supervisorAddress: address }, include: { student: true, company: true, supervisor: true } });
    } else {
      internships = await prisma.internshipDetails.findMany({ include: { student: true, company: true, supervisor: true } });
    }

    return NextResponse.json(internships);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch internship details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const studentAddress = data.studentAddress.toLowerCase();
    const companyAddress = data.companyAddress.toLowerCase();
    const supervisorAddress = data.supervisorAddress.toLowerCase();
    const onChainId = data.onChainId != null ? Number(data.onChainId) : null;

    // Auto-create User rows if they don't exist (satisfies FK constraints)
    // All roles are UPPERCASE — standardized across codebase
    await prisma.user.upsert({
      where: { walletAddress: studentAddress },
      update: {},
      create: { walletAddress: studentAddress, role: "STUDENT", name: "", email: "" },
    });
    await prisma.user.upsert({
      where: { walletAddress: companyAddress },
      update: {},
      create: { walletAddress: companyAddress, role: "COMPANY", name: "", email: "" },
    });
    await prisma.user.upsert({
      where: { walletAddress: supervisorAddress },
      update: {},
      create: { walletAddress: supervisorAddress, role: "SUPERVISOR", name: "", email: "" },
    });

    const newInternship = await prisma.internshipDetails.create({
      data: {
        onChainId,
        studentAddress,
        companyAddress,
        supervisorAddress,
        title: data.title || `Internship #${onChainId}`,
        description: data.description,
        status: "Registered",
      },
    });

    return NextResponse.json(newInternship, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/internships/details error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create internship details" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { onChainId, status, companyValidated } = data;

    // Use == null to correctly handle onChainId of 0 (though blockchain IDs start at 1)
    if (onChainId == null) {
      return NextResponse.json({ error: "Missing onChainId" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (companyValidated !== undefined) updateData.companyValidated = companyValidated;

    const updated = await prisma.internshipDetails.update({
      where: { onChainId: Number(onChainId) },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/internships/details error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to update internship details" }, { status: 500 });
  }
}
