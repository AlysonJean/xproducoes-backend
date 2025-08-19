"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const equipmentRoutes_1 = __importDefault(require("./equipmentRoutes"));
const kitRoutes_1 = __importDefault(require("./kitRoutes"));
const categoryRoutes_1 = __importDefault(require("./categoryRoutes"));
const bookingRoutes_1 = __importDefault(require("./bookingRoutes"));
const reviewRoutes_1 = __importDefault(require("./reviewRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./dashboardRoutes"));
const portfolioRoutes_1 = __importDefault(require("./portfolioRoutes"));
const paymentRoutes_1 = __importDefault(require("./paymentRoutes"));
const uploadRoutes_1 = __importDefault(require("./uploadRoutes"));
const contactRoutes_1 = __importDefault(require("./contactRoutes"));
const faqRoutes_1 = __importDefault(require("./faqRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const cartRoutes_1 = __importDefault(require("./cartRoutes"));
const profileRoutes_1 = __importDefault(require("./profileRoutes"));
const quoteRoutes_1 = __importDefault(require("./quoteRoutes"));
const geminiRoutes_1 = __importDefault(require("./geminiRoutes"));
const collaboratorRoutes_1 = __importDefault(require("./collaboratorRoutes"));
const collaboratorPaymentRoutes_1 = __importDefault(require("./collaboratorPaymentRoutes"));
const router = (0, express_1.Router)();
// Core routes
router.use("/equipment", equipmentRoutes_1.default);
router.use("/equipments", equipmentRoutes_1.default); // alias plural
router.use("/kit", kitRoutes_1.default);
router.use("/kits", kitRoutes_1.default);
router.use("/category", categoryRoutes_1.default);
router.use("/categories", categoryRoutes_1.default);
router.use("/booking", bookingRoutes_1.default);
router.use("/bookings", bookingRoutes_1.default);
router.use("/review", reviewRoutes_1.default);
router.use("/reviews", reviewRoutes_1.default);
router.use("/user", userRoutes_1.default);
router.use("/users", userRoutes_1.default);
router.use("/portfolio", portfolioRoutes_1.default);
router.use("/faq", faqRoutes_1.default);
router.use("/cart", cartRoutes_1.default);
router.use("/dashboard", dashboardRoutes_1.default);
// Auth routes
router.use("/auth", authRoutes_1.default);
// Feature routes
router.use("/payments", paymentRoutes_1.default);
// router.use("/uploads", uploadRoutes); // Removido - agora usa Cloudinary
router.use("/contact", contactRoutes_1.default);
router.use("/profile", profileRoutes_1.default);
router.use("/quotes", quoteRoutes_1.default);
router.use("/gemini", geminiRoutes_1.default);
router.use("/collaborators", collaboratorRoutes_1.default);
router.use('/logo', require('./logoRoutes').default);
// Admin routes
router.use("/admin", adminRoutes_1.default);
// Upload routes (Cloudinary uploads)
// Expose both /upload and /uploads for compatibility with frontend expectations
router.use('/upload', uploadRoutes_1.default);
router.use('/uploads', uploadRoutes_1.default);
router.use('/collaborator-payments', collaboratorPaymentRoutes_1.default);
// Health endpoint
router.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        version: process.env["npm_package_version"] || "1.0.0",
        environment: process.env["NODE_ENV"] || "development",
    });
});
// Health detailed endpoint
router.get("/health/detailed", (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        version: process.env["npm_package_version"] || "1.0.0",
        environment: process.env["NODE_ENV"] || "development",
        memory: {
            used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
            total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
            rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
            external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
        },
    });
});
exports.default = router;
