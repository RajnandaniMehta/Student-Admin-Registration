import jwt from "jsonwebtoken";
import Student from "../models/students.js";
import Admin from "../models/admins.js";

export const isAuth = async (req, res, next) => {
    const token = req.cookies.student_jwt;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not Authenticated",
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'student') return res.status(404).json({
            success: false,
            message: "You are not student",
        });
        const {id}=req.params;
        if(id!==decoded.id){
            return res.redirect("/student");
        }
        const student = await Student.findById(decoded.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

export const isAuthAdmin = async (req, res, next) => {
    const token= req.cookies.admin_jwt;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not Authenticated",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(404).json({
            success: false,
            message: "You are not admin",
        });
        const {id}=req.params;
        if(id!==decoded.id){
            return res.redirect("/admin");
        }
        const admin = await Admin.findById(decoded.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

