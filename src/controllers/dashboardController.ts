import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboardService";

const dashboardService = new DashboardService();

export class DashboardController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getStats();
      return res.json(stats);
    } catch (error) {
      return next(error);
    }
  };

  getChartData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chartData = await dashboardService.getChartData();
      return res.json(chartData);
    } catch (error) {
      return next(error);
    }
  };

  getRecentActivities = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const activities = await dashboardService.getRecentActivities();
      return res.json(activities);
    } catch (error) {
      return next(error);
    }
  };

  getMonthlyRevenue = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      const data = await dashboardService.getMonthlyRevenue(year);
      return res.json(data);
    } catch (error) {
      return next(error);
    }
  };

  getAvailableYears = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const years = await dashboardService.getAvailableYears();
      return res.json(years);
    } catch (error) {
      return next(error);
    }
  };

  getRecentActivity = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const activities = await dashboardService.getRecentActivities();
      return res.json(activities);
    } catch (error) {
      return next(error);
    }
  };

  getRevenue = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const period = req.query.period as string || 'month';
      const revenue = await dashboardService.getRevenue(period);
      return res.json(revenue);
    } catch (error) {
      return next(error);
    }
  };

  getBookingTrends = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const trends = await dashboardService.getBookingTrends();
      return res.json(trends);
    } catch (error) {
      return next(error);
    }
  };

  getTopEquipment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const equipment = await dashboardService.getTopEquipment();
      return res.json(equipment);
    } catch (error) {
      return next(error);
    }
  };

  getTopClients = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const clients = await dashboardService.getTopClients();
      return res.json(clients);
    } catch (error) {
      return next(error);
    }
  };

  getLiveStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const stats = await dashboardService.getLiveStats();
      return res.json(stats);
    } catch (error) {
      return next(error);
    }
  };

  getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const notifications = await dashboardService.getNotifications();
      return res.json(notifications);
    } catch (error) {
      return next(error);
    }
  };
}
