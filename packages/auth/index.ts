import { PrismaAdapter } from "@next-auth/prisma-adapter"
import type { AuthOptions, DefaultSession } from "next-auth"
import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

import type { UserRole } from "@code-racer/db"
import { prisma } from "@code-racer/db"

import { env } from "./env.mjs"

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string
            role: UserRole
        } & DefaultSession["user"]
    }
}

export const nextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    secret: env.NEXTAUTH_SECRET,
    providers: [
        GithubProvider({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            const dbUser = await prisma.user.findFirst({
                where: {
                    email: token.email,
                },
            })

            if (!dbUser) {
                if (user) {
                    token.id = user.id
                }
                return token
            }

            return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                picture: dbUser.image,
            }
        },
        session({ token, session }) {
            if (token) {
                session.user.id = token.id
                session.user.name = token.name
                session.user.email = token.email
                session.user.role = token.role
                session.user.image = token.picture
            }

            return session
        },
    },
} satisfies AuthOptions

export const handler = NextAuth(nextAuthOptions)
