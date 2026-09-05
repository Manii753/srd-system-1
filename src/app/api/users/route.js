import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function isAdminOrUserManager() {
  const session = await getServerSession(authOptions);
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return session.user.permissions?.canManageUsers === true;
}

export async function GET(request) {
  if (!(await isAdminOrUserManager())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 50));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search');

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await User.countDocuments(query);
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    
    return NextResponse.json({
      success: true,
      data: users,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdminOrUserManager())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();

  try {
    const body = await request.json();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new user (password will be hashed by pre-save hook)
    const newUser = await User.create(body);
    
    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return NextResponse.json(
      { success: true, data: userResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}