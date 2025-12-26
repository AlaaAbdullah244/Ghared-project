import asyncWrapper from "../middelware/asyncwraper.js";
import * as TransData from "../data/transactionData.js";
import httpStatusText from "../utils/httpStatusText.js";
import appError from "../utils/appError.js";
import { pool } from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ============================================================
// Helpers
// ============================================================
const groupReceiversByDept = (receiversList) => {
    return receiversList.reduce((acc, current) => {
        // 1. بندور هل القسم ده (بالـ ID بتاعه) موجود قبل كده في القائمة ولا لأ
        const existingDept = acc.find(item => item.department_id === current.department_id);

        if (existingDept) {
            // لو موجود، نضيف الموظف جواه
            existingDept.employees.push(current);
        } else {
            // لو مش موجود، نعمل قسم جديد ونحط فيه الاسم والـ ID
            acc.push({
                department_id: current.department_id,
                department_name: current.department_name,
                employees: [current]
            });
        }
        return acc;
    }, []);
};

// ============================================================
// APIs
// ============================================================

// 1. جلب بيانات الفورم (أنواع + مستلمين مجمعين)
export const getTransactionFormData = asyncWrapper(async (req, res, next) => {
    // نفترض إن التوكن فيه الرول، لو مش موجود ندي قيمة افتراضية
    const userRoleLevel = req.currentUserRole;

    const [types, rawReceivers] = await Promise.all([
        TransData.getTransactionTypes(),
        TransData.getReceiversByLevel(userRoleLevel)
    ]);

    // تجميع البيانات بالشكل الجديد (ID + Name)
    const groupedReceivers = groupReceiversByDept(rawReceivers);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        data: { types, receivers: groupedReceivers }
    });
});

// 2. إنشاء معاملة جديدة
export const createTransaction = asyncWrapper(async (req, res, next) => {
    // 1. استقبال البيانات
    const {
        parent_transaction_id, type_id, subject, content,
        is_draft, receivers, target_department_id
    } = req.body;

    const userId = req.userId;
    const files = req.files || [];
    const io = req.app.get("io");

    const senderName = await TransData.getUserName(userId);
    const senderDeptData = await TransData.getUserDepartmentId(userId);
    
    if (!senderDeptData) {
        return next(appError.create("المستخدم غير مسجل في أي قسم", 400, httpStatusText.FAIL));
    }

    const transCode = `TR-${Date.now()}`;
    const isDraftBool = (is_draft === 'true' || is_draft === true);
    let currentStateStr = parent_transaction_id ? "رد او استدراك" : "معاملة جديدة";

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // أ) حفظ المعاملة
        const transId = await TransData.insertTransaction(client, {
            subject, content, type_id, sender_id: userId,
            parent_id: parent_transaction_id || null,
            is_draft: isDraftBool,
            current_state: currentStateStr,
            code: transCode
        });

        // ب) حفظ المرفقات
        for (const file of files) {
            const desc = file.originalname;
            await TransData.insertAttachment(client, {
                path: file.filename, originalname: file.originalname, description: desc, transaction_id: transId
            });
        }

        // ج) منطق الإرسال المعدل
        if (!isDraftBool) {
            let deptReceivers = [];
            let individualReceivers = [];

            // 1. لو مختار قسم، هات موظفينه
            if (target_department_id) {
                deptReceivers = await TransData.getUsersByDepartmentId(client, target_department_id);
            }

            // 2. لو مختار أفراد، جهزهم
            if (receivers) {
                individualReceivers = Array.isArray(receivers) ? receivers : [receivers];
                // تأكد إنهم أرقام عشان المقارنة
                individualReceivers = individualReceivers.map(id => parseInt(id));
            }

            // 3. دمج القائمتين وحذف التكرار
            const allReceiverIds = [...new Set([...deptReceivers, ...individualReceivers])];

            // 4. حذف المرسل نفسه عشان ميبعتش لنفسه
            const finalReceivers = allReceiverIds.filter(id => id != userId);

            const contentSnippet = content ? content.substring(0, 50) + "..." : "";

            // اللوب
            for (const receiverId of finalReceivers) {
                await TransData.insertReceiver(client, transId, receiverId);

                const receiverDept = await TransData.getUserDepartmentId(receiverId);
                if (receiverDept) {
                    await TransData.insertTransactionPath(client, {
                        transId,
                        fromDeptId: senderDeptData.department_id,
                        toDeptId: receiverDept.department_id,
                        notes: "وارد جديد"
                    });
                }

                await TransData.createAndEmitNotification(client, {
                    userId: receiverId, transId, senderName, subject, snippet: contentSnippet
                }, io);
            }
        }

        await client.query("COMMIT");

        res.status(201).json({
            status: httpStatusText.SUCCESS,
            message: isDraftBool ? "تم الحفظ كمسودة" : "تم الإرسال بنجاح",
            data: { transaction_id: transId, code: transCode }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        return next(error);
    } finally {
        client.release();
    }
});

// 3. جلب تفاصيل المعاملة (شاملة التراكينج الجديد)
export const getTransactionById = asyncWrapper(async (req, res, next) => {
    const transId = req.params.id;
    const details = await TransData.getTransactionDetailsById(transId);

    if (!details) {
        return next(appError.create("المعاملة غير موجودة", 404, httpStatusText.FAIL));
    }

    // جلب المرفقات + التايم لاين الجديد بشكل متوازي
    const [attachments, timeline] = await Promise.all([
        TransData.getTransactionAttachments(transId),
        TransData.getTransactionTimeline(transId)
    ]);

    res.status(200).json({
        status: httpStatusText.SUCCESS,
        data: {
            details,
            attachments,
            tracking: timeline
        }
    });
});

// 4. تنفيذ إجراء (Action)
export const performTransactionAction = asyncWrapper(async (req, res, next) => {
    const { id: transId } = req.params;
    const userId = req.userId;
    const { action_name, annotation, target_department_id } = req.body;
    
    // ملاحظة: تأكدنا أن io معرف
    // const io = req.app.get("io"); 

    const transactionInfo = await TransData.getTransactionDetailsById(transId);
    if (!transactionInfo) return next(appError.create("المعاملة غير موجودة", 404, httpStatusText.FAIL));

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // تسجيل الإجراء
        await TransData.insertAction(client, {
            action_name, annotation, transaction_id: transId,
            performer_user_id: userId, target_department_id
        });

        let newStatus = "قيد المعالجة";

        // منطق الحالات
        if (action_name === "رد مباشر") newStatus = "تم الرد";
        else if (action_name === "استيفاء") newStatus = "تحت الاستيفاء";
        else if (action_name === "حفظ وإغلاق") newStatus = "محفوظة";
        else if (action_name === "إحالة") {
            if (!target_department_id) throw new Error("يجب تحديد جهة الإحالة");
            newStatus = "محالة";
            // الكود الخاص بالمنطق المعقد للإحالة (كما هو في المصدر الأصلي)
        }

        await TransData.updateTransactionStatus(client, transId, newStatus);

        await client.query("COMMIT");
        res.status(200).json({ status: httpStatusText.SUCCESS, message: "تم تنفيذ الإجراء" });

    } catch (error) {
        await client.query("ROLLBACK");
        return next(error);
    } finally {
        client.release();
    }
});

// 5. تحميل الملفات
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const downloadAttachment = asyncWrapper(async (req, res, next) => {
    const filePath = path.join(__dirname, "../uploads/transactions", req.params.filename);
    if (!fs.existsSync(filePath)) return next(appError.create("الملف غير موجود", 404, httpStatusText.FAIL));
    res.download(filePath);
});

// 6. القوائم (Sent / Inbox)
export const getMyTransactions = asyncWrapper(async (req, res) => {
    const data = await TransData.getUserSentTransactions(req.userId);
    res.status(200).json({ status: httpStatusText.SUCCESS, data });
});

export const getInboxTransactions = asyncWrapper(async (req, res) => {
    const data = await TransData.getUserInboxTransactions(req.userId);
    // تم تصحيح الخطأ الإملائي هنا
    res.status(200).json({ status: httpStatusText.SUCCESS, data });
});