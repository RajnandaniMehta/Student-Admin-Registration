import express from "express";
import adminController from "../controllers/admin.js";
import {isAuthAdmin} from '../middleware/auth.js';
const router = express.Router();

router.route("/").
get(adminController.loginForm)
.post(adminController.login)

router.route("/new")
.get(adminController.registerForm)
.post(adminController.register)

router.get("/logout",adminController.logout);
const adminRouter = express.Router({ mergeParams: true });
adminRouter.use(isAuthAdmin);

// Dashboard Home
adminRouter.get("/", adminController.home);

// Profile
adminRouter.get("/profile", adminController.profile);

// Students
adminRouter.get("/registered", adminController.students);

// Subjects
adminRouter
  .route("/subjects")
  .get(adminController.floatSubjectsForm)
  .post(adminController.floatSubjects);

// Applications
adminRouter.get("/application", adminController.applications);
adminRouter.post("/approve", adminController.approved);
adminRouter.post("/disapprove", adminController.disapproved);
adminRouter.get("/approvedapplication", adminController.getApproved);

// Courses & Floated Subjects
adminRouter.get("/floatedSubjects", adminController.floatedByAdmin);
adminRouter.get("/courses", adminController.courses);

// Mount nested adminRouter at /:id
router.use("/:id", adminRouter);

export default router;