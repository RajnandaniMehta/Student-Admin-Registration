import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Student from "./models/students.js";
import Admin from "./models/admins.js";
import Subject, { subjectSchema } from "./models/subjects.js";
import FloatedSubject from "./models/floatedSubjects.js";
import Application from "./models/submittedForm.js";
import bcrypt from "bcrypt";
import { config } from "dotenv";
config();
import sendApprovalMail, { sendDisapprovalMail } from './utils/sendEmail.js';
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-google-oauth20";
import { encrypt } from "./utils/encryption.js";
import { decrypt } from "./utils/encryption.js";
import ejsMate from "ejs-mate";
import jwt from "jsonwebtoken";
import { isAuth, isAuthAdmin } from "./middleware/auth.js";

import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const MONGO_URL = "mongodb://127.0.0.1:27017/CollegeWebsite";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(cookieParser());
app.use((req, res, next) => {        //cache ko remove krne ke liye taaki logout hone ke baad bhi back arrow se wapas ke pages na dekh paaye
    res.set('Cache-Control', 'no-store');
    next();
});
main().then(() => {
    console.log("Connected to DB");
}).catch((err) => {
    console.log(err);
})
async function main() {
    await mongoose.connect(MONGO_URL);
}
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const userType = req.query.state;
        if (userType === 'student') {
            let student = await Student.findOne({ studentEmail: profile.emails[0].value });
            if (!student) {
                return done(null, false, { message: "Student not registered" });
            }
            return done(null, { user: student, role: "student" });
        } else if (userType === 'admin') {
            let admin = await Admin.findOne({ email: profile.emails[0].value });
            if (!admin) {
                return done(null, false, { message: "Admin not registered" });
            }
            return done(null, { user: admin, role: "admin" });
        } else {
            return done(null, false, { message: "Unknown role" });
        }
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((data, done) => {
    done(null, { id: data.user._id, role: data.role });
});

passport.deserializeUser(async (data, done) => {
    if (data.role === 'student') {
        const student = await Student.findById(data.id);
        done(null, { user: student, role: 'student' });
    } else if (data.role === 'admin') {
        const admin = await Admin.findById(data.id);
        done(null, { user: admin, role: 'admin' });
    } else {
        done(new Error("Unknown role"), null);
    }
});
app.get("/", (req, res) => {
    res.render("index.ejs", { state: 'main' });
});

// login through GOOGLE
app.get("/student", (req, res) => {
    res.render("students/login.ejs", { state: 'login' });
});
app.get("/auth/google/student", (req, res, next) => {
    passport.authenticate("google", {
        scope: ["profile", "email"],
        state: "student"
    })(req, res, next);
});
app.get("/auth/google/admin", (req, res, next) => {
    passport.authenticate("google", {
        scope: ["profile", "email"],
        state: "admin"
    })(req, res, next);
});

app.get("/auth/google/callback", passport.authenticate("google", {
    failureRedirect: "/",
}), async (req, res) => {
    const user = req.user.user;
    const role = req.user.role;

    if (role === 'student') {
        const existingToken = req.cookies.student_jwt;
        if (existingToken) {
            const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
            if (decoded.role === role) {
                return res.redirect(`/${role}/${user._id}`);
            }
        }

        const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES
        });
        res.cookie("student_jwt", token, {
            httpOnly: true,
            path: "/",
            secure: false,             
            sameSite: "Lax",
            expires: new Date(Date.now() + parseInt(process.env.COOKIE_EXPIRES))
        });
        res.redirect(`/student/${user._id}`);
    } else {
        const existingToken = req.cookies.admin_jwt;
        if (existingToken) {
            const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
            if (decoded.role === role) {
                return res.redirect(`/${role}/${user._id}`);
            }
        }
        const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES
        });
        res.cookie("admin_jwt", token, {
            httpOnly: true,
            path: "/",
            secure: false,           
            sameSite: "Lax",
            expires: new Date(Date.now() + parseInt(process.env.COOKIE_EXPIRES))
        });
        res.redirect(`/admin/${user._id}`);
    }
});

//student login
app.post("/student", async (req, res) => {
    const { studentEmail, password } = req.body;
    if (!studentEmail || !password) {
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const isStudent = await Student.findOne({ studentEmail: studentEmail });
    if (isStudent) {
        const matchPassword = await bcrypt.compare(password, isStudent.password);
        if (matchPassword) {
            const existingToken = req.cookies.student_jwt;
            if (existingToken) {
                const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
                if (decoded.role === 'student') {
                    return res.status(200).json({
                        success: true,
                        message: "Login successfully!",
                        redirect: `/student/${isStudent._id}`,
                        existingToken
                    });
                }
            }

            const token = await jwt.sign({ id: isStudent._id, role: 'student' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

            return res.status(200).cookie("student_jwt", token, {
                httpOnly: true,
                path: "/student",
                secure: false,             // false for local dev, true for HTTPS
                expires: new Date(Date.now() + parseInt(process.env.COOKIE_EXPIRES)),

            }).json({
                success: true,
                message: "Login successfully!",
                redirect: `/student/${isStudent._id}`,
                token
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Wrong password! Please enter correct one."
            });
        }

    } else {
        res.status(400).json({
            success: false,
            message: "You have not registered!"
        });
    }
});

//student register
app.get("/newStudent", (req, res) => {
    res.render("students/register.ejs", { state: 'login' });
});

app.post("/newStudent", async (req, res) => {
    const { name, id, rollno, currSemester, department, password, fatherName, permanentAddress, parentMobNo, parentEmail, presentAddress, studentNo, studentEmail } = req.body;
    const nitukEmailRegex = /^[a-zA-Z0-9._%+-]+@nituk\.ac\.in$/;
    if (!nitukEmailRegex.test(studentEmail)) {
        return res.status(400).json({
            success: false,
            message: "Sorry this is only for NIT Uttarakhand Students"
        });
    }
    if (!name || !id || !studentEmail || !rollno) {
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const isStudent = await Student.findOne({ studentEmail: studentEmail });
    if (isStudent) {
        return res.status(400).json({
            success: false,
            message: "You have already registered!"
        });
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        let dept = department.toLowerCase();
        await Student.create({ name, id, rollno, currSemester, department: dept, password: hashedPassword, fatherName, permanentAddress, parentMobNo, parentEmail, presentAddress, studentNo, studentEmail, activity: [] });
        res.status(200).json({
            success: true,
            message: "Registered Successfully!",
            redirect: "/student"
        });
    }
});

//homepage
app.get("/student/:id", isAuth, async (req, res) => {
    const student = await Student.findById(req.user.id);
    res.render("students/home.ejs", { student, state: 'studentt' });
});

//student profile
app.get("/student/:id/profile", isAuth, async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id);
    res.render("students/profile.ejs", { student, state: 'studentt' });
});

//see the floated subjects
app.get("/student/:id/subjects", isAuth, async (req, res) => {
    let { id } = req.params;
    let { semester } = req.query;
    try {

        let student = await Student.findById(id);
        if (student) {
            const floatedsubjects = await FloatedSubject.find({ department: student.department, semester: semester }).populate("subjectId");;
            if (floatedsubjects.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Your HOD has not floated any subjects yet."
                });
            }
            const subjectDetails = floatedsubjects.map(fs => fs.subjectId);

            res.status(200).json({
                success: true,
                subjects: subjectDetails,
                message: "Current semester subjects"
            });

        } else {
            res.status(400).json({
                success: false,
                message: "You have not registered."
            });
        }
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
        });
    }

});

//student submit application to admin
app.post("/student/:id/application", isAuth, async (req, res) => {
    let { semester, selectedSubjects } = req.body;
    let { id } = req.params;
    let chosenSubjects = await Subject.find({ _id: { $in: selectedSubjects } });
    try {
        let isStudent = await Student.findById(id);
        for (const sub of chosenSubjects) {
            if (isStudent.subjects.includes(sub._id.toString())) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot choose those subjects which you have already completed"
                });
            }
        }

        if (chosenSubjects.length <= 0) {
            return res.status(401).json({
                success: false,
                message: "you have not selected any subject"
            })
        }
        const existingApp = await Application.findOne({
            studentId: isStudent._id,
            semester: req.body.semester,
        });

        if (existingApp) {
            return res.status(400).json({ message: "Application already exists for this semester." });
        }
        if (isStudent) {
            let appli = await Application.create({
                studentId: id,
                name: isStudent.name,
                rollno: isStudent.rollno,
                department: isStudent.department,
                subjects: chosenSubjects,
                semester: semester
            });
            await Student.findByIdAndUpdate(
                id,
                { $push: { activity: appli._id } },
                { new: true }
            );
            res.status(200).json({
                success: true,
                message: "Application submitted successfully",
                redirect: `/student/${isStudent._id}`
            })
        } else {
            res.status(401).json({
                success: false,
                message: "You have not registered",
            })
        }

    } catch (err) {
        console.log(err);
        if (err.code === 11000 && err.keyPattern?.studentId && err.keyPattern?.semester) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted an application for this semester.",
            });

        }
    }
});

//get ug courses
app.get("/student/:id/courses", isAuth, async (req, res) => {
    let { id } = req.params;
    let subjects = await Subject.find({});
    let student = await Student.findById(id);
    res.render("common/coursesStudent.ejs", { subjects, state: 'student', student });
});

//Studnet get previous Activity
app.get("/student/:id/activity", isAuth, async (req, res) => {
    let { id } = req.params;
    try {
        let student = await Student.findById(id);
        if (student) {
            const activityList = await Application.find({ studentId: student._id }).populate("subjects");
            console.log(activityList);
            return res.render("students/activity.ejs", { activityList, student, state: 'student' });
        }

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Intenal server error"
        })
    }
})
//student logout
app.get('/student/logout', (req, res, next) => {
    // Passport logout if using it
    req.logout?.(function (err) {
        if (err) {
            console.error('Logout error:', err);
            return next(err);
        }

        // Destroy session if any
        req.session?.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.redirect('/');
            }

            // Clear both cookies
            res.clearCookie('student_jwt', { 
                httpOnly: true,
                path: "/student",
                secure: false,             // false for local dev, true for HTTPS
                expires: new Date(Date.now())});
                res.clearCookie('student_sid', { path: '/student' });
            return res.redirect('/student'); // Or your login page
        });
    });
});


//admin login
app.get("/admin", (req, res) => {
    res.render("admins/login.ejs", { state: 'login' });
});

app.post("/admin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }

    const isAdmin = await Admin.findOne({ email: email });
    if (isAdmin) {

        const matchPassword = await bcrypt.compare(password, isAdmin.password);
        if (matchPassword) {
            const existingToken = req.cookies.admin_jwt;
        if (existingToken) {
            const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
            if (decoded.role === 'admin') {
                return res.status(200).json({
                    success: true,
                    message: "Login successfully!",
                    redirect: `/admin/${isAdmin._id}`,
                    existingToken
                });
            }
        }
            const token = await jwt.sign({ id: isAdmin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

            return res.status(200).cookie("admin_jwt", token, {
                httpOnly: true,
                expiresIn: new Date(Date.now() + process.env.COOKIE_EXPIRES),
            }).json({
                success: true,
                message: "Login successfully!",
                redirect: `/admin/${isAdmin._id}`,
                token
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Wrong password! Please enter correct one."
            });
        }

    } else {
        res.status(400).json({
            success: false,
            message: "You have not registered!"
        });
    }
});
//admin register
app.get("/newAdmin", (req, res) => {
    res.render("admins/register.ejs", { state: 'login' });
});
app.post("/newAdmin", async (req, res) => {
    const { name, department, email, password, appPassword, phoneNo, designation, collegepswd } = req.body;
    // console.log(admin);
    if (!name || !department || !email || !password || !appPassword) {
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const nitukEmailRegex = /^[a-zA-Z0-9._%+-]+@nituk\.ac\.in$/;
    if (!nitukEmailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Sorry this is only for NIT Uttarakhand HODs"
        });
    }
    const isAdmin = await Admin.findOne({ email: email });
    if (isAdmin) {
        return res.status(400).json({
            success: false,
            message: "You have already registered!"
        });
    } else {
        const pswd = "NITUK";
        if (req.body.collegepswd === pswd) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const hashedPswd = encrypt(appPassword);
            let dept = department.toLowerCase();
            await Admin.create({ name, department: dept, email, password: hashedPassword, appPassword: hashedPswd, phoneNo, designation, collegepswd });
            res.status(200).json({
                success: true,
                message: "Registered Successfully!",
                redirect: "/admin"
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Incorrect college password",
            });
        }

    }
});
//homepage
app.get("/admin/:id", isAuthAdmin, async (req, res) => {
    const admin = await Admin.findById(req.user.id);
    res.render("admins/home.ejs", { admin, state: 'adminn' });
});

//admin profile
app.get("/admin/:id/profile", isAuthAdmin, async (req, res) => {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    res.render("admins/profile.ejs", { admin, state: 'adminn' });
});
//see registered student
app.get("/admin/:id/registered", isAuthAdmin, async (req, res) => {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (admin) {
        const studentlist = await Student.find({ department: admin.department });
        res.render("admins/studentList.ejs", { studentlist, state: 'admin', admin });
    } else {
        console.log("Not an admin");
    }
});
//admin float-subjects
app.get("/admin/:id/subjects", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let subjects = await Subject.find({ department: admin.department });
    res.render("admins/floatSubjects.ejs", { subjects, admin, state: 'adminn' });
});
app.post("/admin/:id/subjects", isAuthAdmin, async (req, res) => {
    const { department, semester, newSubjects, selectedSubjects } = req.body;
    let { id } = req.params;
    let floated = [];

    try {
        if(!department ||!semester ){
            return res.status(401).json({
                success:false,
                message:"You have not provided required details."
            });
        }
        let admin = await Admin.findById(id);
        if (department.toLowerCase() !== admin.department) {
            return res.status(401).json({
                success: false,
                message: "You cannot float subjects for that department which not belongs to you"
            });
        }
        if(selectedSubjects.length<=0 && newSubjects.length<=0){
            return res.status(402).json({
                success:false,
                message:"You have not choosen any subjects."
            })
        }
        if (selectedSubjects && Array.isArray(selectedSubjects)) {
            floated.push(...selectedSubjects);
        } else if (selectedSubjects) {
            floated.push(selectedSubjects);
        }
        if (newSubjects && Array.isArray(newSubjects)) {
            for (const sub of newSubjects) {
                const existing = await Subject.findOne({ courseCode: sub.courseCode });
                if (existing) {
                    floated.push(existing._id.toString());
                } else {
                    sub.department = department.toLowerCase();
                    sub.semester = semester;
                    const created = await Subject.create(sub);
                    floated.push(created._id.toString());
                }
            }
        } else if (newSubjects) {
            const existing = await Subject.findOne({ courseCode: newSubjects.courseCode });
            if (existing) {
                floated.push(existing._id.toString());
            } else {
                newSubjects.department = department.toLowerCase();
                newSubjects.semester = semester;
                let newSubjectAdded = await Subject.create(newSubjects);
                floated.push(newSubjectAdded._id.toString());
            }
        }
        await FloatedSubject.create({
            floatedBy: admin.name,
            semester: semester,
            department: department.toLowerCase(),
            subjectId: floated,
        });

        res.status(200).json({
            success: true,
            message: "Subjects floated successfully!",
            redirect: `/admin/${id}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error floating subjects" });
    }
});
//get submitted application
app.get("/admin/:id/application", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    if (admin) {
        const application = await Application.find({ department: admin.department, formStatus: "Not Approved" }).populate("subjects");
        res.render("admins/application.ejs", { application, admin, state: 'admin' });
    }
});
app.post("/admin/:id/approve", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let { studentId, appId } = req.body;
    let admin = await Admin.findById(id);

    if (admin) {
        const appli = await Application.findByIdAndUpdate(appId, { formStatus: "Approved" }, { new: true });

        const student = await Student.findByIdAndUpdate(studentId,
            { currSemester: appli.semester, $push: { subjects: appli.subjects } },
            { new: true }).populate("subjects");;

        if (!student) {
            return res.status(400).json({
                success: false,
                message: "Wrong user"
            })
        }
        console.log(student.subjects);
        const decryptedPassword = decrypt(admin.appPassword);
        await sendApprovalMail(
            admin.email,
            decryptedPassword,
            student.studentEmail,
            student.name,
            student.rollno,
            student.subjects
        );
    }
});
app.post("/admin/:id/disapprove", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let { studentId, appId, disMsg } = req.body;
    let admin = await Admin.findById(id);
    if (admin) {
        const student = await Student.findById(studentId);
        const appli = await Application.findById(appId).populate("subjects");
        const decryptedPassword = decrypt(admin.appPassword);
        console.log(disMsg);
        await sendDisapprovalMail(
            admin.email,
            decryptedPassword,
            student.studentEmail,
            student.name,
            student.rollno,
            appli.subjects,
            disMsg
        );
        return res.status(200).json({
            success: true,
            message: "Student are notified through mail"
        })
    }
});
//get approved application
app.get("/admin/:id/approvedapplication", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    if (admin) {
        const application = await Application.find({ department: admin.department, formStatus: "Approved" }).populate("subjects");
        res.render("admins/approvedApp.ejs", { application, admin, state: 'admin' });
    }
});

app.get("/admin/:id/floatedSubjects", isAuthAdmin, async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let floatedSubjects = await FloatedSubject.find({ floatedBy: admin.name });
    console.log(floatedSubjects);
})
//Available courses
app.get("/admin/:id/courses", isAuthAdmin, async (req, res) => {
    let subjects = await Subject.find({});
    let { id } = req.params;
    let admin = await Admin.findById(id);
    res.render("common/courses.ejs", { subjects, state: 'admin', admin });
});

app.get("/courses/:id", async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let student = await Student.findById(id);
    if (admin) {
        let subjects = await Subject.find({ department: admin.department });
        console.log(subjects);
        res.render("common/courses.ejs", { subjects, state: 'admin', admin });
    } else if (student) {
        let subjects = await Subject.find({ department: student.department });
        console.log(subjects);
        res.render("common/courses.ejs", { subjects, state: 'student', student });
    } else {
        console.log("Not correct  id")
    }
});





//offered Courses
app.listen(8000, () => {
    console.log("server is running");
});