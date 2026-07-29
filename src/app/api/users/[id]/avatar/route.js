import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const body = await request.json();
    const { fileData, fileName } = body;

    if (!fileData || !fileName) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const matches = fileData.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format' },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const ext = path.extname(fileName) || '.jpg';
    const storedFileName = `avatar-${id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, storedFileName);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${storedFileName}`;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profilePicture: avatarUrl },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
