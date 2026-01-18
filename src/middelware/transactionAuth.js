import { pool } from "../config/db.js";
import appError from "../utils/appError.js";
import httpStatusText from "../utils/httpStatusText.js";
import asyncWrapper from "./asyncwraper.js";

export const checkTransactionReceiver = asyncWrapper(async (req, res, next) => {
    const { id } = req.params; // Transaction ID from URL
    const userId = req.userId; // User ID from Token

    const query = `
        SELECT 1 
        FROM "Transaction_Receiver" 
        WHERE transaction_id = $1 AND receiver_user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rowCount === 0) {
        return next(appError.create("غير مصرح لك باتخاذ إجراء على هذه المعاملة لأنك لست من المستلمين", 403, httpStatusText.FAIL));
    }

    next();
});