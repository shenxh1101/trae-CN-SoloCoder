import { NextResponse } from 'next/server';
import { getProductionOrders, updateProductionOrder } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const orders = getProductionOrders(status || null);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取生产工单列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, actualQuantity, plannedDate } = body;

    if (!id) {
      return NextResponse.json(
        { error: '请指定工单ID' },
        { status: 400 }
      );
    }

    if (actualQuantity === undefined || actualQuantity === null) {
      return NextResponse.json(
        { error: '请填写实际完成数量' },
        { status: 400 }
      );
    }

    if (actualQuantity < 0) {
      return NextResponse.json(
        { error: '实际完成数量不能为负数' },
        { status: 400 }
      );
    }

    if (!plannedDate) {
      return NextResponse.json(
        { error: '请填写计划生产日期' },
        { status: 400 }
      );
    }

    updateProductionOrder(parseInt(id), actualQuantity, plannedDate);

    return NextResponse.json({
      success: true,
      message: '工单已更新'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新工单失败' },
      { status: 500 }
    );
  }
}
