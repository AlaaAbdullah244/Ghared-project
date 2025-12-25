import appError from "../utils/appError.js";

// Manual validation middleware for transactions.
export const validateTransaction = (req, res, next) => {
    const { 
        content, 
        is_draft, 
        receivers, 
        target_department_id // 👈 ضفنا المتغير ده عشان نفحص وجوده
    } = req.body;

    // 1. Validate that content exists and is not empty.
    if (!content || content.trim() === "") {
        return next(appError.create("محتوى المعاملة مطلوب", 400));
    }

    // 2. For non-drafts, validate destination (Receivers OR Department).
    const isDraftBool = (is_draft === true || is_draft === 'true');
    
    if (!isDraftBool) {
        // بنشوف هل تم تحديد أشخاص؟ (سواء مصفوفة أو قيمة واحدة)
        const hasReceivers = receivers && receivers.length > 0;
        
        // بنشوف هل تم تحديد قسم؟
        const hasTargetDept = target_department_id && target_department_id !== "";

        // لو مفيش أشخاص ولا فيه قسم، نرجع إيرور
        if (!hasReceivers && !hasTargetDept) {
            return next(appError.create("يجب اختيار مستلم واحد على الأقل أو تحديد قسم كامل للإرسال", 400));
        }
    }

    // All checks passed.
    next();
};