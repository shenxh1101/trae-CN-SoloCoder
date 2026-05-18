import { NextResponse } from 'next/server';
import { getAllStores } from '@/lib/db';

export async function GET() {
  try {
    const stores = getAllStores();
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取门店列表失败' },
      { status: 500 }
    );
  }
}
