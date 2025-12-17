import { body } from "express-validator";

export const userAddValidation = [
 

  body("email")
    .notEmpty().withMessage("يرجى إدخال بريد إلكتروني صحيح"),

  body("password")
    .isLength({ min: 6 }).withMessage("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل"),

  

  // ✅ التحقق من القسم (Department)
  body("departmentId")
    .notEmpty().withMessage("يجب اختيار القسم")
    .isInt().withMessage("معرف القسم يجب أن يكون رقماً صحيحاً"),

 
];
