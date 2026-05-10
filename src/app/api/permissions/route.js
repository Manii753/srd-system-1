import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RolePermission from '@/models/RolePermission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Fetch all role permissions
export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await RolePermission.find({}).sort({ role: 1 });
    
    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new role permission
export async function POST(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, displayName, permissions } = body;

    // Check if role already exists
    const existing = await RolePermission.findOne({ role: role.toLowerCase() });
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Role permission already exists' 
      }, { status: 400 });
    }

    const rolePermission = await RolePermission.create({
      role: role.toLowerCase(),
      displayName,
      permissions
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Role permission created successfully',
      data: rolePermission 
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
