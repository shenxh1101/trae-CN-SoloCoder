import { NextResponse } from 'next/server';
import { getAllMaterials } from '@/lib/db';

export async function GET() {
  try {
    const materials = getAllMaterials();
    return NextResponse.json({ materials });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取原料列表失败' },
      { status: 500 }
    );
  }
}
