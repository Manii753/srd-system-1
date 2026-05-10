import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RolePermission from '@/models/RolePermission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH - Update role permission
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const rolePermission = await RolePermission.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!rolePermission) {
      return NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permission updated successfully',
      data: rolePermission 
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete role permission
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const rolePermission = await RolePermission.findByIdAndDelete(id);

    if (!rolePermission) {
      return NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permission deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
