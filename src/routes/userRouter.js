// import express from 'express';
// import { login } from '../controller/userController.js';

// const router = express.Router();

// router.post('/login', login);
// console.log("✅ userRouter loaded");




// export default router;

// src/routes/userRouter.js
import express from "express";
import { login, updateUser, getUserProfile } from "../controllers/userController.js";
import multer  from "multer";
import { userValidation } from "../middelware/userValidation.js";
import path from 'path';
import { fileURLToPath } from "url";
import { dirname } from "path";
import { verifyToken } from "../middelware/verifyToken.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = express.Router();

const diskStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        // يجب استخدام المسار الكامل
        cb(null, path.join(__dirname, '../uploads/Images'))
    },
    filename: function(req, file, cb) {
        const ext = file.mimetype.split('/')[1]
        const filename = `user${Date.now()}.${ext}`;
        cb(null , filename)
    }
})


const fileFilter = (req, file, cb) => {
    const imageType = file.mimetype.split('/')[0];
    
    if(imageType === 'image') {
        return cb(null, true)
    } else {
        return cb(appError.create('file must be an image', 400), false)
    }
}

const upload = multer({ 
    storage: diskStorage,
    fileFilter
})

router.post("/login", login);
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile/update",verifyToken,upload.single('profilePicture'),userValidation, updateUser);



export default router;
