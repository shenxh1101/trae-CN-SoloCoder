import { NextResponse } from 'next/server';
import {
  getApplicationsReadyForDelivery,
  checkDeliveryFeasibility,
  deliverApplication,
  getDeliveryRecords
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'records') {
      const records = getDeliveryRecords();
      return NextResponse.json({ records });
    } else if (type === 'ready') {
      const applications = getApplicationsReadyForDelivery();
      return NextResponse.json({ applications });
    } else {
      return NextResponse.json(
        { error: '请指定查询类型' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, action } = body;

    if (action === 'check') {
      const shortages = checkDeliveryFeasibility(applicationId);
      return NextResponse.json({
        feasible: shortages.length === 0,
        shortages
      });
    } else if (action === 'deliver') {
      const result = deliverApplication(applicationId);
      return NextResponse.json({
        success: true,
        deliveryId: result.deliveryId,
        deliveryNo: result.deliveryNo,
        message: '配送成功'
      });
    } else {
      return NextResponse.json(
        { error: '不支持的操作' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}
