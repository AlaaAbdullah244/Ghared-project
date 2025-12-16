import express from "express";
import {
  AdminLogin,
  AddAdmin,
  getUserById,
  getAllUsers,
  deleteUser,
  AddUser,
  updateUser,
  getAllData,
  AddRole,
} from "../controllers/AdminController.js";
import { allowedTo } from "../middelware/AllowedTo.js"; // ✅ تأكدي ان اسم الفولدر middelware ولا middleware
import UserRoles from "../utils/UserRoles.js"; // ✅ استيراد Default
import { verifyToken } from "../middelware/verifyToken.js";
import { userValidation } from "../middelware/userValidation.js";
import { userAddValidation } from "../middelware/userAddValidation.js";
import { userAddRoleValidation } from "../middelware/userAddRoleValidation.js";

const router = express.Router();

router.post("/AdminLogin", AdminLogin);

router.post(
  "/AddAdmin",
  verifyToken,
  allowedTo(UserRoles.ADMIN),
  userValidation,
  AddAdmin
);

router.get(
  "/getAllUsers",
  verifyToken, // 1. لازم يكون مسجل دخول
  allowedTo(UserRoles.ADMIN), // 2. لازم يكون أدمن
  getAllUsers // 3. هات البيانات
);

router.get(
  "/users/:id",
  verifyToken,
  allowedTo(UserRoles.ADMIN), // الأدمن بس اللي يقدر يكشف تفاصيل أي حد
  getUserById
);

router.delete(
  "/users/:id", // بناخد الـ id من الرابط
  verifyToken, // لازم يكون مسجل دخول
  allowedTo(UserRoles.ADMIN), // لازم يكون أدمن
  deleteUser // نفذ الحذف
);

router.put(
  "/users/:id", // 1. بناخد الـ ID من الرابط
  verifyToken, // 2. لازم يكون مسجل دخول
  allowedTo(UserRoles.ADMIN), // 3. لازم يكون أدمن عشان يقدر يعدل بيانات غيره
  userValidation, // 4. نتأكد إن البيانات (إيميل، موبايل..) مكتوبة صح
  updateUser // 5. ننفذ الكنترولر
);

router.post(
  "/AddUser",
  verifyToken,
  allowedTo(UserRoles.ADMIN),
  userAddValidation,
  AddUser
);

router.post(
  "/AddRole",
  verifyToken,
  allowedTo(UserRoles.ADMIN),
  userAddRoleValidation,
  AddRole
);
router.get("/getAllData", getAllData);

export default router;
