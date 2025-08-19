"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
const dashboardService = new dashboardService_1.DashboardService();
class DashboardController {
    constructor() {
        this.getStats = async (req, res, next) => {
            try {
                const stats = await dashboardService.getStats();
                return res.json(stats);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getChartData = async (req, res, next) => {
            try {
                const chartData = await dashboardService.getChartData();
                return res.json(chartData);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getRecentActivities = async (req, res, next) => {
            try {
                const activities = await dashboardService.getRecentActivities();
                return res.json(activities);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getMonthlyRevenue = async (req, res, next) => {
            try {
                const year = req.query.year
                    ? parseInt(req.query.year)
                    : undefined;
                const data = await dashboardService.getMonthlyRevenue(year);
                return res.json(data);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getAvailableYears = async (req, res, next) => {
            try {
                const years = await dashboardService.getAvailableYears();
                return res.json(years);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getRecentActivity = async (req, res, next) => {
            try {
                const activities = await dashboardService.getRecentActivities();
                return res.json(activities);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getRevenue = async (req, res, next) => {
            try {
                const period = req.query.period || 'month';
                const revenue = await dashboardService.getRevenue(period);
                return res.json(revenue);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getBookingTrends = async (req, res, next) => {
            try {
                const trends = await dashboardService.getBookingTrends();
                return res.json(trends);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getTopEquipment = async (req, res, next) => {
            try {
                const equipment = await dashboardService.getTopEquipment();
                return res.json(equipment);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getTopClients = async (req, res, next) => {
            try {
                const clients = await dashboardService.getTopClients();
                return res.json(clients);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getLiveStats = async (req, res, next) => {
            try {
                const stats = await dashboardService.getLiveStats();
                return res.json(stats);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getNotifications = async (req, res, next) => {
            try {
                const notifications = await dashboardService.getNotifications();
                return res.json(notifications);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.DashboardController = DashboardController;
