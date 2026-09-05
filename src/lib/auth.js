import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from './db.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          await dbConnect();
          const user = await User.findOne({ email: credentials.email });
          
          if (user) {
            const isMatch = await bcrypt.compare(credentials.password, user.password);
            if (isMatch) {
              return {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                permissions: user.permissions || {},
                sidebarMenuItems: user.sidebarMenuItems || []
              };
            }
          }
        } catch (error) {
          console.error("Error in authorize function:", error);
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.department = user.department;
        token.permissions = user.permissions;
        token.sidebarMenuItems = user.sidebarMenuItems;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.department = token.department;
        session.user.permissions = token.permissions;
        session.user.sidebarMenuItems = token.sidebarMenuItems;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
};

export default NextAuth(authOptions);