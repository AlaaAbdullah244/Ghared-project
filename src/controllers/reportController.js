// src/controllers/reportController.js
import asyncWrapper from "../middelware/asyncwraper.js";
import httpStatusText from "../utils/httpStatusText.js";
import * as ReportData from "../data/reportData.js";

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