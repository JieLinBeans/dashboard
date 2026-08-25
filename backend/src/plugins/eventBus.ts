import { EventEmitter } from "node:events";

// One shared emitter for the whole process. Event name = `attempt:${attemptId}`
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(0);
