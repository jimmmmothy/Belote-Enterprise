import * as bcrypt from "bcrypt";
import { signToken } from "./jwt.js";
import { initNats } from "./nats-client.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function start() {
    const nats = await initNats();

    // Handle registration
    const subRegister = nats.subscribe("auth.register", async (msg: string, reply: any) => {
        if (!reply) throw Error("auth.register topic must be opened as two-directional request");
        try {
            const { email, username, password, confirmPass } = JSON.parse(msg);

            if (!email || !username || !password || password !== confirmPass) {
                nats.sendMessage(reply, { error: "Invalid registration data" });
                return;
            }

            const existing = await prisma.user.findUnique({
                where: {
                    email,
                },
            });
            if (existing) {
                nats.sendMessage(reply, { error: "Email already in use" });
                return;
            }

            const hash = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: {
                    username,
                    email,
                    password: hash
                }
            });
            const token = signToken(user.id, user.email);

            nats.sendMessage(reply, { token });
        } catch (err) {
            nats.sendMessage(reply, { error: "Internal error" });
        }
    });

    // Handle login
    nats.subscribe("auth.login", async (msg: string, reply: any) => {
        if (!reply) throw Error("auth.login topic must be opened as two-directional request");

        try {
            const { email, password } = JSON.parse(msg);
            if (!email || !password) {
                nats.sendMessage(reply, { error: "Missing credentials" });
                return;
            }

            const user = await prisma.user.findUnique({
                where: {
                    email,
                },
            });
            if (!user) {
                nats.sendMessage(reply, { error: "Invalid credentials" });
                return;
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                nats.sendMessage(reply, { error: "Invalid credentials" });
                return;
            }

            const token = signToken(user.id, user.email);
            nats.sendMessage(reply, { token });
        } catch (err) {
            nats.sendMessage(reply, { error: "Internal error" });
        }
    });
}

start().catch((err) => console.error("[FATAL]", err));
