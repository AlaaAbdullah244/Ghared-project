import { pool } from "../config/db.js";

// 1. جلب أنواع المعاملات
export const getTransactionTypes = async () => {
  const query = `SELECT type_id AS id, type_name AS name FROM "Transaction_Type"`;
  const result = await pool.query(query);
  return result.rows;
};

// 2. جلب المستلمين (فلترة حسب المستوى الإداري)
export const getReceiversByLevel = async (userRoleLevel) => {
  let query = `
        SELECT 
            U.user_id, 
            U.full_name, 
            D.department_name,
            R.role_level
        FROM "User" U
        JOIN "User_Membership" UM ON U.user_id = UM.user_id
        JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        JOIN "Role" R ON DR.role_id = R.role_id
        JOIN "Department" D ON DR.department_id = D.department_id
    `;

  // لو مستوى 1 (إدارة عليا) يشوف 1 و 2، لو مستوى 2 يشوف 2 بس
  if (userRoleLevel == 1) {
    query += ` WHERE R.role_level IN (1, 2)`;
  } else {
    query += ` WHERE R.role_level = 2`;
  }

  const result = await pool.query(query);
  return result.rows;
};

// 3. البحث عن المعاملات المرسلة (للرد)
export const getUserSentTransactions = async (userId) => {
  const query = `
        SELECT transaction_id, code, subject, date , current_status
        FROM "Transaction" 
        WHERE sender_user_id = $1 
        AND is_draft = false 
        ORDER BY date DESC
    `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// 5. إدخال المرفقات
export const insertAttachment = async (client, fileData) => {
  const query = `
        INSERT INTO "Attachment" (file_path, description, transaction_id, attachment_date)
        VALUES ($1, $2, $3, NOW())
    `;
  // التأكد من وجود وصف أو استخدام اسم الملف
  const description = fileData.description || fileData.originalname;
  await client.query(query, [
    fileData.path,
    description,
    fileData.transaction_id,
  ]);
};

// 6. إدخال المستلمين
export const insertReceiver = async (client, transId, receiverId) => {
  const query = `
        INSERT INTO "Transaction_Receiver" (transaction_id, receiver_user_id)
        VALUES ($1, $2)
    `;
  await client.query(query, [transId, receiverId]);
};

// 7. مساعد: جلب قسم المستخدم
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

// 4. البريد الوارد (المعاملات الواردة التي لم يتم الرد عليها بعد من هذا المستخدم)
export const getUserInboxTransactions = async (userId) => {
  const query = `
        SELECT 
            T.transaction_id,
            T.code,
            T.subject,
            T.date,
            U.full_name AS sender_name
        FROM "Transaction" T
        JOIN "Transaction_Receiver" TR 
            ON T.transaction_id = TR.transaction_id
        LEFT JOIN "User" U 
            ON T.sender_user_id = U.user_id
        WHERE 
            TR.receiver_user_id = $1
            AND T.is_draft = false
            -- لم يقم هذا المستخدم بأي إجراء مسجل على هذه المعاملة بعد
            AND NOT EXISTS (
                SELECT 1 FROM "Action" A
                WHERE 
                    A.transaction_id = T.transaction_id
                    AND A.performer_user_id = $1
            )
        ORDER BY T.date DESC;
    `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// 8. إدخال المعاملة (Insert Transaction)
export const insertTransaction = async (client, data) => {
  const query = `
        INSERT INTO "Transaction" 
        (subject, content, type_id, sender_user_id, parent_transaction_id, is_draft, current_status, code, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING transaction_id;
    `;

  const result = await client.query(query, [
    data.subject,
    data.content,
    data.type_id,
    data.sender_id,
    data.parent_id,
    data.is_draft,
    data.current_state, // تأكدي أن العمود في الداتابيس اسمه current_status والقيمة جاية من current_state
    data.code,
  ]);
  return result.rows[0].transaction_id;
};

// 8.1 إدخال إجراء جديد على معاملة (Action)
export const insertAction = async (client, data) => {
  const query = `
        INSERT INTO "Action" 
        (action_name, execution_date, annotation, transaction_id, performer_user_id, target_department_id)
        VALUES ($1, NOW(), $2, $3, $4, $5)
        RETURNING action_id;
    `;
  const result = await client.query(query, [
    data.action_name,
    data.annotation || null,
    data.transaction_id,
    data.performer_user_id,
    data.target_department_id || null,
  ]);
  return result.rows[0].action_id;
};

// 8.2 تحديث حالة المعاملة
export const updateTransactionStatus = async (client, transId, newStatus) => {
  const query = `
        UPDATE "Transaction"
        SET current_status = $2
        WHERE transaction_id = $1
    `;
  await client.query(query, [transId, newStatus]);
};

// 9. تسجيل المسار
export const insertTransactionPath = async (client, pathData) => {
  const query = `
        INSERT INTO "Transaction_Path" 
        (transaction_id, from_department_id, to_department_id, path_notes, created_at)
        VALUES ($1, $2, $3, $4, NOW())
    `;
  await client.query(query, [
    pathData.transId,
    pathData.fromDeptId,
    pathData.toDeptId,
    pathData.notes,
  ]);
};

// 10. 🔥 حفظ الإشعار + السوكيت (تم التصحيح هنا) ✅
// export const createAndEmitNotification = async (client, notifData, io) => {
//     // ✅ التصحيح: أضفنا عمود 'content' في جملة الـ INSERT و أضفنا $3
//     // عشان يتوافق مع الـ 3 قيم اللي مبعوتة في المصفوفة
//     const query = `
//         INSERT INTO "Notification" (user_id, transaction_id, is_read)
//         VALUES ($1, $2, false)
//         RETURNING notification_id;
//     `;

//     // المصفوفة فيها 3 عناصر: [userId, transId, content]
//     // فكان لازم الكويري يكون فيه $1, $2, $3
//     const result = await client.query(query, [notifData.userId, notifData.transId]);
//     const savedNotif = result.rows[0];

//     // إرسال Socket
//     if (io) {
//         io.to(`user_${notifData.userId}`).emit('new_notification', {
//             id: savedNotif.notification_id,
//             message: notifData.content,
//             transactionContent: notifData.content,
//             senderName: notifData.senderName
//         });
//     }
// };

// transactionData.js

// ... (الدوال السابقة)

// ✅ دالة جديدة: جلب اسم المستخدم (عشان نبعته في الإشعار)
export const getUserName = async (userId) => {
  const query = `SELECT full_name FROM "User" WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows[0] ? result.rows[0].full_name : "مستخدم غير معروف";
};

// ... (باقي الدوال)

// ✅ دالة الإشعار والسوكيت (تأكدي أنها بهذا الشكل)
export const createAndEmitNotification = async (client, notifData, io) => {
  // 1. الحفظ في الداتابيس
  const query = `
        INSERT INTO "Notification" (user_id, transaction_id, is_read)
        VALUES ($1, $2, false)
        RETURNING notification_id;
    `;
  const result = await client.query(query, [
    notifData.userId,
    notifData.transId,
  ]);
  const savedNotif = result.rows[0];

  // 2. إرسال السوكيت بالبيانات الكاملة
  if (io) {
    io.to(`user_${notifData.userId}`).emit("new_notification", {
      id: savedNotif.notification_id,
      subject: notifData.subject, // عنوان المعاملة
      messageSnippet: notifData.snippet, // جزء من المحتوى
      senderName: notifData.senderName, // اسم المرسل
      date: new Date(),
    });
  }
};

// 10.1 جلب المستخدمين في قسم معيّن (لاستخدامها في الإحالة)
export const getUsersByDepartmentId = async (client, departmentId) => {
  const query = `
        SELECT U.user_id
        FROM "User" U
        JOIN "User_Membership" UM ON U.user_id = UM.user_id
        JOIN "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        WHERE DR.department_id = $1
    `;
  const result = await client.query(query, [departmentId]);
  return result.rows.map((r) => r.user_id);
};

// data/transactionData.js

// ... (الدوال السابقة موجودة كما هي) ...

// ==========================================
//  دوال عرض تفاصيل المعاملة (New APIs)
// ==========================================

// 1. جلب تفاصيل المعاملة الأساسية
export const getTransactionDetailsById = async (transId) => {
  const query = `
        SELECT 
            T.transaction_id, 
            T.subject, 
            T.content, 
            T.code, 
            T.date, 
            T.current_status,
            U.full_name AS sender_name,
            TP.type_name
        FROM "Transaction" T
        LEFT JOIN "User" U ON T.sender_user_id = U.user_id
        LEFT JOIN "Transaction_Type" TP ON T.type_id = TP.type_id
        WHERE T.transaction_id = $1
    `;
  const result = await pool.query(query, [transId]);
  return result.rows[0]; // يرجع صف واحد أو undefined
};

// 2. جلب المرفقات الخاصة بالمعاملة
export const getTransactionAttachments = async (transId) => {
  const query = `
        SELECT attachment_id, file_path, description, attachment_date
        FROM "Attachment"
        WHERE transaction_id = $1
    `;
  const result = await pool.query(query, [transId]);
  return result.rows; // يرجع مصفوفة
};

// 3. جلب سجل تحركات المعاملة (المسار)
export const getTransactionHistory = async (transId) => {
  const query = `
        SELECT 
            TP.path_id, 
            TP.path_notes, 
            TP.created_at,
            D1.department_name AS from_department,
            D2.department_name AS to_department
        FROM "Transaction_Path" TP
        LEFT JOIN "Department" D1 ON TP.from_department_id = D1.department_id
        LEFT JOIN "Department" D2 ON TP.to_department_id = D2.department_id
        WHERE TP.transaction_id = $1
        ORDER BY TP.created_at ASC
    `;
  const result = await pool.query(query, [transId]);
  return result.rows; // يرجع مصفوفة
};
