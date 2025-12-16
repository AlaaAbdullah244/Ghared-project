import asyncWrapper from "../middelware/asyncwraper.js";
import * as User from "../data/userData.js";
import httpStatusText from "../utils/httpStatusText.js";
import appError from "../utils/appError.js";
import { generateJWT } from "../utils/genrateToken.js";
import bcrypt from "bcryptjs";  
import { validationResult } from "express-validator";





export const updateUser = asyncWrapper(async (req, res, next) => {
  // ✅ التحقق من وجود أخطاء في الإدخال
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    const error = appError.create(
      errorMessages.join("، "),
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  // ✅ استخراج البيانات من الطلب
  const { fullName, email, password, mobileNumber, landLine, faxNumber } =req.body;
  const userId = req.userId;

  // ✅ التأكد من وجود userId
  if (!userId) {
    const error = appError.create(
      "معرّف المستخدم مطلوب",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  const findUser = await User.getUser(email);

  if (!findUser ||! findUser.length === 0) {
    const error = appError.create("المستخدم  موجود مسبقا ", 400, httpStatusText.FAIL);
    return next(error);
  }
  



  // ✅ تشفير كلمة المرور
  const hashedPassword = await bcrypt.hash(password, 10);

  // ✅ التعامل مع الصورة (لو موجودة)
  let profilePicture = null;
  if (req.file) {
    profilePicture = req.file.filename;
  } else {
    console.log("⚠️ لم يتم رفع صورة جديدة، سيتم الإبقاء على الصورة القديمة.");
  }

  // ✅ تنفيذ عملية التحديث
  const update = await User.updateUserProfileData(
    userId,
    fullName,
    email,
    hashedPassword,
    mobileNumber,
    landLine,
    faxNumber,
    profilePicture
  );

  // ✅ التحقق من نجاح العملية
  if (!update) {
    const error = appError.create(
      "حدث خطأ أثناء تحديث البيانات",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  // ✅ إرسال الرد النهائي
  return res.status(200).json({
    status: "success",
    message: "تم تحديث الملف الشخصي بنجاح، يرجى تسجيل الدخول مرة أخرى",
  });
});

export const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;


  // 1️⃣ التحقق من وجود الإيميل والباسورد
  if (!email || !password) {
    const error = appError.create(
      "يجب إدخال البريد الإلكتروني وكلمة المرور",
      400,
      httpStatusText.FAIL
    );
    return next(error);
  }

  // 2️⃣ جلب المستخدم
  const findUser = await User.getUser(email);

  // 2.1️⃣ التحقق من وجود المستخدم أولاً
  if (!findUser || findUser.length === 0) {
    const error = appError.create("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401, httpStatusText.FAIL);
    return next(error);
  }

  const user = findUser[0];
  const matchedPassword = await bcrypt.compare(password, user.password_hash);

  // 2.2️⃣ التحقق من صحة كلمة المرور
  if (!matchedPassword) {
    const error = appError.create("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401, httpStatusText.FAIL);
    return next(error);
  }


  if (user.is_first_login) {
    const token = await generateJWT({  id: user.user_id });
    return res.status(200).json({
      message: "تسجيل الدخول الأول - يرجى تحديث الملف الشخصي",
      data :{token},
      method: "PUT"
    });
  }

  // 3️⃣ التحقق من الباسورد (هذا الجزء مكرر ويمكن حذفه، لكن سأبقيه مؤقتاً للتأكد)

  if (!matchedPassword) {
    const error = appError.create("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401, httpStatusText.FAIL);
    return next(error);
  }

  // 5️⃣ جلب كل الأدوار المرتبطة بالمستخدم
  const userRoles = await User.getUserRoles(user.user_id);

  const role = userRoles[0] ;
  const roleLevel = userRoles[0];
  const profilePicture = user.profile_picture
  const fullName = user.full_name
  const token = await generateJWT({ email: user.email, id: user.user_id, role:roleLevel, roleName :role });

  // 6️⃣ لو عنده أكثر من دور
  if (userRoles.length > 1) {
    return res.json({
      message: "يرجى اختيار دور واحد",
      data: {
        token,
        profilePicture :profilePicture , 
        fullName : fullName
      }
    });
  }


  // 7️⃣ إذا عنده دور واحد فقط

  return res.json({
    status: httpStatusText.SUCCESS,
    data: {
      token ,
        profilePicture :profilePicture , 
        fullName : fullName
    }
  });
});


// export const chooseRole = asyncWrapper(async (req, res, next) => {
//   const { user_id, role_name ,role_level} = req.body;

//   if (!user_id || !role_name ||!role_level) {
//     const error = appError.create(
//       "user_id and role_name and role_level are required",
//       400,
//       httpStatusText.FAIL
//     );
//     return next(error);
//   }

//   const userData = await User.getUserById(user_id); // افترضنا أنها async
//   if (!userData || userData.length === 0) {
//     const error = appError.create("User not found", 400, httpStatusText.FAIL);
//     return next(error);
//   }

//   const currentUser = userData[0];

//   const token = await generateJWT({
//     email: currentUser.email,
//     id: currentUser.user_id,
//     role_name: role_name,
//     role_level :role_level
//   });

//   return res.json({
//     status: httpStatusText.SUCCESS,
//     data: { token }
//   });
// });




