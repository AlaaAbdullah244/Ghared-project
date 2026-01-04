import asyncWrapper from "../middelware/asyncwraper.js";
import * as TransData from "../data/transactionData.js";
import * as UserData from "../data/userData.js";
import sendEmail from "../utils/sendEmail.js";
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
    const existingDept = acc.find(
      (item) => item.department_id === current.department_id
    );

    if (existingDept) {
      // لو موجود، نضيف الموظف جواه
      existingDept.employees.push(current);
    } else {
      // لو مش موجود، نعمل قسم جديد ونحط فيه الاسم والـ ID
      acc.push({
        department_id: current.department_id, // 👈 ضفنا الـ ID هنا
        department_name: current.department_name, // الاسم
        employees: [current], // قائمة الموظفين
      });
    }
    return acc;
  }, []);
};

const sendTransactionEmail = async (userId, subject, message) => {
  try {
    const user = await UserData.getUserById(userId);
    if (user && user.length > 0) {
      await sendEmail({
        email: user[0].email,
        subject: subject,
        message: message,
      });
    }
  } catch (error) {
    console.error(`Failed to send email to user ${userId}:`, error);
  }
};

// ============================================================
// APIs
// ============================================================

// 1. جلب بيانات الفورم (أنواع + مستلمين مجمعين)
export const getTransactionFormData = asyncWrapper(async (req, res, next) => {
  // نفترض إن التوكن فيه الرول، لو مش موجود ندي قيمة افتراضية
  const userRoleLevel = req.currentUserRole;
  const userId = req.userId;

  const [types, rawReceivers] = await Promise.all([
    TransData.getTransactionTypes(),
    TransData.getReceiversByLevel(userRoleLevel),
  ]);

  // ✅ استبعاد المستخدم الحالي من قائمة المستلمين قبل التجميع
  const filteredReceivers = rawReceivers.filter((r) => r.user_id != userId);

  // تجميع البيانات بالشكل الجديد (ID + Name)
  const groupedReceivers = groupReceiversByDept(filteredReceivers);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { types, receivers: groupedReceivers },
  });
});

// 2. إنشاء معاملة جديدة
export const createTransaction = asyncWrapper(async (req, res, next) => {
  // 1. استقبال البيانات (لاحظي ضفنا target_department_id)
  const {
    parent_transaction_id,
    type_id,
    subject,
    content,
    is_draft,
    receivers,
    target_department_id,
  } = req.body;

  const userId = req.userId;
  const files = req.files || [];
  const io = req.app.get("io");

  // ... (نفس كود التحقق من المرسل والقسم بتاعه زي ما هو) ...
  const senderName = await TransData.getUserName(userId);
  const senderDeptData = await TransData.getUserDepartmentId(userId);
  if (!senderDeptData) {
    return next(
      appError.create("المستخدم غير مسجل في أي قسم", 400, httpStatusText.FAIL)
    );
  }

  const transCode = `TR-${Date.now()}`;
  const isDraftBool = is_draft === "true" || is_draft === true;
  let currentStateStr = parent_transaction_id
    ? "رد او استدراك"
    : "معاملة جديدة";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // أ) حفظ المعاملة (زي ما هي)
    const transId = await TransData.insertTransaction(client, {
      subject,
      content,
      type_id,
      sender_id: userId,
      parent_id: parent_transaction_id || null,
      is_draft: isDraftBool,
      current_state: currentStateStr,
      code: transCode,
    });

    // ب) حفظ المرفقات (زي ما هي)
    if (files) {
      for (const file of files) {
        const desc = file.originalname;
        await TransData.insertAttachment(client, {
          path: file.filename,
          originalname: file.originalname,
          description: desc,
          transaction_id: transId,
        });
      }
    }

    // ============================================================
    // ج) منطق الإرسال المعدل (هنا التغيير) 🔥
    // ============================================================
    if (!isDraftBool) {
      let finalReceivers = [];

      // الحالة 1: لو مختار "تحديد الكل" في قسم معين
      if (target_department_id) {
        // هنجيب كل الموظفين في القسم ده من الداتابيز
        // (تأكدي إن الدالة دي موجودة في transactionData.js زي ما كتبناها قبل كدة)
        finalReceivers = await TransData.getUsersByDepartmentId(
          client,
          target_department_id
        );
      }
      // الحالة 2: لو مختار أشخاص محددين
      else if (receivers) {
        finalReceivers = Array.isArray(receivers) ? receivers : [receivers];
      }

      // ✅ استبعاد المرسل نفسه من قائمة المستلمين (سواء تم اختيار القسم أو أشخاص محددين)
      finalReceivers = finalReceivers.filter((id) => id != userId);

      // لو مفيش حد نبعتله (خطأ محتمل)
      if (finalReceivers.length === 0) {
        // ممكن نرمي إيرور أو نكمل عادي حسب البيزنس، هنا هنكمل بس مش هنبعت لحد
      }

      const contentSnippet = content ? content.substring(0, 50) + "..." : "";

      // اللوب دلوقتي بيمشي على القائمة النهائية اللي حسبناها فوق
      for (const receiverId of finalReceivers) {
        // 1. إدخال في جدول المستلمين
        await TransData.insertReceiver(client, transId, receiverId);

        // 2. تسجيل المسار
        const receiverDept = await TransData.getUserDepartmentId(receiverId);
        // نتأكد إن القسم موجود قبل ما نسجل المسار
        if (receiverDept) {
          await TransData.insertTransactionPath(client, {
            transId,
            fromDeptId: senderDeptData.department_id,
            toDeptId: receiverDept.department_id,
            notes: "وارد جديد",
          });
        }

        // 3. الإشعار
        await TransData.createAndEmitNotification(
          client,
          {
            userId: receiverId,
            transId,
            senderName,
            subject,
            snippet: contentSnippet,
          },
          io
        );

        // 4. إرسال إيميل
        sendTransactionEmail(
          receiverId,
          `وارد جديد: ${subject}`,
          `مرحباً،\n\nلديك معاملة جديدة بعنوان: "${subject}"\nالمرسل: ${senderName}\n\nيرجى الدخول للنظام للاطلاع عليها.`
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: httpStatusText.SUCCESS,
      message: isDraftBool ? "تم الحفظ كمسودة" : "تم الإرسال بنجاح",
      data: { transaction_id: transId, code: transCode },
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
    return next(
      appError.create("المعاملة غير موجودة", 404, httpStatusText.FAIL)
    );
  }

  // 🔥 جلب المرفقات + التايم لاين الجديد (Tracking) بشكل متوازي
  const [attachments, timeline] = await Promise.all([
    TransData.getTransactionAttachments(transId),
    TransData.getTransactionTimeline(transId),
  ]);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      details,
      attachments,
      tracking: timeline, // يحتوي على (القسم، المستلم، الأكشن، التاريخ)
    },
  });
});

// 4. تنفيذ إجراء (Action) - معدل بالكامل
export const performTransactionAction = asyncWrapper(async (req, res, next) => {
  const { id: transId } = req.params;
  const userId = req.userId;
  const { action_name, annotation, target_department_id } = req.body;
  const io = req.app.get("io");

  const transactionInfo = await TransData.getTransactionDetailsById(transId);
  if (!transactionInfo)
    return next(
      appError.create("المعاملة غير موجودة", 404, httpStatusText.FAIL)
    );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // تعديل: جلب ID نوع الإجراء
    const action_type_id = await TransData.getActionTypeIdByName(action_name);

    let newStatus = "قيد المعالجة";

    if (action_name === "إحالة") {
      if (!target_department_id) {
        throw new Error("يجب تحديد جهة الإحالة");
      }
      newStatus = "محالة";

      // 1. تسجيل إجراء الإحالة على المعاملة الأصلية
      await TransData.insertAction(client, {
        action_type_id, // استخدام الـ ID
        annotation,
        transaction_id: transId,
        performer_user_id: userId,
        target_department_id,
      });

      // 2. منطق الإحالة: إنشاء معاملة جديدة وإرسالها
      const senderName = await TransData.getUserName(userId);
      const senderDeptData = await TransData.getUserDepartmentId(userId);
      if (!senderDeptData) throw new Error("المستخدم غير مسجل في أي قسم");

      // تحسين: منطق دمج المحتوى
      let referralContent = transactionInfo.content
        ? `محتوى المعاملة الأصلية:\n${transactionInfo.content}`
        : "";
      if (annotation) {
        referralContent += `\n\n---\nملاحظة الإحالة:\n${annotation}`;
      }
      if (!referralContent) {
        referralContent = "تمت الإحالة بدون محتوى إضافي.";
      }

      const referralTransCode = `TR-${Date.now()}-REF`;
      const referralTransId = await TransData.insertTransaction(client, {
        subject: `إحالة: ${transactionInfo.subject}`,
        content: referralContent, // استخدام المحتوى المدمج
        type_id: transactionInfo.type_id || 1,
        sender_id: userId,
        parent_id: transId,
        is_draft: false,
        current_state: "وارد جديد",
        code: referralTransCode,
      });

      // 3. نسخ المرفقات
      await TransData.copyAttachments(client, transId, referralTransId);

      // 4. إرسال للمستلمين الجدد
      let targetReceivers = await TransData.getUsersByDepartmentId(
        client,
        target_department_id
      );

      // ✅ استبعاد القائم بالإحالة من قائمة المستلمين
      targetReceivers = targetReceivers.filter((id) => id != userId);

      const contentSnippet = referralContent.substring(0, 50) + "...";

      for (const receiverId of targetReceivers) {
        await TransData.insertReceiver(client, referralTransId, receiverId);

        const receiverDept = await TransData.getUserDepartmentId(receiverId);
        if (receiverDept) {
          await TransData.insertTransactionPath(client, {
            transId: referralTransId,
            fromDeptId: senderDeptData.department_id,
            toDeptId: receiverDept.department_id,
            notes: "إحالة معاملة",
          });
        }

        await TransData.createAndEmitNotification(
          client,
          {
            userId: receiverId,
            transId: referralTransId,
            senderName,
            subject: `إحالة: ${transactionInfo.subject}`,
            snippet: contentSnippet,
          },
          io
        );

        // 5. إرسال إيميل للمستلم الجديد
        sendTransactionEmail(
          receiverId,
          `إحالة جديدة: ${transactionInfo.subject}`,
          `مرحباً،\n\nتمت إحالة معاملة إليك بعنوان: "${transactionInfo.subject}"\nمن: ${senderName}\n\nيرجى الدخول للنظام للاطلاع عليها.`
        );
      }
    } else {
      // منطق الإجراءات الأخرى (رد، حفظ.. الخ)
      if (action_name === "رد مباشر") newStatus = "تم الرد";
      else if (action_name === "موافقة") {
        newStatus = "تمت الموافقة";

        // إرسال إشعار لصاحب المعاملة الأصلي
        const performerName = await TransData.getUserName(userId);
        await TransData.createAndEmitNotification(
          client,
          {
            userId: transactionInfo.sender_id, // 💌 إرسال لصاحب المعاملة
            transId,
            senderName: performerName, // اللي عمل الإجراء
            subject: `تمت الموافقة على: ${transactionInfo.subject}`,
            snippet: annotation || "تمت الموافقة على المعاملة.",
          },
          io
        );

        // إرسال إيميل لصاحب المعاملة
        sendTransactionEmail(
          transactionInfo.sender_id,
          `تمت الموافقة على: ${transactionInfo.subject}`,
          `مرحباً،\n\nتمت الموافقة على معاملتك "${transactionInfo.subject}" من قبل ${performerName}.`
        );
      } else if (action_name === "رفض") {
        newStatus = "تم الرفض";

        // إرسال إشعار لصاحب المعاملة الأصلي
        const performerName = await TransData.getUserName(userId);
        await TransData.createAndEmitNotification(
          client,
          {
            userId: transactionInfo.sender_id, // 💌 إرسال لصاحب المعاملة
            transId,
            senderName: performerName, // اللي عمل الإجراء
            subject: `تم رفض: ${transactionInfo.subject}`,
            snippet: annotation || "تم رفض المعاملة.",
          },
          io
        );

        // إرسال إيميل لصاحب المعاملة
        sendTransactionEmail(
          transactionInfo.sender_id,
          `تم رفض: ${transactionInfo.subject}`,
          `مرحباً،\n\nتم رفض معاملتك "${transactionInfo.subject}" من قبل ${performerName}.`
        );
      } else if (action_name === "حفظ وإغلاق") newStatus = "محفوظة";

      // تسجيل الإجراء
      await TransData.insertAction(client, {
        action_type_id, // استخدام الـ ID
        annotation,
        transaction_id: transId,
        performer_user_id: userId,
        target_department_id: target_department_id || null,
      });
    }

    // تحديث حالة المعاملة الأصلية
    await TransData.updateTransactionStatus(client, transId, newStatus);

    await client.query("COMMIT");
    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: "تم تنفيذ الإجراء بنجاح",
    });
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
  const filePath = path.join(
    __dirname,
    "../uploads/transactions",
    req.params.filename
  );
  if (!fs.existsSync(filePath))
    return next(appError.create("الملف غير موجود", 404, httpStatusText.FAIL));
  res.download(filePath);
});

// 6. القوائم (Sent / Inbox)
export const getMyTransactions = asyncWrapper(async (req, res) => {
  const data = await TransData.getUserSentTransactions(req.userId);
  res.status(200).json({ status: httpStatusText.SUCCESS, data });
});

export const getInboxTransactions = asyncWrapper(async (req, res) => {
  const data = await TransData.getUserInboxTransactions(req.userId);
  res.status(200).json({ status: httpStatusText.SUCCESS, data });
});
