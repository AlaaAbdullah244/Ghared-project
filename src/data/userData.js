// config/dbFunctions.js - طبقة قاعدة البيانات

import { pool } from "../config/db.js"; 

export const getUser = async (email) => {
    const query = `
        SELECT email, password_hash, is_first_login ,user_id , full_name,profile_picture
        FROM "User"
        WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
};

export const getUserById = async (user_id) => {
    const query = `
        SELECT email, password_hash, is_first_login ,user_id
        FROM "User"
        WHERE user_id = $1
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
};

export const getUserProfileData = async (userId) => {
    const query = `
        SELECT 
            user_id, 
            full_name, 
            email, 
            mobile_number, 
            landline, 
            fax_number, 
            profile_picture,
            is_first_login
        FROM "User"
        WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
};

 export const getUserRoles = async (userId)=>{
    // الاستعلام SQL الذي يربط الجداول كما تم شرحه سابقاً
    const queryText = `
        SELECT
            R."role_level"              
        FROM
            "User" U
        JOIN
            "User_Membership" UM ON U."user_id" = UM."user_id"
        JOIN
            "Department_Role" DR ON UM.dep_role_id = DR.dep_role_id
        JOIN
            "Role" R ON DR.role_id = R."role_id"
        WHERE
            U."user_id" = $1; -- نستخدم $1 لضمان أمان تمرير المتغيرات (Parametrization)
    `;

    try {
        // تنفيذ الاستعلام
        const result = await pool.query(queryText, [userId]);
        
        // إرجاع صفوف النتائج
        return result.rows;
        
    } catch (error) {
        console.error('Error executing query for user roles:', error.stack);
        // يمكنك هنا اختيار إلقاء خطأ أو إرجاع مصفوفة فارغة
        throw new Error('Failed to retrieve user roles from database.');
    }
}

/**
 * دالة لتحديث البيانات الشخصية (كمثال بسيط).
 */
export const updateUserProfileData = async (
  userId,
  fullName,
  email,
  hashedPassword,
  mobileNumber,
  landline,
  faxNumber,
  profilePicture
) => {
  const query = `
    UPDATE "User"
    SET 
      full_name = $2,
      email = $3,
      password_hash = $4,
      mobile_number = $5,
      landline = $6,
      fax_number = $7,
      profile_picture = $8,
      is_first_login = false
    WHERE user_id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [
    userId,
    fullName,
    email,
    hashedPassword,
    mobileNumber,
    landline,
    faxNumber,
    profilePicture
  ]);
 
  return result.rows[0]; // ✅ دلوقتي هترجع بيانات اليوزر بعد التحديث
};

export const updateUserSignaturePath = async (userId, signaturePath) => {
  const query = `
    UPDATE "User" 
    SET signature_path = $1
    WHERE user_id = $2
    RETURNING signature_path;
  `;
  const result = await pool.query(query, [signaturePath, userId]);
  return result.rows[0];
};
