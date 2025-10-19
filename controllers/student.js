import Student from '../models/students.js';
import FloatedSubject from '../models/floatedSubjects.js';
import Subject from '../models/subjects.js';
import Application from '../models/submittedForm.js';
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';

const loginForm= (req, res) => {
    res.render("students/login.ejs", { state: 'login' });
};

//student login
const login= async (req, res) => {
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
};

//student register
export const registerForm= (req, res) => {
    res.render("students/register.ejs", { state: 'login' });
};

export const register= async (req, res) => {
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
};

//homepage
export const home=async (req, res) => {
    const student = await Student.findById(req.user.id);
    res.render("students/home.ejs", { student, state: 'studentt' });
};

//student profile
export const profile= async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id);
    res.render("students/profile.ejs", { student, state: 'studentt' });
};

//see the floated subjects
export const floatedSubjects= async (req, res) => {
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

};

//student submit application to admin
export const application=async (req, res) => {
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
};

//get ug courses
export const courses= async (req, res) => {
    let { id } = req.params;
    let subjects = await Subject.find({});
    let student = await Student.findById(id);
    res.render("common/coursesStudent.ejs", { subjects, state: 'student', student });
};

//Studnet get previous Activity
export const activity= async (req, res) => {
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
}
//student logout
export const logout =(req, res, next) => {
    // console.log("Logging off");
    res.clearCookie('student_jwt', { 
        httpOnly: true,
        path: "/student",
        secure: false,             // false for local dev, true for HTTPS
        expires: new Date(Date.now())});
        
    return res.redirect('/student'); // Or your login page   
};

const studentController={
    loginForm,
    login,
    registerForm,
    register,
    home, 
    profile,
    floatedSubjects,
    application,
    courses,
    activity,
    logout

}
export default studentController;