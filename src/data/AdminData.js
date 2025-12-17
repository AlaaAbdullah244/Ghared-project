import { pool } from "../config/db.js"; 

export const getAdmin = async (email) => {
  // نقوم بالربط بين 4 جداول للوصول إلى صلاحيات المستخدم
  const queryText = `
    SELECT 
      u.user_id AS id,
      u.email,
      u.password_hash,
      u."full_name" AS "fullName",          
      u."profile_picture" AS "profilePicture", 
      r."role_level" AS "roleLevel"
    FROM "User" u
    INNER JOIN "User_Membership" um ON u.user_id = um.user_id
    INNER JOIN "Department_Role" dr ON um.dep_role_id = dr.dep_role_id
    INNER JOIN "Role" r ON dr.role_id = r.role_id
    WHERE u.email = $1
  `;

  
    const result = await pool.query(queryText, [email]);
    return result.rows;
  
  
};






export const AddAdminData = async (
  fullName,
  email,
  hashedPassword,
  mobileNumber, // الترتيب هنا رقم 4
  landline,
  faxNumber,
  profilePicture // الترتيب هنا رقم 7
) => {
  const query = `
    WITH new_user AS (
      INSERT INTO "User" 
      (full_name, email, password_hash, mobile_number, landline, fax_number, profile_picture, is_first_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING user_id, full_name, email
    )
    INSERT INTO "User_Membership" (user_id, dep_role_id, start_date)
    SELECT 
      (SELECT user_id FROM new_user), 
      (SELECT dr.dep_role_id 
       FROM "Department_Role" dr 
       JOIN "Role" r ON dr.role_id = r.role_id 
       WHERE dr.department_id = 0 AND r.role_level = 0 
       LIMIT 1), 
      CURRENT_DATE
    RETURNING (SELECT user_id FROM new_user);
  `;

  // القيم دي لازم تتوافق مع الـ $1, $2 اللي فوق
  const values = [
    fullName,
    email,
    hashedPassword,
    mobileNumber,
    landline,
    faxNumber,
    profilePicture
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};


export const getAllSystemUsers = async () => {
  const queryText = `
    SELECT 
      u.user_id,
      u.full_name,
      u.email,
      u.mobile_number,
      u.profile_picture,
      r.role_level,
      d.department_name
    FROM "User" u
    LEFT JOIN "User_Membership" um ON u.user_id = um.user_id
    LEFT JOIN "Department_Role" dr ON um.dep_role_id = dr.dep_role_id
    LEFT JOIN "Role" r ON dr.role_id = r.role_id
    LEFT JOIN "Department" d ON dr.department_id = d.department_id
    ORDER BY u.user_id DESC;
  `;
  
  const result = await pool.query(queryText);
  return result.rows;
};



export const getSystemUserById = async (userId) => {
  const queryText = `
    SELECT 
      u.user_id,
      u.full_name,
      u.email,
      u.mobile_number,
      u.landline,      -- ممكن نحتاجها في التفاصيل
      u.fax_number,    -- ممكن نحتاجها في التفاصيل
      u.profile_picture,
      
      -- بيانات الصلاحية
      r.role_level,
      
      -- بيانات المكان
      d.department_name,
      c.college_name
      
    FROM "User" u
    LEFT JOIN "User_Membership" um ON u.user_id = um.user_id
    LEFT JOIN "Department_Role" dr ON um.dep_role_id = dr.dep_role_id
    LEFT JOIN "Role" r ON dr.role_id = r.role_id
    LEFT JOIN "Department" d ON dr.department_id = d.department_id
    LEFT JOIN "College" c ON d.college_id = c.college_id
    
    WHERE u.user_id = $1  -- 👈 ده الفلتر المهم
  `;
  
  const result = await pool.query(queryText, [userId]);
  return result.rows[0]; // بنرجع صف واحد بس (أوبجكت) لأن الـ ID مبيتكررش
};



export const deleteSystemUser = async (userId) => {
  // بنستخدم client عشان نقدر نتحكم في الـ Transaction (BEGIN, COMMIT, ROLLBACK)
  const client = await pool.connect();

  try {
    // 1️⃣ ابدأ المعاملة
    await client.query('BEGIN');

    // 2️⃣ حذف البيانات الشخصية المباشرة (اللي ملهاش تأثير على سير العمل العام)
    
    // مسح العضويات [cite: 37, 161]
    await client.query(`DELETE FROM "User_Membership" WHERE user_id = $1`, [userId]);

    // مسح الإشعارات الخاصة باليوزر [cite: 59, 187]
    await client.query(`DELETE FROM "Notification" WHERE user_id = $1`, [userId]);

    // مسح الرسائل اللي "استقبلها" اليوزر في صندوق الوارد (Receiver) [cite: 98, 206]
    await client.query(`DELETE FROM "Transaction_Receiver" WHERE receiver_user_id = $1`, [userId]);

    // 3️⃣ التعامل مع البيانات التاريخية (Transactions & Actions)
    // ⚠️ ملحوظة مهمة: لو مسحت الرسائل اللي اليوزر "بعتها"، هتختفي من عند المستقبلين كمان وده ممكن يبوظ تاريخ الشغل.
    // الأفضل هنا نخلي قيمة الـ ID بـ NULL (Set Null) عشان نحافظ على الرسالة بس نعرف إن صاحبها اتمسح.
    
    // فك ارتباط الرسائل اللي هو "راسلها" [cite: 51, 173]
    await client.query(`UPDATE "Transaction" SET sender_user_id = NULL WHERE sender_user_id = $1`, [userId]);

    // فك ارتباط الإجراءات اللي هو قام بيها (Actions) [cite: 128, 236]
    await client.query(`UPDATE "Action" SET performer_user_id = NULL WHERE performer_user_id = $1`, [userId]);


    // 4️⃣ وأخيراً، امسح اليوزر نفسه من جدول User [cite: 28, 158]
    const query = `DELETE FROM "User" WHERE user_id = $1 RETURNING *`;
    const result = await client.query(query, [userId]);

    // 5️⃣ اعتمد التغييرات
    await client.query('COMMIT');
    
    return result.rows[0];

  } catch (error) {
    // لو حصل أي خطأ، رجع الداتا بيز زي ما كانت
    await client.query('ROLLBACK');
    throw error; // ارمي الخطأ عشان الـ Controller يشوفه
  } finally {
    // لازم تقفل الاتصال بالـ client
    client.release();
  }
};

export const updateSystemUser = async (userId, full_name, email, mobile_number, department_id) => {
  const query = `
    WITH 
    -- 1️⃣ تحديث بيانات المستخدم الأساسية (الاسم، الإيميل...)
    -- الـ ID هنا ثابت ومستحيل يتغير لأننا بنستخدم WHERE user_id
    upd_user AS (
      UPDATE "User"
      SET 
        full_name = COALESCE($2, full_name),
        email = COALESCE($3, email),
        mobile_number = COALESCE($4, mobile_number)
      WHERE user_id = $1
      RETURNING user_id, full_name, email, mobile_number
    ),

    -- 2️⃣ البحث عن الرول المناسبة للقسم الجديد
    target_role AS (
      SELECT dr.dep_role_id 
      FROM "Department_Role" dr
      INNER JOIN "Role" r ON dr.role_id = r.role_id
      WHERE dr.department_id = $5 
      AND r.role_level <> 0 
      LIMIT 1 
    ),

    -- 3️⃣ محاولة تعديل العضوية الحالية (UPDATE ONLY)
    -- لو اليوزر عنده عضوية، هنعدل الـ dep_role_id بس، ومش هنغير الـ user_id
    try_update_membership AS (
      UPDATE "User_Membership"
      SET 
        dep_role_id = (SELECT dep_role_id FROM target_role),
        start_date = CURRENT_DATE
      WHERE user_id = $1
      AND EXISTS (SELECT 1 FROM target_role) -- لازم نكون لقينا رول جديدة
      RETURNING user_id
    ),

    -- 4️⃣ إضافة عضوية جديدة فقط في حالة عدم وجود واحدة (INSERT IF NOT EXISTS)
    -- الكويري ده هيشتغل بس لو الخطوة رقم 3 مرجعتش حاجة (يعني اليوزر مكنش متضاف قبل كده)
    do_insert_membership AS (
      INSERT INTO "User_Membership" (user_id, dep_role_id, start_date)
      SELECT 
        (SELECT user_id FROM upd_user), 
        (SELECT dep_role_id FROM target_role), 
        CURRENT_DATE
      WHERE NOT EXISTS (SELECT 1 FROM try_update_membership) -- شرط: لو التعديل فشل
      AND EXISTS (SELECT 1 FROM target_role)
    )

    -- 5️⃣ إرجاع بيانات اليوزر
    SELECT * FROM upd_user;
  `;

  const result = await pool.query(query, [
    userId, 
    full_name, 
    email, 
    mobile_number, 
    department_id 
  ]);

  return result.rows[0];
};








// AdminData.js

export const AddUserData = async (email, password_hash, departmentId) => {
  const query = `
    WITH 
    -- 1️⃣ إنشاء المستخدم الجديد
    new_user AS (
      INSERT INTO "User" 
      (full_name, email, password_hash, mobile_number, is_first_login)
      VALUES 
      (
        'New Employee', 
        $1, 
        $2, 
        NULL, 
        true
      )
      RETURNING user_id, email
    ),
    -- 2️⃣ البحث عن الرول المرتبط بهذا القسم تلقائياً
    target_role AS (
      SELECT dr.dep_role_id 
      FROM "Department_Role" dr
      INNER JOIN "Role" r ON dr.role_id = r.role_id
      WHERE dr.department_id = $3  -- القسم اللي الأدمن اختاره
      AND r.role_level <> 0        -- استبعاد الأدمن (Level 0)
      LIMIT 1                      -- هات أول رول تلاقيه مربوط بالقسم ده
    )
    -- 3️⃣ إدخال العضوية باستخدام الـ ID اللي جبناه في الخطوة السابقة
    INSERT INTO "User_Membership" (user_id, dep_role_id, start_date)
    SELECT 
      (SELECT user_id FROM new_user), 
      (SELECT dep_role_id FROM target_role), 
      CURRENT_DATE
    WHERE EXISTS (SELECT 1 FROM target_role) -- تأكد إننا لقينا رول أصلاً
    RETURNING *;
  `;

  // القيم: 1:email, 2:password, 3:departmentId
  const values = [email, password_hash, departmentId];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getAllData = async()=>{

  const queryText = `
 SELECT 
    d.department_id,
    d.department_name,
    c.college_id,
    c.college_name,
    r.role_id,
    r.role_level
FROM "Department" d
LEFT JOIN "College" c ON d.college_id = c.college_id
LEFT JOIN "Department_Role" dr ON d.department_id = dr.department_id
LEFT JOIN "Role" r ON dr.role_id = r.role_id
WHERE r.role_level <> 0  -- (هنا التعديل: استبعاد أي رول ليفل بـ 0)
ORDER BY c.college_id, d.department_id;


  `;
  
  const result = await pool.query(queryText);
  return result.rows;

}


export const addUserRoleData = async (userId, roleId, departmentId) => {
  // 1. نبحث أولاً عن الـ ID الخاص بربط هذا الدور بهذا القسم
  const findDepRoleQuery = `
    SELECT dep_role_id 
    FROM "Department_Role" 
    WHERE role_id = $1 AND department_id = $2
  `;
  
  const depRoleResult = await pool.query(findDepRoleQuery, [roleId, departmentId]);

  // لو مفيش ربط بين الدور والقسم ده في السيستم، نرجع null
  if (depRoleResult.rows.length === 0) {
    return null; 
  }

  const depRoleId = depRoleResult.rows[0].dep_role_id;

  // 2. نضيف اليوزر لهذا الربط في جدول العضويات
  // (ON CONFLICT DO NOTHING) دي زيادة عشان لو اليوزر عنده الدور ده ميعملش ايرور، بس يتجاهله
  const insertQuery = `
    INSERT INTO "User_Membership" (user_id, dep_role_id, start_date)
    VALUES ($1, $2, CURRENT_DATE)
    RETURNING *;
  `;

  const result = await pool.query(insertQuery, [userId, depRoleId]);
  return result.rows[0];
};