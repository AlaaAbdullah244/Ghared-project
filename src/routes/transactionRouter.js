import express from "express";
import * as transController from "../controllers/transactionController.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { verifyToken } from "../middelware/verifyToken.js";
import { validateTransaction } from "../middelware/transactionValidation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// إعداد Multer
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/transactions"));
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const filename = `trans-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: diskStorage });

// الروابط
router.get("/form-data", verifyToken, transController.getTransactionFormData);
// بدلاً من searchTransaction
router.get("/my-history", verifyToken, transController.getMyTransactions);
// البريد الوارد (معاملات لم يتم الرد عليها من هذا المستخدم)
router.get("/inbox", verifyToken, transController.getInboxTransactions);

router.post(
  "/create",
  verifyToken, // 1. تحقق من التوكن
  upload.array("attachments"), // 2. رفع الملفات وتجهيز الـ Body
  validateTransaction, // 3. التحقق من صحة البيانات (لازم بعد الرفع)
  transController.createTransaction // 4. التنفيذ
);

// لاحظي وجود verifyToken لحماية الملفات
router.get("/file/:filename", verifyToken, transController.downloadAttachment);

router.get("/details/:id", verifyToken, transController.getTransactionById);

// تنفيذ إجراء على معاملة (رد مباشر، استيفاء، إحالة، ...)
router.post(
  "/:id/actions",
  verifyToken,
  transController.performTransactionAction
);

export default router;
