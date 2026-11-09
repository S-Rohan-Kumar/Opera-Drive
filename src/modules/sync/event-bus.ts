import { Redis } from 'ioredis';
import { redisClient, redisOptions } from '../../queue/redis.js';

export type SyncEventType =
  | 'FILE_CREATED'
  | 'VERSION_UPLOADED'
  | 'RESOURCE_SHARED'
  | 'RESOURCE_DELETED'
  | 'PERMISSION_REVOKED';

export interface SyncEventPayload {
  type: SyncEventType;
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName?: string;
  parentId?: string | null;
  actorId: string;
  timestamp: string;
  data?: any;
}

export class EventBus {
    private static subscriber: Redis | null = null;
    private static handlers: Map<
        string,
        Set<(event: SyncEventPayload) => void>
    > = new Map();

    static getSubscriber(): Redis {
        if (!this.subscriber) {
            this.subscriber = new Redis(redisOptions);
            this.subscriber.on("error", (err) =>
                console.error("Redis subscriber error:", err),
            );

            this.subscriber.on(
                "message",
                (channel: string, message: string) => {
                    try {
                        const payload: SyncEventPayload = JSON.parse(message);
                        const channelHandlers = this.handlers.get(channel);
                        if (channelHandlers) {
                            channelHandlers.forEach((handler) =>
                                handler(payload),
                            );
                        }
                    } catch (err) {
                        console.error(
                            "Failed to parse Redis sync message:",
                            err,
                        );
                    }
                },
            );
        }
        return this.subscriber;
    }

    static async publish(
        targetUserId: string,
        payload: SyncEventPayload,
    ): Promise<void> {
        const channel = `drive:events:${targetUserId}`;
        await redisClient.publish(channel, JSON.stringify(payload));
    }

    static async subscribe(
        targetUserId: string,
        handler: (event: SyncEventPayload) => void,
    ): Promise<() => void> {
        const channel = `drive:events:${targetUserId}`;
        const sub = this.getSubscriber();

        if (!this.handlers.has(channel)) {
            this.handlers.set(channel, new Set());
            await sub.subscribe(channel);
        }

        this.handlers.get(channel)!.add(handler);

        return async () => {
            const channelHandlers = this.handlers.get(channel);
            if (channelHandlers) {
                channelHandlers.delete(handler);
                if (channelHandlers.size === 0) {
                    this.handlers.delete(channel);
                    await sub.unsubscribe(channel);
                }
            }
        };
    }
}