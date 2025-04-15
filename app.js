import express from "express";
import mongoose  from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Student from "./models/students.js";
import Admin from "./models/admins.js";
import Subject, { subjectSchema } from "./models/subjects.js";
import FloatedSubject from "./models/floatedSubjects.js";
import Application from "./models/submittedForm.js";
import bcrypt from "bcrypt";
import {config} from "dotenv";
config();
import sendApprovalMail from './utils/sendEmail.js';
import passport from "passport";
import session from "express-session";
import {Strategy} from "passport-google-oauth20";
import { encrypt } from "./utils/encryption.js";
import { decrypt } from "./utils/encryption.js";
import ejsMate from "ejs-mate";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
const MONGO_URL="mongodb://127.0.0.1:27017/CollegeWebsite";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname,"/public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs",ejsMate);
main().then(()=>{
    console.log("Connected to DB");
}).catch((err) =>{
    console.log(err);
})
async function main(){
    await mongoose.connect(MONGO_URL);
}
app.use(session({
    secret:"secret",
    resave:false,
    saveUninitialized:true
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
app.get("/",(req,res)=>{
    res.render("index.ejs",{ state: 'main'});
});

// login through GOOGLE
app.get("/student",(req,res)=>{
    res.render("students/login.ejs",{ state: 'main'});
});
app.get("/auth/google/student", passport.authenticate("google", {
    scope: ["profile", "email"],
    state: "student"
}));
app.get("/auth/google/admin", passport.authenticate("google", {
    scope: ["profile", "email"],
    state: "admin"
}));
app.get("/auth/google/callback", passport.authenticate("google", {
    failureRedirect: "/newStudent",
}), (req, res) => {
    if (req.user.role === 'student') {
        res.redirect(`/student/${req.user.user._id}`);
    } else if (req.user.role === 'admin') {
        res.redirect(`/admin/${req.user.user._id}`);
    } else {
        res.redirect('/');
    }
});

//student login
app.post("/student", async (req,res)=>{
    const {studentEmail,password}=req.body;
    if(!studentEmail || !password){
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const isStudent=await Student.findOne({studentEmail:studentEmail});
    if(isStudent){
        const matchPassword=await bcrypt.compare(password,isStudent.password);
        if(matchPassword){
            return res.status(200).json({
                success: true,
                message: "Login successfully!",
                redirect:`/student/${isStudent._id}`
            });
        }else{
            return res.status(400).json({
                success: false,
                message: "Wrong password! Please enter correct one."
            });
        }
       
    }else{
        res.status(400).json({
            success: false,
            message: "You have not registered!"
        });
    }   
});

//student register
app.get("/newStudent",(req,res)=>{
    res.render("students/register.ejs",{state: 'main'});
});

app.post("/newStudent", async (req,res)=>{
    const {name,id,rollno,currSemester,department,password,fatherName,permanentAddress,parentMobNo,parentEmail,presentAddress,studentNo,studentEmail}=req.body;
    const nitukEmailRegex = /^[a-zA-Z0-9._%+-]+@nituk\.ac\.in$/;
    if (!nitukEmailRegex.test(studentEmail)) {
        return res.status(400).json({
            success:false,
            message:"Sorry this is only for NIT Uttarakhand Students"
        });
    }
    if(!name || !id || !studentEmail || !rollno){
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const isStudent=await Student.findOne({studentEmail:studentEmail});
    if(isStudent){
       return res.status(400).json({
            success: false,
            message: "You have already registered!"
        });
    }else{
        const hashedPassword= await bcrypt.hash(password,10);
        await Student.create({name,id,rollno,currSemester,department,password:hashedPassword,fatherName,permanentAddress,parentMobNo,parentEmail,presentAddress,studentNo,studentEmail});
        res.status(200).json({
            success: true,
            message: "Registered Successfully!",
            redirect:"/student"
        });
    }   
});

//homepage
app.get("/student/:id",async (req,res)=>{
    const {id}=req.params;
    const student=await Student.findById(id);
    res.render("students/home.ejs",{student,state: 'studentt'});
});
//student profile
app.get("/student/:id/profile",async (req,res)=>{
    const {id}=req.params;
    const student=await Student.findById(id);
    res.render("students/profile.ejs",{student,state: 'studentt'});
});

//see the floated subjects
app.get("/student/:id/subjects",async(req,res)=>{
    let {id}=req.params;
    let {semester}=req.query;
    try{
        // console.log(id);
        let student=await Student.findById(id);
        if(student){
            const floatedsubjects=await FloatedSubject.find({department:student.department,semester:semester}).populate("subjectId");;
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
                message:"Current semester subjects"
            });
           
        }else{
            res.status(400).json({
                success:false,
                message:"You have not registered."
            });
    }
    }catch(err){
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
        });
    }
   
});

//student submit application to admin
app.post("/student/:id/application",async(req,res)=>{
    let {semester,selectedSubjects}=req.body;
    let chosenSubjects=await Subject.find({_id:{$in:selectedSubjects}});
    console.log(chosenSubjects);
    try{
        let {id}=req.params;
        let isStudent=await Student.findById(id);
        if(chosenSubjects.length<=0){
           return res.status(401).json({
                success:false,
                message:"you have not selected any subject"
            })
        }
        if(isStudent){
            await Application.create({
                id:isStudent._id,
                name:isStudent.name,
                rollno:isStudent.rollno,
                department:isStudent.department,
                semester:isStudent.semester,
                subjects:chosenSubjects,
                semester:semester
            });
            res.status(200).json({
                success:true,
                message:"Application submitted successfully",
                redirect:`/student/${isStudent._id}`
            })
        }else{
            res.status(401).json({
                success:false,
                message:"You have not registered",
            })
        }

    }catch(err){
        console.log(err);
    }
});

//get ug courses
app.get("/student/:id/courses",async (req,res)=>{
    let {id}=req.params;
    let subjects= await Subject.find({});
    console.log("student");
    let student= await Student.findById(id);
    res.render("common/coursesStudent.ejs",{subjects,state: 'student',student});
});

//admin login
app.get("/admin",(req,res)=>{
res.render("admins/login.ejs",{state: 'main'});
});

app.post("/admin", async (req,res)=>{
    const {email,password}=req.body;
    if(!email || !password){
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const isAdmin=await Admin.findOne({email:email});
    if(isAdmin){
        const matchPassword=await bcrypt.compare(password,isAdmin.password);
        if(matchPassword){
            return res.status(200).json({
                success: true,
                message: "Login successfully!",
                redirect:`/admin/${isAdmin._id}`
            });
        }else{
            return res.status(400).json({
                success: false,
                message: "Wrong password! Please enter correct one."
            });
        }
       
    }else{
        res.status(400).json({
            success: false,
            message: "You have not registered!"
        });
    }   
});
//admin register
app.get("/newAdmin",(req,res)=>{
    res.render("admins/register.ejs",{state: 'main'});
});
app.post("/newAdmin", async (req,res)=>{
    const {name,department,email,password,appPassword,phoneNo,designation,collegepswd}=req.body;
    // console.log(admin);
    if(!name || !department || !email || !password || !appPassword){
        return res.status(400).json({
            success: false,
            message: "Please fill the required details!"
        });
    }
    const nitukEmailRegex = /^[a-zA-Z0-9._%+-]+@nituk\.ac\.in$/;
    if (!nitukEmailRegex.test(email)) {
        return res.status(400).json({
            success:false,
            message:"Sorry this is only for NIT Uttarakhand HODs"
        });
    }
    const isAdmin=await Admin.findOne({email:email});
    if(isAdmin){
       return res.status(400).json({
            success: false,
            message: "You have already registered!"
        });
    }else{
        const pswd="NITUK";
        if(req.body.collegepswd===pswd){
            const hashedPassword= await bcrypt.hash(password,10);
            const hashedPswd= encrypt(appPassword);
            await Admin.create({name,department,email,password:hashedPassword,appPassword:hashedPswd,phoneNo,designation,collegepswd});
            res.status(200).json({
                success: true,
                message: "Registered Successfully!",
                redirect:"/admin"
            });
        }else{
            res.status(400).json({
                success: false,
                message: "Incorrect college password",
            });
        }
        
    }   
});
//homepage
app.get("/admin/:id",async (req,res)=>{
    const {id}=req.params;
    const admin=await Admin.findById(id);
    res.render("admins/home.ejs",{admin,state: 'adminn'});
});

//admin profile
app.get("/admin/:id/profile",async (req,res)=>{
    const {id}=req.params;
    const admin=await Admin.findById(id);
    res.render("admins/profile.ejs",{admin,state: 'adminn'});
});
//see registered student
app.get("/admin/:id/registered",async (req,res) => {
    const {id}=req.params;
    const admin=await Admin.findById(id);
    if(admin){
        const studentlist=await Student.find({department:admin.department});
        res.render("admins/studentList.ejs",{studentlist,state: 'admin'});
    }else{
        console.log("Not an admin");
    }   
});
//admin float-subjects
app.get("/admin/:id/subjects",async(req,res)=>{
    let {id}=req.params;
    let admin=await Admin.findById(id);
    let subjects= await Subject.find({department:admin.department});
    res.render("admins/floatSubjects.ejs",{subjects ,admin,state: 'adminn'});
});
app.post("/admin/:id/subjects",async(req,res)=>{
    const { title, courseCode,department,category,credit,slot,semester, selectedSubjects} = req.body;
    let {id}=req.params;
    let floated = [];
   try{
    let admin=await Admin.findById(id);
    if(department!==admin.department){
        return res.status(401).json({
            success:false,
            message:"You cannot float subjects for that department which not belongs to you"
        });
    }
    if(selectedSubjects && Array.isArray(selectedSubjects)){
        floated.push(...selectedSubjects);
    }else  if (selectedSubjects){
        floated.push(selectedSubjects);
    }
    if (title && courseCode) {
        let existing = await Subject.findOne({ courseCode: courseCode });

        if (!existing) {
            const newSub = await Subject.create({ title, courseCode, department, category, credit, slot });
            floated.push(newSub._id.toString());
        } else {
            return res.status(400).json({ message: "Subject with same course code already exists." });
        }
    }
   
        console.log(floated);
        await FloatedSubject.create({
            floatedBy: admin.name,
            semester: semester,
            department:department,
            subjectId: floated,
        });

        res.status(200).json({ 
            success:true,
            message: "Subjects floated successfully!", 
            redirect: `/admin/${id}`});
   }catch(err){
        console.error(err);
        res.status(500).json({ message: "Error floating subjects" });
   }
});
//get submitted application
app.get("/admin/:id/application",async(req,res)=>{
 let {id}=req.params;
 let admin=await Admin.findById(id);
 if(admin){
    const application=await Application.find({department:admin.department,formStatus:"Not Approved"});
    res.render("admins/application.ejs",{application,admin,state: 'admin'});
 }
});
app.post("/admin/:id/approve",async(req,res)=>{
    let {id}=req.params;
    let {studentId,appId}=req.body;
    let admin=await Admin.findById(id);
    if(admin){
        const appli=await Application.findByIdAndUpdate(appId,{formStatus:"Approved"},{ new: true });
        
        const student=await Student.findByIdAndUpdate(studentId,
            {currSemester:appli.semester,formStatus:appli.formStatus,subjects:appli.subjects,activity:appli},
            { new: true });
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

//get approved application
app.get("/admin/:id/approvedapplication",async(req,res)=>{
    let {id}=req.params;
    let admin=await Admin.findById(id);
    if(admin){
       const application=await Application.find({department:admin.department,formStatus:"Approved"});
       res.render("admins/approvedApp.ejs",{application,admin,state: 'admin'});
    }
   });

app.get("/admin/:id/courses",async (req,res)=>{
    let subjects= await Subject.find({});
    res.render("common/courses.ejs",{subjects,state: 'admin'});
});
//Available courses
app.get("/courses",async (req,res)=>{
    let subjects= await Subject.find({});
    res.render("common/courses.ejs",{subjects,state: 'course'});
});
app.get("/courses/:id",async (req,res)=>{
    let {id}=req.params;
    let admin=await Admin.findById(id);
    let student=await Student.findById(id);
    if(admin){
        let subjects= await Subject.find({department:admin.department});
        console.log(subjects);
        res.render("common/courses.ejs",{subjects,state: 'admin',admin});
    }else if(student){
        let subjects= await Subject.find({department:student.department});
        console.log(subjects);
        res.render("common/courses.ejs",{subjects,state: 'student',student});
    }else{
        console.log("Not correct  id")
    }     
});
//offered Courses
app.listen(8000,()=>{
    console.log("server is running");
});