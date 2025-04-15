function floatedCourses() {
    const container = document.getElementById("semesterContainer");
    container.style.display = (container.style.display === "none") ? "block" : "none";
}
let backimgno = Math.floor(Math.random() * 6);
let urls = [
    "/images/Amy.jpg",
    "/images/BruceLee.jpg",
    "/images/Wayne.jpg",
    "/images/Miyagi.jpg",
    "/images/Pursue.jpg",
    "/images/Thomas.jpg",
];
document.body.style.backgroundImage = `url(${urls[backimgno]})`;
document.body.style.backgroundSize = "cover";
document.body.style.backgroundRepeat="no-repeat";

const submitBtn=document.getElementById("submitSubjects");
let studentId = document.body.getAttribute("data-student-id");
let getSubBtn=document.getElementById("getSub");
console.log("getSub:", getSubBtn); 
if(getSubBtn!==null){
    getSubBtn.addEventListener("click",async function(e){
        e.preventDefault();
        const form = document.querySelector("form");
        const semester = form.elements["semester"].value;
        
        try{
            const response=await fetch(`http://localhost:8000/student/${studentId}/subjects?semester=${semester}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data=await response.json();
            if (response.ok) {
                    const subjectsContainer = document.getElementById("subjectContainer");
                    if (!subjectsContainer) return toastr.error("Subject container not found!");
    
                    subjectsContainer.innerHTML = "";
                data.subjects[0].forEach(subject => {
                    const div = document.createElement("div");
                    div.classList.add("subject-box");
                    div.innerHTML = `
                        <input type="checkbox" name="selectedSubjects" value="${subject._id}">
                        <label>${subject.title} (${subject.courseCode})</label>
                        <hr/>
                    `;
                    subjectsContainer.appendChild(div);
                });
    
                subjectsContainer.style.display = "block";
                submitBtn.style.display="block";
            } else {
                toastr.error(data.message);
            }
        }catch(err){
            console.log(err);
        }
    });
}

document.getElementById("submitSubjects").addEventListener("click",async function(e){
    e.preventDefault();
    const selectedSubjects = [];
    const semester=document.querySelector('input[name="semester"]');
    console.log(semester.value);
    document.querySelectorAll('input[name="selectedSubjects"]:checked').forEach((checkbox) => {
        selectedSubjects.push(checkbox.value);
    });
    console.log(selectedSubjects);
    const userData={
        semester:semester.value,
        selectedSubjects:selectedSubjects
    };
    console.log(userData);
    try{
        const response=await fetch(`http://localhost:8000/student/${studentId}/application`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        const data=await response.json();
        if (response.ok) {
            toastr.success(data.message);
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 2000);
        } else {
            toastr.error(data.message);
        }
    }catch(err){
        console.log(err);
    }
})
