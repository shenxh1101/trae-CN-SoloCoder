import { NextResponse } from 'next/server';
import { getInventory } from '@/lib/db';

export async function GET() {
  try {
    const inventory = getInventory();
    return NextResponse.json({ inventory });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取库存列表失败' },
      { status: 500 }
    );
  }
}
