toastr.options = {
    "positionClass": "toast-top-center"
  };
let formreg=document.getElementById("formreg");

formreg.addEventListener("submit",async function(e){
    
    e.preventDefault();
    const formData=new FormData(this);
    const userData={
        name:formData.get("name"),
        department:formData.get("department"),
        email:formData.get("email"),
        password:formData.get("password"),
        appPassword:formData.get("appPassword"),
        phoneNo:formData.get("phoneNo"),
        designation:formData.get("designation"),
        collegepswd:formData.get("collegepswd")
    };
    console.log(userData);
    try{
        const response=await fetch("http://localhost:8000/admin/new", {
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

