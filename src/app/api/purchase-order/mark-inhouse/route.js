import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

function normalizeValueId(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (typeof value.toString === 'function') return value.toString();
    return null;
  }
  return String(value);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = session.user.role?.toLowerCase();
  if (!['mmc', 'admin'].includes(userRole)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    const metadata = notification.metadata || {};
    const { fieldSlug, fieldName, rowIndex } = metadata;
    if (typeof rowIndex !== 'number' || (!fieldSlug && !fieldName)) {
      return NextResponse.json({ success: false, error: 'Invalid purchase notification metadata' }, { status: 400 });
    }

    const srd = await SRD.findById(notification.srd);
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    const field = srd.dynamicFields.find((f) => {
      const slugMatch = fieldSlug && String(f.slug) === String(fieldSlug);
      const nameMatch = !slugMatch && fieldName && String(f.name) === String(fieldName);
      return slugMatch || nameMatch;
    });

    if (!field) {
      return NextResponse.json({ success: false, error: 'Field not found on SRD' }, { status: 404 });
    }

    const currentValue = field.value && typeof field.value === 'object' && !Array.isArray(field.value)
      ? field.value
      : {};
    const predefinedData = Array.isArray(currentValue.predefinedData) ? [...currentValue.predefinedData] : [];

    while (predefinedData.length <= rowIndex) {
      predefinedData.push({ purchaseType: 'purchase', opd: '', etd: '' });
    }

    const today = new Date().toISOString().split('T')[0];
    predefinedData[rowIndex] = {
      ...predefinedData[rowIndex],
      purchaseType: 'instock',
      etd: today,
      opd: predefinedData[rowIndex]?.opd || today,
    };

    field.value = {
      ...currentValue,
      predefinedData,
    };

    await srd.save();

    await Notification.updateMany(
      {
        srd: notification.srd,
        action: 'purchase-request',
        'metadata.fieldSlug': fieldSlug,
        'metadata.rowIndex': rowIndex,
      },
      {
        action: 'purchase-received',
        read: true,
      }
    );

    return NextResponse.json({ success: true, data: { srdId: srd._id, notificationId: notification._id } });
  } catch (error) {
    console.error('Error in POST /api/purchase-order/mark-inhouse:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
