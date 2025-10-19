import express from "express";
import studentController from "../controllers/student.js";
import {isAuth} from '../middleware/auth.js';
const router = express.Router();

router.route("/")
.get(studentController.loginForm)
.post(studentController.login)

router.route("/new")
.get(studentController.registerForm)
.post(studentController.register)
router.get('/logout',studentController.logout)

const studentRouter=express.Router({mergeParams:true});
studentRouter.use(isAuth);
studentRouter.get("/",studentController.home)
studentRouter.get("/profile",studentController.profile)
studentRouter.get("/subjects",studentController.floatedSubjects)
studentRouter.post("/application",studentController.application)
studentRouter.get("/courses",studentController.courses)
studentRouter.get("/activity",studentController.activity)

router.use("/:id", studentRouter);

export default router;