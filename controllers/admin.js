import Admin from '../models/admins.js';
import FloatedSubject from '../models/floatedSubjects.js';
import Subject from '../models/subjects.js';
import Application from '../models/submittedForm.js';
import jwt from "jsonwebtoken";
import sendApprovalMail, { sendDisapprovalMail } from '../utils/sendEmail.js';
import { encrypt,decrypt} from "../utils/encryption.js";
import bcrypt from 'bcryptjs';
import Student from '../models/students.js'

//admin login
export const loginForm= (req, res) => {
    res.render("admins/login.ejs", { state: 'login' });
};

export const login= async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }

    const isAdmin = await Admin.findOne({ email });
    if (isAdmin) {

        const matchPassword = await bcrypt.compare(password, isAdmin.password);
        if (matchPassword) {
            const token = await jwt.sign({ id: isAdmin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

            return res.status(200).cookie("admin_jwt", token, {
                httpOnly: true,
                path: "/admin",
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
};
//admin register
export const registerForm= (req, res) => {
    res.render("admins/register.ejs", { state: 'login' });
};
export const register= async (req, res) => {
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
};
//homepage
export const home= async (req, res) => {
    const admin = await Admin.findById(req.user.id);
    res.render("admins/home.ejs", { admin, state: 'adminn' });
};

//admin profile
export const profile=async (req, res) => {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    res.render("admins/profile.ejs", { admin, state: 'adminn' });
};
//see registered student
export const students=async (req, res) => {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (admin) {
        const studentlist = await Student.find({ department: admin.department });
        res.render("admins/studentList.ejs", { studentlist, state: 'admin', admin });
    } else {
        console.log("Not an admin");
    }
};
//admin float-subjects
export const floatSubjectsForm=async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let subjects = await Subject.find({ department: admin.department });
    res.render("admins/floatSubjects.ejs", { subjects, admin, state: 'adminn' });
};
export const floatSubjects= async (req, res) => {
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
};
//get submitted application
export const applications=async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    if (admin) {
        const application = await Application.find({ department: admin.department, formStatus: "Not Approved" }).populate("subjects");
        res.render("admins/application.ejs", { application, admin, state: 'admin' });
    }
};
export const approved= async (req, res) => {
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
};
export const disapproved=async (req, res) => {
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
};
//get approved application
export const getApproved= async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    if (admin) {
        const application = await Application.find({ department: admin.department, formStatus: "Approved" }).populate("subjects");
        res.render("admins/approvedApp.ejs", { application, admin, state: 'admin' });
    }
};

export const floatedByAdmin= async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let floatedSubjects = await FloatedSubject.find({ floatedBy: admin.name });
    console.log(floatedSubjects);
}
//Available courses
export const courses=async (req, res) => {
    let subjects = await Subject.find({});
    let { id } = req.params;
    let admin = await Admin.findById(id);
    res.render("common/courses.ejs", { subjects, state: 'admin', admin });
};
export const logout =(req, res, next) => {
    // console.log("Logging off");
    res.clearCookie('admin_jwt', { 
        httpOnly: true,
        path: "/admin",
        secure: false,             // false for local dev, true for HTTPS
        expires: new Date(Date.now())});
        
    return res.redirect('/'); // Or your login page   
};
const adminController={
    loginForm,
    login,
    registerForm,
    register,
    home,
    profile,
    students,
    floatSubjectsForm,
    floatSubjects,
    applications,
    approved,
    disapproved,
    getApproved,
    floatedByAdmin,
    courses,
    logout
}

export default adminController;
