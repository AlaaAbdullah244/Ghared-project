// src/controllers/reportController.js
import asyncWrapper from "../middelware/asyncwraper.js";
import httpStatusText from "../utils/httpStatusText.js";
import * as ReportData from "../data/reportData.js";
import appError from "../utils/appError.js";

export const getUserDashboardStats = asyncWrapper(async (req, res, next) => {
  const userId = req.userId; // قادم من verifyToken middleware

  // تشغيل الاستعلامين بشكل متوازي لسرعة الاستجابة
  const [sentStatsRows, inboxStatsRow] = await Promise.all([
    ReportData.getSentStatistics(userId),
    ReportData.getInboxStatistics(userId),
  ]);

  // 1. معالجة إحصائيات المرسل
  let totalSent = 0;
  const statusesObj = {};

  sentStatsRows.forEach((row) => {
    const count = parseInt(row.count, 10);
    statusesObj[row.current_status] = count;
    totalSent += count;
  });

  // 2. معالجة إحصائيات الوارد
  const inboxStats = {
    total_received: parseInt(inboxStatsRow.total_received || 0, 10),
    action_needed: parseInt(inboxStatsRow.action_needed || 0, 10),
    completed: parseInt(inboxStatsRow.completed || 0, 10),
  };

  // 3. إرسال الاستجابة بالشكل المطلوب
  res.status(200).json({
    status: httpStatusText.SUCCESS, // "success"
    message: "تم جلب إحصائيات المستخدم بنجاح",
    data: {
      sent_statistics: {
        total_sent: totalSent,
        statuses: statusesObj,
      },
      inbox_statistics: inboxStats,
    },
  });
});

// ============================================================
// 1. (جديد) تقرير التقدم السنوي (Admin Only)
// ============================================================
export const getAdminYearlyProgress = asyncWrapper(async (req, res, next) => {
  // التحقق من الصلاحية (Admin Role Level = 0)
  // نفترض أن الـ middleware قام بفك التوكن ووضع role في req.currentUserRole
  if (req.currentUserRole !== 0) {
    return next(appError.create("غير مصرح لك بالوصول لهذه البيانات", 403, httpStatusText.FAIL));
  }

  const { monthly, statuses } = await ReportData.getYearlyProgressStats();

  // تنسيق البيانات
  let totalTransactions = 0;
  const monthlyProgress = monthly.map(row => {
    const count = parseInt(row.count, 10);
    totalTransactions += count;
    return {
      month: row.month,
      transactions_count: count
    };
  });

  const statusBreakdown = {};
  statuses.forEach(row => {
    statusBreakdown[row.current_status] = parseInt(row.count, 10);
  });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "تم جلب تقرير أداء النظام لآخر عام بنجاح",
    data: {
      total_yearly_transactions: totalTransactions,
      monthly_progress: monthlyProgress,
      yearly_status_breakdown: statusBreakdown
    }
  });
});

// ============================================================
// 2. (جديد) تقرير أداء الأقسام (Admin Only)
// ============================================================
export const getAdminDepartmentsPerformance = asyncWrapper(async (req, res, next) => {
  // التحقق من الصلاحية
  if (req.currentUserRole !== 0) {
    return next(appError.create("غير مصرح لك بالوصول لهذه البيانات", 403, httpStatusText.FAIL));
  }

  const departmentsStats = await ReportData.getDepartmentsPerformanceStats();

  // تحويل الأرقام من String (Postgres default for count) إلى Number
  const formattedStats = departmentsStats.map(dep => ({
    ...dep,
    total_received: parseInt(dep.total_received, 10),
    pending_transactions: parseInt(dep.pending_transactions, 10)
  }));

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "تم جلب إحصائيات الأقسام بنجاح",
    data: {
      departments: formattedStats
    }
  });
});