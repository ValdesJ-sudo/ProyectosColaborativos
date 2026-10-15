const form = document.querySelector("#business-form");
const successMessage = document.querySelector("#success-message");

form.addEventListener("submit", (event) => {
	event.preventDefault();
	if (!form.reportValidity()) return;
	successMessage.classList.add("visible");
	successMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
