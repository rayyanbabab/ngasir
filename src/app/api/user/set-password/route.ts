import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  // Verify session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPassword } = await req.json();

  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Password tidak valid." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter." },
      { status: 400 }
    );
  }

  // Hash the new password using better-auth's own hasher
  const hashed = await hashPassword(newPassword);

  // Update the credential account row for this user
  await db
    .update(account)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(account.userId, session.user.id));

  return NextResponse.json({ success: true });
}
