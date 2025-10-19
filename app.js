import express from "express";
import mongoose from "mongoose";
import path from "path";
import "dotenv/config";
import { fileURLToPath } from "url";
import ejsMate from "ejs-mate";
import cookieParser from "cookie-parser";
import Student from "./models/students.js";
import Admin from "./models/admins.js";
import Subject from "./models/subjects.js";
import studentRouter from "./routes/student.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const MONGO_URL = process.env.ATLASDB_URL;

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
    await mongoose.connect(MONGO_URL,{dbName:"NIT_UTTARAKHAND"});
}

app.get("/", (req, res) => {
    res.render("index.ejs", { state: 'main' });
});

app.use("/student", studentRouter);
app.use("/admin", adminRouter);
app.use("/auth",authRouter);

app.get("/courses/:id", async (req, res) => {
    let { id } = req.params;
    let admin = await Admin.findById(id);
    let student = await Student.findById(id);
    if (admin) {
        let subjects = await Subject.find({ department: admin.department });
        // console.log(subjects);
        res.render("common/courses.ejs", { subjects, state: 'admin', admin });
    } else if (student) {
        let subjects = await Subject.find({ department: student.department });
        // console.log(subjects);
        res.render("common/courses.ejs", { subjects, state: 'student', student });
    } else {
        console.log("Not correct  id")
    }
});

app.listen(8000, () => {
    console.log("server is running");
});