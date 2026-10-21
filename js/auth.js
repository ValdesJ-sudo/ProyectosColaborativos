(() => {
	"use strict";

	const SESSION_KEY = "sercotecSimulationActive";
	const page = document.body.dataset.page;
	const loginForm = document.querySelector("#login-form");

	// Generate a replacement with: printf %s 'your-demo-password' | sha256sum
	// In PowerShell: ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes('your-demo-password'))) -replace '-', '').ToLowerInvariant()
	const DEMO_USERNAME = "estudiante";
	const DEMO_PASSWORD_SHA256 = "49f3d8868c31443a1480625fa17f71712baf105f310065874535571b874763fc";

	if (page !== "login" && sessionStorage.getItem(SESSION_KEY) !== "true") {
		window.location.replace("index.html");
		return;
	}

	document.querySelectorAll(".logout-button").forEach((button) => {
		button.addEventListener("click", () => {
			sessionStorage.removeItem(SESSION_KEY);
			sessionStorage.removeItem("sercotecSimulationData");
			sessionStorage.removeItem("sercotecSimulationFolio");
			window.location.replace("index.html");
		});
	});

	if (page === "login" && sessionStorage.getItem(SESSION_KEY) === "true") {
		window.location.replace("formulario.html");
		return;
	}

	if (!loginForm) return;

	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const error = document.querySelector("#login-error");
		const username = document.querySelector("#username").value.trim();
		const password = document.querySelector("#password").value;
		error.hidden = true;

		if (!username || !password) {
			error.textContent = "Ingresa tu usuario y contraseña para continuar.";
			error.hidden = false;
			return;
		}

		if (!window.crypto || !window.crypto.subtle) {
			error.textContent = "Este navegador no permite verificar el acceso de forma segura. Abre la página en un navegador actualizado.";
			error.hidden = false;
			return;
		}

		let passwordHash;
		try {
			const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
			passwordHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
		} catch {
			error.textContent = "No fue posible verificar el acceso. Actualiza el navegador e inténtalo nuevamente.";
			error.hidden = false;
			return;
		}
		if (username === DEMO_USERNAME && passwordHash === DEMO_PASSWORD_SHA256) {
			try {
				sessionStorage.setItem(SESSION_KEY, "true");
			} catch {
				error.textContent = "No fue posible guardar la sesión en esta pestaña. Revisa la configuración del navegador.";
				error.hidden = false;
				return;
			}
			window.location.assign("formulario.html");
			return;
		}

		error.textContent = "Usuario o contraseña incorrectos. Revisa tus credenciales de demostración.";
		error.hidden = false;
		document.querySelector("#password").value = "";
		document.querySelector("#password").focus();
	});
})();
