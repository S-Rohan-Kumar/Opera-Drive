import { FastifyInstance, FastifyRequest } from "fastify";
import { EventBus } from "./event-bus.js";
import { TokenPayload } from "../auth/auth.middleware.js";

export async function syncRoutes(app: FastifyInstance) {
    app.get("/ws", { websocket: true }, (socket, request: FastifyRequest) => {
        const query = request.query as { token?: string };
        const token = query.token;

        if (!token) {
            socket.send(
                JSON.stringify({
                    error: "UNAUTHORIZED",
                    message: "Token missing",
                }),
            );
            socket.close(1008, "Unauthorized");
            return;
        }

        let user: TokenPayload;
        try {
            user = app.jwt.verify<TokenPayload>(token);
        } catch {
            socket.send(
                JSON.stringify({
                    error: "UNAUTHORIZED",
                    message: "Invalid or expired token",
                }),
            );
            socket.close(1008, "Unauthorized");
            return;
        }

        socket.send(
            JSON.stringify({
                type: "CONNECTED",
                userId: user.id,
                timestamp: new Date().toISOString(),
            }),
        );

        let unsubscribe: (() => void) | null = null;

        EventBus.subscribe(user.id, (event) => {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify(event));
            }
        })
            .then((cleanup) => {
                unsubscribe = cleanup;
            })
            .catch((err) => {
                request.log.error(
                    "Failed to subscribe socket to EventBus:",
                    err,
                );
            });

        socket.on("message", (message: string) => {
            try {
                const parsed = JSON.parse(message.toString());
                if (parsed.type === "PING") {
                    socket.send(
                        JSON.stringify({
                            type: "PONG",
                            timestamp: new Date().toISOString(),
                        }),
                    );
                }
            } catch {
                // Ignore malformed client pings
            }
        });

        socket.on("close", () => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
    });
}
