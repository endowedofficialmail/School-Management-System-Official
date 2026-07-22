import { NextResponse } from 'next/server'
import { getLMSSettings } from '@/lib/actions/lms'

export async function GET() {
  const settings = await getLMSSettings()
  return NextResponse.json({ isEnabled: settings.isEnabled })
}
