import { NextResponse } from 'next/server';
import { cancelApplication, getApplicationById, approveApplication } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const application = getApplicationById(parseInt(params.id));
    if (!application) {
      return NextResponse.json(
        { error: '申请单不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取申请单详情失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'cancel') {
      cancelApplication(parseInt(params.id));
      return NextResponse.json({ success: true, message: '申请单已取消' });
    } else if (action === 'approve') {
      approveApplication(parseInt(params.id));
      return NextResponse.json({ success: true, message: '申请单已审核通过' });
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
