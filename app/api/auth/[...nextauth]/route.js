import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        const users = db.collection('users');

        const existingUser = await users.findOne({ email: user.email });

        if (!existingUser) {
          // New user signing up with Google
          await users.insertOne({
            name: user.name,
            email: user.email,
            image: user.image,
            googleId: user.id,
            authMethod: 'google',
            isVerified: true,
            createdAt: new Date(),
          });
        } else {
          // User already exists (either email or google)
          const updateData = {
            image: user.image || existingUser.image,
            name: user.name || existingUser.name,
            googleId: user.id,
          };

          // If they were email-only, now they are 'both'
          if (existingUser.authMethod === 'email') {
            updateData.authMethod = 'both';
          }

          await users.updateOne(
            { email: user.email },
            { $set: updateData }
          );
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        const client = await clientPromise;
        const db = client.db();
        const users = db.collection('users');
        const dbUser = await users.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.authMethod = dbUser.authMethod;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
