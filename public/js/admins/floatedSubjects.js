toastr.options = {
    "positionClass": "toast-top-center"
  };
function togglePreviousSubjects() {
    const section = document.getElementById("previousSubjects");
    section.style.display = (section.style.display === "none") ? "block" : "none";
}

function addNewSubject() {
    const container = document.getElementById("newSubjectsContainer");
    const html = `
        <div class="new-subject">
            <input type="text" name="title" placeholder="Title" required>
            <input type="text" name="courseCode" placeholder="Course Code" required>
            <input type="text" name="credit" placeholder="credit" required>
            <input type="text" name="category" placeholder="category" required>
            <input type="text" name="slot" placeholder="Slot" required>
        </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
}

let floatform=document.getElementById("floatform");
let adminId = document.body.getAttribute("data-admin-id");
floatform.addEventListener("submit",async function(e) {
    e.preventDefault();
    const formData=new FormData(this);
    const selectedSubjects = [];
    document.querySelectorAll('input[name="selectedSubjects"]:checked').forEach((checkbox) => {
        selectedSubjects.push(checkbox.value);
    });
    const userData={
        title:formData.get("title"),
        courseCode:formData.get("courseCode"),
        department:formData.get("department"),
        category:formData.get("category"),
        credit:formData.get("credit"),
        slot:formData.get("slot"),
        semester:formData.get("semester"),
        selectedSubjects:selectedSubjects
    };
    try{
        const response=await fetch(`http://localhost:8000/admin/${adminId}/subjects`, {
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