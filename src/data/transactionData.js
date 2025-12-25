import { pool } from "../config/db.js";

// ============================================================
// 1. دوال الاستعلام (Queries)
// ============================================================

// جلب أنواع المعاملات
export const getTransactionTypes = async () => {
    const query = `SELECT type_id AS id, type_name AS name FROM "Transaction_Type"`;
    const result = await pool.query(query);
    return result.rows;
};

// جلب المستلمين (Raw Data - سيتم تجميعها في الكنترولر)
// data/transactionData.js

export const getReceiversByLevel = async (userRoleLevel) => {
  let query = `
        SELECT 
            U.user_id, 
            U.full_name, 
            D.department_name,
            D.department_id,   -- 👈 ضفنا السطر ده عشان نجيب رقم القسم
            R.role_level
        FROM "User" U
        JOIN "User_Membership" UM ON U.user_id = UM.user_id
        JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        JOIN "Role" R ON DR.role_id = R.role_id
        JOIN "Department" D ON DR.department_id = D.department_id
    `;

  if (userRoleLevel == 1) {
    query += ` WHERE R.role_level IN (1, 2)`;
  } else {
    query += ` WHERE R.role_level = 2`;
  }

  const result = await pool.query(query);
  return result.rows;
};

// جلب المعاملات المرسلة من قبل المستخدم
export const getUserSentTransactions = async (userId) => {
    const query = `
        SELECT transaction_id, code, subject, date , current_status
        FROM "Transaction" 
        WHERE sender_user_id = $1 AND is_draft = false 
        ORDER BY date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

// البريد الوارد (المعاملات التي تحتاج لرد)
export const getUserInboxTransactions = async (userId) => {
    const query = `
        SELECT 
            T.transaction_id, T.code, T.subject, T.date,
            U.full_name AS sender_name
        FROM "Transaction" T
        JOIN "Transaction_Receiver" TR ON T.transaction_id = TR.transaction_id
        LEFT JOIN "User" U ON T.sender_user_id = U.user_id
        WHERE 
            TR.receiver_user_id = $1
            AND T.is_draft = false
            AND NOT EXISTS (
                SELECT 1 FROM "Action" A
                WHERE A.transaction_id = T.transaction_id AND A.performer_user_id = $1
            )
        ORDER BY T.date DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

// جلب تفاصيل المعاملة الأساسية
export const getTransactionDetailsById = async (transId) => {
    const query = `
        SELECT 
            T.transaction_id, T.subject, T.content, T.code, T.date, T.current_status,
            U.full_name AS sender_name,
            TP.type_name
        FROM "Transaction" T
        LEFT JOIN "User" U ON T.sender_user_id = U.user_id
        LEFT JOIN "Transaction_Type" TP ON T.type_id = TP.type_id
        WHERE T.transaction_id = $1
    `;
    const result = await pool.query(query, [transId]);
    return result.rows[0];
};

// جلب المرفقات
export const getTransactionAttachments = async (transId) => {
    const query = `SELECT attachment_id, file_path, description, attachment_date FROM "Attachment" WHERE transaction_id = $1`;
    const result = await pool.query(query, [transId]);
    return result.rows;
};

// 🔥 (جديد) جلب التتبع الكامل (Timeline)
export const getTransactionTimeline = async (transId) => {
    const query = `
        SELECT * FROM (
            -- 1. حركة انتقال المعاملة (Path)
            SELECT 
                'movement' AS type,
                TP.created_at AS date,
                'وصول وارد' AS title,
                TP.path_notes AS description,
                'System' AS performer,
                D2.department_name AS department -- القسم الذي وصلت إليه
            FROM "Transaction_Path" TP
            JOIN "Department" D2 ON TP.to_department_id = D2.department_id
            WHERE TP.transaction_id = $1

            UNION ALL

            -- 2. الإجراءات التي تمت (Actions)
            SELECT 
                'action' AS type,
                A.execution_date AS date,
                A.action_name AS title,
                A.annotation AS description,
                U.full_name AS performer,
                D.department_name AS department -- قسم الموظف الذي قام بالإجراء
            FROM "Action" A
            JOIN "User" U ON A.performer_user_id = U.user_id
            LEFT JOIN "User_Membership" UM ON U.user_id = UM.user_id
            LEFT JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
            LEFT JOIN "Department" D ON DR.department_id = D.department_id
            WHERE A.transaction_id = $1

            UNION ALL

            -- 3. الإحالات المتفرعة (Child Transactions)
            SELECT 
                'referral' AS type,
                T.date AS date,
                'إحالة معاملة' AS title,
                CONCAT('تم إنشاء معاملة جديدة برقم: ', T.code) AS description,
                U.full_name AS performer,
                'إلى جهة أخرى' AS department
            FROM "Transaction" T
            JOIN "User" U ON T.sender_user_id = U.user_id
            WHERE T.parent_transaction_id = $1

        ) AS Timeline
        ORDER BY date ASC;
    `;
    const result = await pool.query(query, [transId]);
    return result.rows;
};

// ============================================================
// 2. دوال المساعدة (Helpers & Inserts)
// ============================================================

export const getUserName = async (userId) => {
    const result = await pool.query(`SELECT full_name FROM "User" WHERE user_id = $1`, [userId]);
    return result.rows[0]?.full_name || "Unknown";
};

export const getUserDepartmentId = async (userId) => {
    const query = `
        SELECT D.department_id 
        FROM "User_Membership" UM
        JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        JOIN "Department" D ON DR.department_id = D.department_id
        WHERE UM.user_id = $1 LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
};

export const getUsersByDepartmentId = async (client, departmentId) => {
    const query = `
        SELECT U.user_id FROM "User" U
        JOIN "User_Membership" UM ON U.user_id = UM.user_id
        JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        WHERE DR.department_id = $1
    `;
    const result = await client.query(query, [departmentId]);
    return result.rows.map(r => r.user_id);
};

// ============================================================
// 3. دوال الإدخال (Insert Operations)
// ============================================================

export const insertTransaction = async (client, data) => {
    const query = `
        INSERT INTO "Transaction" (subject, content, type_id, sender_user_id, parent_transaction_id, is_draft, current_status, code, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING transaction_id;
    `;
    const res = await client.query(query, [
        data.subject, data.content, data.type_id, data.sender_id, data.parent_id, 
        data.is_draft, data.current_state, data.code
    ]);
    return res.rows[0].transaction_id;
};

export const insertAttachment = async (client, fileData) => {
    const query = `INSERT INTO "Attachment" (file_path, description, transaction_id, attachment_date) VALUES ($1, $2, $3, NOW())`;
    await client.query(query, [fileData.path, fileData.description || fileData.originalname, fileData.transaction_id]);
};

export const insertReceiver = async (client, transId, receiverId) => {
    await client.query(`INSERT INTO "Transaction_Receiver" (transaction_id, receiver_user_id) VALUES ($1, $2)`, [transId, receiverId]);
};

export const insertTransactionPath = async (client, { transId, fromDeptId, toDeptId, notes }) => {
    const query = `INSERT INTO "Transaction_Path" (transaction_id, from_department_id, to_department_id, path_notes, created_at) VALUES ($1, $2, $3, $4, NOW())`;
    await client.query(query, [transId, fromDeptId, toDeptId, notes]);
};

export const insertAction = async (client, data) => {
    const query = `
        INSERT INTO "Action" (action_name, execution_date, annotation, transaction_id, performer_user_id, target_department_id)
        VALUES ($1, NOW(), $2, $3, $4, $5) RETURNING action_id;
    `;
    const res = await client.query(query, [data.action_name, data.annotation, data.transaction_id, data.performer_user_id, data.target_department_id]);
    return res.rows[0].action_id;
};

export const updateTransactionStatus = async (client, transId, status) => {
    await client.query(`UPDATE "Transaction" SET current_status = $2 WHERE transaction_id = $1`, [transId, status]);
};

export const createAndEmitNotification = async (client, { userId, transId, subject, snippet, senderName }, io) => {
    const query = `INSERT INTO "Notification" (user_id, transaction_id, is_read) VALUES ($1, $2, false) RETURNING notification_id`;
    const res = await client.query(query, [userId, transId]);
    
    if (io) {
        io.to(`user_${userId}`).emit("new_notification", {
            id: res.rows[0].notification_id,
            subject,
            messageSnippet: snippet,
            senderName,
            date: new Date()
        });
    }
};