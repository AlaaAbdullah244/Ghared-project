import asyncWrapper from "../middelware/asyncwraper.js";
import * as DraftData from "../data/draftData.js"; 
// سنحتاج هذه الدوال المساعدة لإتمام عملية الإرسال (بدلاً من إعادة كتابتها)
import * as TransData from "../data/transactionData.js"; 
import httpStatusText from "../utils/httpStatusText.js";
import appError from "../utils/appError.js";
import { pool } from "../config/db.js"; 

// 1. عرض صفحة المسودات
export const getMyDrafts = asyncWrapper(async (req, res, next) => {
    const userId = req.userId;
    const drafts = await DraftData.getDraftsByUserId(userId);
    
    res.status(200).json({ 
        status: httpStatusText.SUCCESS, 
        data: drafts 
    });
});

// 2. حذف مسودة
export const deleteDraft = asyncWrapper(async (req, res, next) => {
    const userId = req.userId;
    const { id } = req.params;

    const isDeleted = await DraftData.deleteDraftById(id, userId);

    if (!isDeleted) {
        return next(appError.create("المسودة غير موجودة أو تم حذفها مسبقاً", 404, httpStatusText.FAIL));
    }
    
    res.status(200).json({ 
        status: httpStatusText.SUCCESS, 
        message: "تم حذف المسودة بنجاح"
    });
});

// 3. تعديل مسودة (أو إرسالها نهائياً)
export const updateAndPublishDraft = asyncWrapper(async (req, res, next) => {
    const { id } = req.params; // Draft ID
    const userId = req.userId;
    const { 
        type_id, subject, content, is_draft, receivers, parent_transaction_id 
    } = req.body;
    
    const files = req.files;
    const io = req.app.get('io');

    // أ) التحقق من وجود المسودة وصلاحية المستخدم
    const existingDraft = await DraftData.getDraftByIdAndUser(id, userId);
    if (!existingDraft) {
        return next(appError.create("المسودة غير موجودة أو لا تملك صلاحية تعديلها", 404, httpStatusText.FAIL));
    }

    // ب) تجهيز المتغيرات
    const isDraftBool = (is_draft === true || is_draft === 'true');
    // تحديد الحالة: هل ستبقى مسودة أم ستصبح معاملة جديدة/رد
    let currentStateStr = 'مسودة';
    if (!isDraftBool) {
        // إذا قرر المستخدم الإرسال، نحدد الحالة بناءً على وجود معاملة أصلية
        currentStateStr = (parent_transaction_id) ? 'رد او استدراك' : 'معاملة جديدة';
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await UserData.getUserProfileData(userId);
        const signature_path = isDraftBool ? null : user?.signature_path;

        // 1. تحديث بيانات المعاملة في الجدول
        await DraftData.updateDraftDetails(client, id, {
            subject,
            content,
            type_id,
            is_draft: isDraftBool,
            current_status: currentStateStr,
            parent_id: parent_transaction_id || null,
            signature: signature_path
        });

        // 2. إضافة مرفقات جديدة (إن وجدت)
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const desc = req.body.descriptions ? req.body.descriptions[i] : files[i].originalname;
                await TransData.insertAttachment(client, {
                    path: files[i].filename,
                    originalname: files[i].originalname,
                    description: desc,
                    transaction_id: id
                });
            }
        }

        // =========================================================
        // 3. منطق الإرسال (فقط لو is_draft = false)
        // نفس المنطق الموجود في createTransaction بالضبط
        // =========================================================
        if (!isDraftBool) {
            // جلب قسم المرسل لعمل المسار
            const SenderUserDepData = await TransData.getUserDepartmentId(userId);
            if (!SenderUserDepData) throw new Error("المستخدم غير مسجل في قسم");
            
            const SenderUserDepId = SenderUserDepData.department_id;
            const receiversArray = receivers ? [].concat(receivers) : [];
            const notificationMsg = `لديك معاملة جديدة بعنوان: ${subject}`;

            for (const receiverId of receiversArray) {
                // إضافة المستلم
                await TransData.insertReceiver(client, id, receiverId);

                // إضافة المسار
                const ReceiverUserDepData = await TransData.getUserDepartmentId(receiverId);
                if (ReceiverUserDepData) {
                    await TransData.insertTransactionPath(client, {
                        transId: id,
                        fromDeptId: SenderUserDepId,
                        toDeptId: ReceiverUserDepData.department_id,
                        notes: 'وارد جديد (من مسودة)'
                    });
                }

                // إشعار وسوكيت
                await TransData.createAndEmitNotification(client, {
                    userId: receiverId,
                    transId: id,
                    content: notificationMsg,
                    senderId: userId
                }, io);
            }
        }

        await client.query('COMMIT');

        res.status(200).json({
            status: httpStatusText.SUCCESS,
            message: isDraftBool ? "تم حفظ التعديلات في المسودة" : "تم إرسال المعاملة بنجاح",
            data: { transaction_id: id }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        return next(error);
    } finally {
        client.release();
    }
});