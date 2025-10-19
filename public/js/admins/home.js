function floatedCourses() {
    const container = document.getElementById("semesterContainer");
    container.style.display = (container.style.display === "none") ? "block" : "none";
}
const submitBtn=document.getElementById("submitSubjects");
document.getElementById("formSub").addEventListener("click",async function(e){
    e.preventDefault();
    const form = document.querySelector("form");
    const semester = form.elements["semester"].value;
    console.log(semester);
    let studentId = document.body.getAttribute("data-student-id");
    try{
        console.log(studentId);
        const response=await fetch(`https://student-admin-registration.onrender.com/student/${studentId}/subjects?semester=${semester}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const data=await response.json();
        if (response.ok) {
             const subjectsContainer = document.getElementById("subjectContainer");
             if (!subjectsContainer) return toastr.error("Subject container not found!");

             subjectsContainer.innerHTML = "";
            console.log(data.subjects[0]);
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
})

let floatform=document.getElementById("submitSub");
let studentId = document.body.getAttribute("data-student-id");
floatform.addEventListener("submit",async function(e) {
    e.preventDefault();
    const formData=new FormData(this);
    const selectedSubjects = [];
    document.querySelectorAll('input[name="selectedSubjects"]:checked').forEach((checkbox) => {
        selectedSubjects.push(checkbox.value);
    });
    console.log(selectedSubjects);
    const userData={
        selectedSubjects:selectedSubjects
    };
    try{
        const response=await fetch(`https://student-admin-registration.onrender.com/student/${studentId}/application`, {
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
    
});