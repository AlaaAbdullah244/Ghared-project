// src/controllers/reportController.js
import asyncWrapper from "../middelware/asyncwraper.js";
import httpStatusText from "../utils/httpStatusText.js";
import * as ReportData from "../data/reportData.js";
import * as TransactionData from "../data/transactionData.js";
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

  const { monthly, statuses } = await ReportData.getYearlyProgressStatsWithApprovals();

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

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateAnnualReport = asyncWrapper(async (req, res, next) => {
    const { organizationId } = req.query;
    let transactions = await TransactionData.getAllTransactions();
    
    // Filter for the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    transactions = transactions.filter(t => new Date(t.date) >= oneYearAgo);

    if (organizationId) {
        transactions = transactions.filter(t => t.department_id == organizationId);
    }

    // Calculate statistics
    const monthlyStats = {};
    const statusStats = {};
    const totalTransactions = transactions.length;

    transactions.forEach(t => {
        // Monthly Progress
        const date = new Date(t.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyStats[monthYear] = (monthlyStats[monthYear] || 0) + 1;

        // Status Breakdown
        statusStats[t.current_status] = (statusStats[t.current_status] || 0) + 1;
    });

    // Format monthly progress to match the admin dashboard format
    const monthlyProgress = Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, transactions_count: count }));

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        message: "تم جلب بيانات وإحصائيات التقرير السنوي بنجاح",
        data: {
            total_yearly_transactions: totalTransactions,
            monthly_progress: monthlyProgress,
            yearly_status_breakdown: statusStats,
            transactions_list: transactions
        }
    });
});

export const generateAnnualReportPDF_old = asyncWrapper(async (req, res, next) => {
    if (req.currentUserRole !== 0) {
        return next(appError.create("غير مصرح لك بالوصول لهذه البيانات", 403, httpStatusText.FAIL));
    }

    const { monthly, statuses, approvals } = await ReportData.getYearlyProgressStatsWithApprovals();

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=annual_report.pdf');

    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(25).text('Annual Report', { align: 'center' });

    doc.moveDown();

    // Monthly Progress
    doc.fontSize(20).text('Monthly Progress');
    const monthlyTable = {
        headers: ['Month', 'Transactions Count'],
        rows: monthly.map(row => [row.month, row.count])
    };
    // Using a simple table layout
    let tableTop = doc.y;
    doc.fontSize(12);
    const colWidths = [150, 150];
    let startX = doc.x;
    let startY = tableTop;

    // Draw headers
    monthlyTable.headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidths[i], startY, { width: colWidths[i], align: 'left' });
    });

    startY += 25;

    // Draw rows
    monthlyTable.rows.forEach(row => {
        row.forEach((cell, i) => {
            doc.text((cell || '').toString(), startX + i * colWidths[i], startY, { width: colWidths[i], align: 'left' });
        });
        startY += 25;
    });

    doc.moveDown();
    
    // Status Breakdown
    doc.fontSize(20).text('Status Breakdown');
    const statusBreakdown = {};
    statuses.forEach(row => {
        statusBreakdown[row.current_status] = parseInt(row.count, 10);
    });
    const statusTable = {
        headers: ['Status', 'Count'],
        rows: Object.entries(statusBreakdown).map(([status, count]) => [status, count])
    };

    tableTop = doc.y;
    startY = tableTop;

    // Draw headers
    statusTable.headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidths[i], startY, { width: colWidths[i], align: 'left' });
    });
    
    startY += 25;

    // Draw rows
    statusTable.rows.forEach(row => {
        row.forEach((cell, i) => {
            doc.text((cell || '').toString(), startX + i * colWidths[i], startY, { width: colWidths[i], align: 'left' });
        });
        startY += 25;
    });


    doc.moveDown();

    // Approvals with Signatures
    doc.fontSize(20).text('Approvals');
    for (const approval of approvals) {
        doc.fontSize(12).text(`Transaction: ${approval.subject}`);
        doc.fontSize(10).text(`Approved by: ${approval.performer_name}`);
        if (approval.signature_path) {
            const signaturePath = path.join(__dirname, '..', 'uploads', 'Images', approval.signature_path);
            if (fs.existsSync(signaturePath)) {
                try {
                    doc.image(signaturePath, { width: 100 });
                } catch (err) {
                    doc.text('Invalid Image');
                }
            }
        }
        doc.moveDown();
    }

    try {
        doc.end();
    } catch (err) {
        console.error("Error ending PDF document:", err);
    }
});