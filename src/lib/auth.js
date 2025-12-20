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
        console.log("Authorize function started");
        try {
          await dbConnect();
          console.log("Database connected");
          const user = await User.findOne({ email: credentials.email });
          console.log("User found:", user ? user.email : null);
          
          if (user) {
            const isMatch = await bcrypt.compare(credentials.password, user.password);
            console.log("Password match result:", isMatch);
            if (isMatch) {
              return {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
              };
            }
          }
        } catch (error) {
          console.error("Error in authorize function:", error);
        }
        console.log("Authorize function returning null");
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
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