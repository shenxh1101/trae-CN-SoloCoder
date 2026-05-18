import { NextResponse } from 'next/server';
import { getApprovedApplications, convertApplicationsToProduction } from '@/lib/db';

export async function GET() {
  try {
    const applications = getApprovedApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取已审核申请单失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationIds, plannedDate } = body;

    if (!applicationIds || applicationIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要转换的申请单' },
        { status: 400 }
      );
    }

    if (!plannedDate) {
      return NextResponse.json(
        { error: '请填写计划生产日期' },
        { status: 400 }
      );
    }

    const orders = convertApplicationsToProduction(applicationIds, plannedDate);

    return NextResponse.json({
      success: true,
      orders,
      message: `成功生成 ${orders.length} 个生产工单`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '转换生产工单失败' },
      { status: 500 }
    );
  }
}
