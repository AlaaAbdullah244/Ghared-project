// OutgoingTransactionsController.js      
// هذا الملف يحتوي على دوال التحكم لمعاملات الصادر 

import { pool } from "../config/db.js";
import appError from "../utils/appError.js"; 

// ====================================================
// الدوال الخاصة بـ "الصادر" (Outbox) والمعاملات العامة
// ====================================================

// ----------------------------------------------------
// 1. دالة جلب جميع المعاملات الصادرة للمستخدم (Outbox)
// ----------------------------------------------------
// @desc جلب جميع المعاملات التي أرسلها المستخدم المحدد
// @route GET /api/transactions/outbox/:user_id
// @access Private
export const getUserOutboxTransactions = async (req, res, next) => {
    const user_id = req.userId;
    try {
        const query = `
            SELECT *
            FROM public."Transaction"
            WHERE sender_user_id = $1
            ORDER BY date DESC;
        `;
        const result = await pool.query(query, [user_id]);
        res.status(200).json({
            message: "تم جلب المعاملات الصادرة بنجاح",
            transactions: result.rows,
        });
    } catch (error) {
        console.error("خطأ في جلب المعاملات الصادرة:", error);
        return next(appError.create("فشل في جلب المعاملات الصادرة", 500, "error"));
    }
};

// ----------------------------------------------------
// 2. دالة جلب معاملة مفردة بالتفصيل
// ----------------------------------------------------
// @desc جلب تفاصيل معاملة واحدة 
// @route GET /api/transactions/:id
// @access Private
export const getTransactionById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT T.*, TT.type_name, U.username AS sender_name
            FROM public."Transaction" T
            JOIN public."Transaction_Type" TT ON T.type_id = TT.type_id
            JOIN public."User" U ON T.sender_user_id = U.user_id
            WHERE T.transaction_id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return next(appError.create("لم يتم العثور على المعاملة", 404, "fail"));
        }

        res.status(200).json({
            message: "تم جلب تفاصيل المعاملة بنجاح",
            transaction: result.rows[0],
        });
    } catch (error) {
        console.error("خطأ في جلب المعاملة المفردة:", error);
        return next(appError.create("فشل في جلب تفاصيل المعاملة", 500, "error"));
    }
};

// ----------------------------------------------------
// 3. دالة تعديل معاملة
// ----------------------------------------------------
// @desc تعديل معاملة موجودة
// @route PUT /api/transactions/:id
// @access Private
export const updateTransaction = async (req, res, next) => {
    const { id } = req.params;
    const { content, type_id, subject, code } = req.body;
    const userId = req.userId; // 👈 لازم نجيب الآيدي بتاع اليوزر
    
    try {
        const updateQuery = `
            UPDATE public."Transaction" 
            SET content = $1, type_id = $2, subject = $3, code = $4, last_updated_at = NOW()
            WHERE transaction_id = $5 AND sender_user_id = $6
            RETURNING *;
        `;

        const result = await pool.query(updateQuery, [content, type_id, subject, code, id, userId]);

        if (result.rowCount === 0) {
            return next(appError.create("لم يتم العثور على المعاملة أو ليس لديك صلاحية لتعديلها.", 404, "fail"));
        }

        res.status(200).json({
            message: "تم تحديث المعاملة بنجاح. جاهزة لإعادة الإرسال.",
            transaction: result.rows[0],
        });
    } catch (error) {
        console.error("خطأ في تحديث المعاملة:", error);
        return next(appError.create("فشل في تحديث المعاملة", 500, "error"));
    }
};

// ----------------------------------------------------
// 4. دالة حذف معاملة
// ----------------------------------------------------
// @desc حذف معاملة محددة
// @route DELETE /api/transactions/:id
// @access Private
export const deleteTransaction = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.userId; // 👈 لازم نجيب الآيدي بتاع اليوزر
    try {
        const deleteQuery = `
            DELETE FROM public."Transaction"
            WHERE transaction_id = $1 AND sender_user_id = $2
            RETURNING *;
        `;
        const result = await pool.query(deleteQuery, [id, userId]);

        if (result.rowCount === 0) {
            return next(appError.create("لم يتم العثور على المعاملة أو ليس لديك صلاحية لحذفها.", 404, "fail"));
        }

        res.status(200).json({
            message: "تم حذف المعاملة بنجاح",
            deletedTransaction: result.rows[0],
        });
    } catch (error) {
        console.error("خطأ في حذف المعاملة:", error);
        return next(appError.create("فشل في حذف المعاملة", 500, "error"));
    }
};
