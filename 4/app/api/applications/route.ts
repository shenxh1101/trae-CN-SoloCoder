import { NextResponse } from 'next/server';
import { createApplication, getApplications, getAllMaterials } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');

    const applications = getApplications(
      storeId ? parseInt(storeId) : null,
      status || null
    );

    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取申请单列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, applicationDate, expectedDate, items } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: '请选择门店' },
        { status: 400 }
      );
    }

    if (!applicationDate) {
      return NextResponse.json(
        { error: '请填写申请日期' },
        { status: 400 }
      );
    }

    if (!expectedDate) {
      return NextResponse.json(
        { error: '请填写期望送达日期' },
        { status: 400 }
      );
    }

    if (new Date(expectedDate) < new Date(applicationDate)) {
      return NextResponse.json(
        { error: '期望送达日期不能早于申请日期' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: '请至少添加一种原料' },
        { status: 400 }
      );
    }

    const materials = getAllMaterials();
    const materialIds = new Set(materials.map(m => m.id));

    const seenMaterials = new Set();

    for (const item of items) {
      if (!item.materialId) {
        return NextResponse.json(
          { error: '请选择原料' },
          { status: 400 }
        );
      }

      if (!materialIds.has(item.materialId)) {
        return NextResponse.json(
          { error: '原料不存在于原料库中' },
          { status: 400 }
        );
      }

      if (seenMaterials.has(item.materialId)) {
        return NextResponse.json(
          { error: '同一个申请单内不能有重复原料' },
          { status: 400 }
        );
      }
      seenMaterials.add(item.materialId);

      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: '申请数量必须大于0' },
          { status: 400 }
        );
      }
    }

    const result = createApplication(
      parseInt(storeId),
      applicationDate,
      expectedDate,
      items
    );

    return NextResponse.json({
      success: true,
      applicationId: result.applicationId,
      applicationNo: result.applicationNo
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建申请单失败' },
      { status: 500 }
    );
  }
}
