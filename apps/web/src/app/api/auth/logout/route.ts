import { NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE } from "@/lib/auth/constants"

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url))
  res.cookies.delete(SESSION_COOKIE)
  return res
}
