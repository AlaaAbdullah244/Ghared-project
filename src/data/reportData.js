// src/data/reportData.js
import { pool } from "../config/db.js";

// ============================================================
// 1. إحصائيات المعاملات الصادرة (Sent Statistics)
// ============================================================
export const getSentStatistics = async (userId) => {
  // نقوم بتجميع المعاملات حسب الحالة (current_status) للمرسل الحالي
  const query = `
    SELECT current_status, COUNT(*) as count 
    FROM "Transaction" 
    WHERE sender_user_id = $1 AND is_draft = false 
    GROUP BY current_status;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// ============================================================
// 2. إحصائيات صندوق الوارد (Inbox Statistics)
// ============================================================
export const getInboxStatistics = async (userId) => {
  // نقوم بحساب:
  // 1. إجمالي المستلم (total_received)
  // 2. يحتاج إجراء (action_needed): لم يقم المستخدم الحالي بعمل Action عليها
  // 3. مكتمل (completed): قام المستخدم الحالي بعمل Action عليها
  const query = `
    SELECT 
        COUNT(TR.transaction_id) AS total_received,
        
        COUNT(TR.transaction_id) FILTER (
            WHERE NOT EXISTS (
                SELECT 1 FROM "Action" A 
                WHERE A.transaction_id = TR.transaction_id AND A.performer_user_id = $1
            )
        ) AS action_needed,
        
        COUNT(TR.transaction_id) FILTER (
            WHERE EXISTS (
                SELECT 1 FROM "Action" A 
                WHERE A.transaction_id = TR.transaction_id AND A.performer_user_id = $1
            )
        ) AS completed
        
    FROM "Transaction_Receiver" TR
    JOIN "Transaction" T ON TR.transaction_id = T.transaction_id
    WHERE TR.receiver_user_id = $1 AND T.is_draft = false;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0]; 
};

// ============================================================
// 3. (جديد) تقرير الأداء السنوي للنظام (Admin)
// ============================================================
export const getYearlyProgressStatsWithApprovals = async () => {
  // 1. جلب عدد المعاملات لكل شهر في آخر سنة
  const monthlyQuery = `
    SELECT TO_CHAR(date, 'YYYY-MM') as month, COUNT(*) as count
    FROM "Transaction"
    WHERE date >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month ASC;
  `;

  // 2. جلب توزيع الحالات لنفس الفترة
  const statusQuery = `
    SELECT current_status, COUNT(*) as count
    FROM "Transaction"
    WHERE date >= NOW() - INTERVAL '12 months'
    GROUP BY current_status;
  `;

  // 3. جلب الموافقات مع التواقيع
  const approvalsQuery = `
    SELECT 
        T.subject,
        U.full_name as performer_name,
        A.signature_path
    FROM "Action" A
    JOIN "Transaction" T ON A.transaction_id = T.transaction_id
    JOIN "User" U ON A.performer_user_id = U.user_id
    WHERE A.action_name = 'موافقة' AND A.execution_date >= NOW() - INTERVAL '12 months'
  `;

  const [monthlyRes, statusRes, approvalsRes] = await Promise.all([
    pool.query(monthlyQuery),
    pool.query(statusQuery),
    pool.query(approvalsQuery)
  ]);

  return { monthly: monthlyRes.rows, statuses: statusRes.rows, approvals: approvalsRes.rows };
};

// ============================================================
// 4. (جديد) تقرير أداء الأقسام (Admin)
// ============================================================
export const getDepartmentsPerformanceStats = async () => {
  const query = `
    SELECT 
        D.department_id, 
        D.department_name,
        COUNT(TP.transaction_id) AS total_received,
        COUNT(TP.transaction_id) FILTER (WHERE T.current_status = 'قيد المعالجة') AS pending_transactions
    FROM "Department" D
    LEFT JOIN "Transaction_Path" TP ON D.department_id = TP.to_department_id
    LEFT JOIN "Transaction" T ON TP.transaction_id = T.transaction_id
    GROUP BY D.department_id, D.department_name
    ORDER BY pending_transactions DESC; -- الترتيب حسب الأكثر تكدساً
  `;
  
  const result = await pool.query(query);
  return result.rows;
};