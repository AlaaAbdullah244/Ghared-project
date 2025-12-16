import { pool } from "../config/db.js";

// 1. جلب مسودات المستخدم فقط
export const getDraftsByUserId = async (userId) => {
    const query = `
        SELECT transaction_id, code, subject, date, current_status
        FROM "Transaction" 
        WHERE sender_user_id = $1 
        AND is_draft = true 
        ORDER BY date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

// 2. التحقق من ملكية المسودة (عشان محدش يعدل مسودة غيره)
export const getDraftByIdAndUser = async (transId, userId) => {
    const query = `
        SELECT * FROM "Transaction" 
        WHERE transaction_id = $1 AND sender_user_id = $2 AND is_draft = true
    `;
    const result = await pool.query(query, [transId, userId]);
    return result.rows[0];
};

// 3. تحديث البيانات الأساسية للمسودة
export const updateDraftDetails = async (client, transId, data) => {
    const query = `
        UPDATE "Transaction"
        SET 
            subject = $1, 
            content = $2, 
            type_id = $3, 
            is_draft = $4, 
            current_status = $5,
            parent_transaction_id = $6,
            date = NOW() -- تحديث التاريخ لآخر تعديل
        WHERE transaction_id = $7
    `;
    await client.query(query, [
        data.subject, 
        data.content, 
        data.type_id, 
        data.is_draft,
        data.current_status,
        data.parent_id,
        transId
    ]);
};

// 4. حذف مسودة (تم التعديل لحل مشكلة الـ Foreign Key) ✅
export const deleteDraftById = async (transId, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // بدأنا معاملة داتابيز

        // أ) حذف المرفقات المرتبطة بهذه المسودة أولاً
        const deleteAttachmentsQuery = `
            DELETE FROM "Attachment" 
            WHERE transaction_id = $1
        `;
        await client.query(deleteAttachmentsQuery, [transId]);

        // ب) حذف المسودة نفسها الآن بعد تنظيف المرفقات
        const deleteDraftQuery = `
            DELETE FROM "Transaction"
            WHERE transaction_id = $1 AND sender_user_id = $2 AND is_draft = true
            RETURNING transaction_id;
        `;
        const result = await client.query(deleteDraftQuery, [transId, userId]);

        await client.query('COMMIT'); // حفظ التغييرات
        
        // لو رجعنا صفوف يبقى الحذف تم بنجاح
        return result.rowCount > 0;

    } catch (error) {
        await client.query('ROLLBACK'); // تراجع لو حصل خطأ
        throw error;
    } finally {
        client.release(); // إغلاق الاتصال
    }
};