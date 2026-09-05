import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function isAdminOrUserManager() {
  const session = await getServerSession(authOptions);
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return session.user.permissions?.canManageUsers === true;
}

export async function GET(request, { params }) {
  if (!(await isAdminOrUserManager())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;

  try {
    const user = await User.findById(id).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  if (!(await isAdminOrUserManager())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;

  try {
    const body = await request.json();
    
    // Don't allow updating password to empty string
    if (body.password === '') {
      delete body.password;
    }

    // Hash password if being updated (findByIdAndUpdate skips pre('save') hook)
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAdminOrUserManager())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { id } = await params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
