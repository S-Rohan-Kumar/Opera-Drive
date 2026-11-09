import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { searchQuerySchema, SearchQueryInput } from "./search.schema.js";
import { SearchService } from "./search.service.js";

export async function searchRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authenticate);

    app.get(
        "/",
        async (
            request: FastifyRequest<{ Querystring: SearchQueryInput }>,
            reply: FastifyReply,
        ) => {
            const parsed = searchQuerySchema.parse(request.query);
            const results = await SearchService.search(request.user.id, parsed);
            return reply.send({ success: true, data: results });
        },
    );
}
