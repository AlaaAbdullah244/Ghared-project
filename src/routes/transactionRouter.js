import express from "express";
import * as transController from "../controllers/transactionController.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { verifyToken } from "../middelware/verifyToken.js";
import { validateTransaction } from "../middelware/transactionValidation.js";
import { checkTransactionReceiver } from "../middelware/transactionAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// إعداد التخزين للملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads/transactions")),
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `trans-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`);
    }
});
const upload = multer({ storage });

// الروابط (Routes)
router.use(verifyToken); // تطبيق التحقق على كل الروابط التالية

router.get("/form-data", transController.getTransactionFormData); // ✅ إرجاع الأقسام مجمعة
router.get("/my-history", transController.getMyTransactions);
router.get("/inbox", transController.getInboxTransactions);
router.get("/details/:id", transController.getTransactionById); // ✅ فيه التراكينج الجديد
router.get("/file/:filename", transController.downloadAttachment);

router.post("/create", 
    upload.array("attachments"), 
    validateTransaction, 
    transController.createTransaction
);

// ✅ تم إضافة Middleware التحقق من المستلم هنا
router.post("/:id/actions", checkTransactionReceiver, transController.performTransactionAction);

export default router;