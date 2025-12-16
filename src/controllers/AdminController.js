import asyncWrapper from "../middelware/asyncwraper.js";
import * as Admin from "../data/AdminData.js";
import httpStatusText from "../utils/httpStatusText.js";
import appError from "../utils/appError.js";
import { generateJWT } from "../utils/genrateToken.js";
import bcrypt, { hash } from "bcryptjs"; 
import { validationResult } from "express-validator";



export const AdminLogin = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  // 1️⃣ التحقق من المدخلات
  if (!email || !password) {
    const error = appError.create(
      "يجب إدخال البريد الإلكتروني وكلمة المرور",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  // 2️⃣ جلب المستخدم
  const findAdmin = await Admin.getAdmin(email);

  // التحقق من وجود المستخدم
  if (!findAdmin || findAdmin.length === 0) {
    const error = appError.create("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401, httpStatusText.FAIL);
    return next(error);
  }

  const admin = findAdmin[0];

//   // 3️⃣ مقارنة كلمة المرور
  const matchedPassword = await bcrypt.compare(password, admin.password_hash);
  const password_hash = await bcrypt.hash(password, 10);

  console.log(matchedPassword , password ,admin.password_hash ,password_hash)

  if (!matchedPassword) {
    const error = appError.create("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401, httpStatusText.FAIL);
    return next(error);
  }


  // الكود الخاص بك


  // 4️⃣ التحقق من الصلاحية (Role Level Check)
  // ✅ التصحيح: التحقق من أن القيمة لا تساوي 0 (كرقم)
  if (admin.roleLevel != 0) {
    const error = appError.create("ليس لديك صلاحية الدخول كمسؤول", 403, httpStatusText.FAIL); // 403 Forbidden أنسب للصلاحيات
    return next(error);
  }

  // 5️⃣ توليد التوكن
  const token = await generateJWT({ 
      email: admin.email, 
      id: admin.id || admin.user_id, 
      role: admin.roleLevel, 
      roleName: admin.roleName 
  });

  // 6️⃣ الرد النهائي
  return res.json({
    status: httpStatusText.SUCCESS,
    data: {
      token
      // أعد هذه السطور إذا كنت تحتاج البيانات في الواجهة الأمامية
      // profilePicture: admin.profilePicture, 
      // fullName: admin.fullName 
    }
  });
});




export const AddAdmin = asyncWrapper(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join("، ");
    const error = appError.create(errorMessages, 400, httpStatusText.FAIL);
    return next(error);
  }

  // ✅ 2. استقبال البيانات بـ camelCase
  const { 
    fullName,      
    email, 
    password, 
    mobileNumber,  
    landline, 
    faxNumber,     
    // profilePicture 
  } = req.body;

  if (!req.userId) {
    const error = appError.create("غير مصرح لك بإتمام هذه العملية", 401, httpStatusText.FAIL);
    return next(error);
  }

  // const existingUser = await User.getUser(email);
  // if (existingUser && existingUser.length > 0) {
  //   const error = appError.create("هذا البريد الإلكتروني مسجل بالفعل", 409, httpStatusText.FAIL);
  //   return next(error);
  // }

  const password_hash = await bcrypt.hash(password, 10);

  // ✅ 3. استدعاء الدالة بالترتيب الصحيح
  const newAdmin = await Admin.AddAdminData(
    fullName,      
    email,         
    password_hash, 
    mobileNumber,  
    landline,      
    faxNumber,     
    null           
  );

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    message: "تم إضافة المسؤول وتعيين الصلاحيات بنجاح",
    data: { admin: newAdmin }
  });
});


export const getAllUsers = asyncWrapper(async (req, res, next) => {
  // 1️⃣ استدعاء الداتا من الموديل
  const users = await Admin.getAllSystemUsers();

  // 2️⃣ إرسال الرد
  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    results: users.length, // عدد المستخدمين الراجعين
    data: { 
      users // المصفوفة اللي فيها كل البيانات بما فيها user_id
    }
  });
});



// ... الاستيرادات

export const getUserById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params; // بناخد الـ ID من الرابط /users/:id

  const user = await Admin.getSystemUserById(id);

  // لو ملقيناش يوزر بالرقم ده
  if (!user) {
    const error = appError.create("المستخدم غير موجود", 404, httpStatusText.FAIL);
    return next(error);
  }

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { user }
  });
});



export const deleteUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // استدعاء دالة المسح
  const deletedUser = await Admin.deleteSystemUser(id);

  // لو ملقيناهوش
  if (!deletedUser) {
    return next(appError.create("المستخدم غير موجود", 404, httpStatusText.FAIL));
  }

  // تمام اتمسح
  res.status(200).json({ 
    status: httpStatusText.SUCCESS, 
    message: "تم حذف المستخدم وكل صلاحياته بنجاح" 
  });
});




export const updateUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  
  // 1️⃣ استقبلنا البيانات المسموح بتعديلها فقط
  // حتى لو الفرونت بعت password هنا، إحنا مش بناخده
  const { fullName, email, mobileNumber, roleId, departmentId } = req.body;

  // 2️⃣ نبعت للداتابيز (من غير باسورد)
  const updatedUser = await Admin.updateSystemUser(
    id, 
    fullName, 
    email, 
    mobileNumber, 
    roleId,
    departmentId
  );

  if (!updatedUser) {
    return next(appError.create("المستخدم غير موجود", 404, httpStatusText.FAIL));
  }

  res.status(200).json({ 
    status: httpStatusText.SUCCESS, 
    message: "تم تحديث بيانات المستخدم بنجاح",
    data: { user: updatedUser } 
  });
});


export const AddUser = asyncWrapper(async(req,res , next)=>
{

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join("، ");
    const error = appError.create(errorMessages, 400, httpStatusText.FAIL);
    return next(error);
  }

  // ✅ 2. استقبال البيانات بـ camelCase
  const { 
    email, 
    password, 
    roleId,
    departmentId
 
    // profilePicture 
  } = req.body;

  if (!req.userId) {
    const error = appError.create("غير مصرح لك بإتمام هذه العملية", 401, httpStatusText.FAIL);
    return next(error);
  }

  // const existingUser = await User.getUser(email);
  // if (existingUser && existingUser.length > 0) {
  //   const error = appError.create("هذا البريد الإلكتروني مسجل بالفعل", 409, httpStatusText.FAIL);
  //   return next(error);
  // }

  const password_hash = await bcrypt.hash(password, 10);

  // ✅ 3. استدعاء الدالة بالترتيب الصحيح
  const newAdmin = await Admin.AddUserData(
       
    email,   
    password_hash, 
    roleId,
    departmentId
      
       
  );

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    message: "تم إضافة المسؤول وتعيين الصلاحيات بنجاح",
    data: { admin: newAdmin }
  });

});

export const getAllData = asyncWrapper(async(req, res, next) => {

  // 1. إضافة await
  // الداتابيز بتأخذ وقت، فلازم ننتظر النتيجة وإلا data هتكون عبارة عن (Promise) فاضي
  const data = await Admin.getAllData();

  // 2. تعديل status و message
  // 200 مناسبة للـ GET (جلب البيانات)، و 201 للـ CREATE (إضافة بيانات)
  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    // رسالة منطقية للعملية
    message: "تم جلب جميع البيانات بنجاح", 
    data: data
  });

});


// adminController.js


export const AddRole = asyncWrapper(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join("، ");
    const error = appError.create(errorMessages, 400, httpStatusText.FAIL);
    return next(error);
  }
  // شيلنا الـ if خلاص لأن الفاليديشن قام بالواجب
  const { userId, roleId, departmentId } = req.body;

  // نتأكد بس إن الـ req.userId (الأدمن) موجود
  if (!req.userId) {
     const error = appError.create("غير مصرح لك بإتمام هذه العملية", 401, httpStatusText.FAIL);
     return next(error);
  }

  const newAdmin = await Admin.addUserRoleData(
    userId,
    roleId,
    departmentId
  );

  if (!newAdmin) {
    const error = appError.create("هذا الدور غير متاح لهذا القسم", 404, httpStatusText.FAIL);
    return next(error);
  }

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    message: "تم إضافة الصلاحية بنجاح",
    data: { admin: newAdmin }
  });
});
