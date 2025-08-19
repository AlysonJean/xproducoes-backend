"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCreateSchema = void 0;
const zod_1 = require("zod");
exports.reviewCreateSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    bookingId: zod_1.z.string().uuid(),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(2000).optional(),
}).strict();
