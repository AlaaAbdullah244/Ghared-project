// src/routes/reportRouter.js
import express from "express";
import * as reportController from "../controllers/reportController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = express.Router();

// تطبيق التحقق من التوكن (لاستخراج userId)
router.use(verifyToken);

// المسار المطلوب: GET /api/reports/user-dashboard
router.get("/user-dashboard", reportController.getUserDashboardStats);

// 2. (جديد) تقرير التقدم السنوي (Admin Only)
router.get("/admin/yearly-progress", reportController.getAdminYearlyProgress);

// New route for annual report
router.get("/annual-report", reportController.generateAnnualReport);

// 4. (جديد) تقرير التقدم السنوي PDF (Admin Only)
router.get("/admin/yearly-progress/pdf", reportController.generateAnnualReportPDF_old);

export default router;