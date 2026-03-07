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