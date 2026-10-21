(() => {
	"use strict";

	const SESSION_DATA_KEY = "sercotecSimulationData";
	const SESSION_FOLIO_KEY = "sercotecSimulationFolio";
	const page = document.body.dataset.page;
	const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

	const escapeForText = (value) => String(value ?? "").trim();
	const formatCurrency = (value) => currency.format(Number(value) || 0);

	function appendSummaryGroup(container, heading, entries) {
		const group = document.createElement("section");
		group.className = "summary-group";
		const title = document.createElement("h4");
		title.textContent = heading;
		group.append(title);
		const list = document.createElement("dl");
		entries.forEach(([label, value]) => {
			const term = document.createElement("dt");
			const description = document.createElement("dd");
			term.textContent = label;
			description.textContent = escapeForText(value) || "—";
			list.append(term, description);
		});
		group.append(list);
		container.append(group);
	}

	function isValidRut(value) {
		const rut = value.replace(/[.\s]/g, "").toUpperCase();
		if (!/^\d{7,8}-[\dK]$/.test(rut)) return false;
		const [body, verifier] = rut.split("-");
		let sum = 0;
		let multiplier = 2;
		for (let index = body.length - 1; index >= 0; index -= 1) {
			sum += Number(body[index]) * multiplier;
			multiplier = multiplier === 7 ? 2 : multiplier + 1;
		}
		const remainder = 11 - (sum % 11);
		const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
		return verifier === expected;
	}

	function initializeApplication() {
		const form = document.querySelector("#application-form");
		if (!form) return;

		const steps = Array.from(document.querySelectorAll(".form-step"));
		const indicators = Array.from(document.querySelectorAll(".step-indicators li"));
		const previousButton = document.querySelector("#previous-step");
		const nextButton = document.querySelector("#next-step");
		const submitButton = document.querySelector("#submit-application");
		const progress = document.querySelector("#progress-track");
		const progressFill = document.querySelector("#progress-fill");
		const progressTitle = document.querySelector("#step-title");
		const progressPercent = document.querySelector("#progress-percent");
		const rowContainer = document.querySelector("#investment-rows");
		const totalOutput = document.querySelector("#investment-total");
		const summary = document.querySelector("#application-summary");
		const region = document.querySelector("#region");
		const commune = document.querySelector("#commune");
		const description = document.querySelector("#project-description");
		const stepNames = ["Persona postulante", "Empresa o negocio", "Proyecto", "Plan de inversión", "Declaraciones y revisión"];
		let currentStep = 0;

		const communesByRegion = {
			"Arica y Parinacota": ["Arica", "Putre"],
			"Tarapacá": ["Iquique", "Alto Hospicio"],
			"Antofagasta": ["Antofagasta", "Calama"],
			"Atacama": ["Copiapó", "Vallenar"],
			"Coquimbo": ["La Serena", "Coquimbo"],
			"Valparaíso": ["Valparaíso", "Viña del Mar"],
			"Metropolitana de Santiago": ["Santiago", "Puente Alto", "Maipú"],
			"Libertador General Bernardo O'Higgins": ["Rancagua", "San Fernando"],
			"Maule": ["Talca", "Curicó"],
			"Ñuble": ["Chillán", "San Carlos"],
			"Biobío": ["Concepción", "Los Ángeles"],
			"La Araucanía": ["Temuco", "Villarrica"],
			"Los Ríos": ["Valdivia", "La Unión"],
			"Los Lagos": ["Puerto Montt", "Osorno"],
			"Aysén del General Carlos Ibáñez del Campo": ["Coyhaique", "Aysén"],
			"Magallanes y de la Antártica Chilena": ["Punta Arenas", "Puerto Natales"]
		};

		function updateCommunes() {
			const options = communesByRegion[region.value] || [];
			commune.replaceChildren();
			const placeholder = document.createElement("option");
			placeholder.value = "";
			placeholder.textContent = options.length ? "Selecciona una comuna" : "Primero selecciona una región";
			commune.append(placeholder);
			options.forEach((name) => {
				const option = document.createElement("option");
				option.value = name;
				option.textContent = name;
				commune.append(option);
			});
			commune.disabled = options.length === 0;
		}
		region.addEventListener("change", updateCommunes);

		function updateDescriptionCount() {
			document.querySelector("#description-count").textContent = `${description.value.length} de 600 caracteres`;
		}
		description.addEventListener("input", updateDescriptionCount);

		function updateTotal() {
			const total = Array.from(rowContainer.querySelectorAll(".investment-amount"))
				.reduce((sum, input) => sum + (Number(input.value) || 0), 0);
			totalOutput.textContent = formatCurrency(total);
			return total;
		}

		function addInvestmentRow() {
			const row = document.createElement("tr");
			row.innerHTML = `
				<td><label class="sr-only">Nombre del ítem</label><input class="investment-item" aria-label="Nombre del ítem" required maxlength="80"></td>
				<td><label class="sr-only">Descripción del ítem</label><input class="investment-description" aria-label="Descripción del ítem" required maxlength="180"></td>
				<td><label class="sr-only">Monto del ítem en pesos</label><input class="investment-amount" aria-label="Monto del ítem en pesos" type="number" min="1" step="1" inputmode="numeric" required></td>
				<td><label class="sr-only">Categoría del ítem</label><select class="investment-category" aria-label="Categoría del ítem" required><option value="">Selecciona</option><option>Activos</option><option>Capital de trabajo</option><option>Marketing y difusión</option><option>Asesoría</option><option>Otro</option></select></td>
				<td><button class="button button-remove remove-investment" type="button" aria-label="Eliminar ítem">Eliminar</button></td>`;
			row.querySelector(".investment-amount").addEventListener("input", updateTotal);
			row.querySelector(".remove-investment").addEventListener("click", () => {
				row.remove();
				updateTotal();
			});
			rowContainer.append(row);
		}

		document.querySelector("#add-investment").addEventListener("click", addInvestmentRow);
		addInvestmentRow();

		function collectData() {
			const value = (id) => document.getElementById(id).value.trim();
			return {
				applicant: {
					name: value("applicant-name"),
					rut: value("applicant-rut"),
					email: value("applicant-email"),
					phone: value("applicant-phone"),
					region: value("region"),
					commune: value("commune")
				},
				business: {
					name: value("business-name"),
					rut: value("business-rut"),
					sector: value("business-sector"),
					startDate: value("start-date"),
					size: value("business-size"),
					annualSales: value("annual-sales")
				},
				project: {
					name: value("project-name"),
					description: value("project-description"),
					goal: value("project-goal"),
					requestedAmount: value("requested-amount"),
					ownContribution: value("own-contribution")
				},
				investments: Array.from(rowContainer.querySelectorAll("tr"), (row) => ({
					item: row.querySelector(".investment-item").value.trim(),
					description: row.querySelector(".investment-description").value.trim(),
					amount: row.querySelector(".investment-amount").value,
					category: row.querySelector(".investment-category").value
				})),
				investmentTotal: updateTotal(),
				files: Array.from(document.querySelector("#supporting-files").files, (file) => file.name),
				declarations: {
					fictitiousData: form.elements.declarationTruth.checked,
					educationalUse: form.elements.declarationTerms.checked
				}
			};
		}

		function renderSummary(container, data) {
			container.replaceChildren();
			appendSummaryGroup(container, "Persona postulante", [
				["Nombre", data.applicant.name], ["RUT", data.applicant.rut],
				["Correo", data.applicant.email], ["Teléfono", data.applicant.phone],
				["Región", data.applicant.region], ["Comuna", data.applicant.commune]
			]);
			appendSummaryGroup(container, "Empresa o negocio", [
				["Nombre", data.business.name], ["RUT", data.business.rut],
				["Rubro", data.business.sector], ["Inicio de actividades", data.business.startDate],
				["Tamaño", data.business.size], ["Ventas anuales aproximadas", formatCurrency(data.business.annualSales)]
			]);
			appendSummaryGroup(container, "Proyecto", [
				["Nombre", data.project.name], ["Descripción", data.project.description], ["Objetivo", data.project.goal],
				["Monto solicitado", formatCurrency(data.project.requestedAmount)],
				["Aporte propio", formatCurrency(data.project.ownContribution)]
			]);

			const investmentGroup = document.createElement("section");
			investmentGroup.className = "summary-group";
			const investmentHeading = document.createElement("h4");
			investmentHeading.textContent = "Plan de inversión";
			investmentGroup.append(investmentHeading);
			const investmentList = document.createElement("ul");
			data.investments.forEach((item) => {
				const entry = document.createElement("li");
				entry.textContent = `${item.item}: ${item.description} · ${item.category} · ${formatCurrency(item.amount)}`;
				investmentList.append(entry);
			});
			investmentGroup.append(investmentList);
			const investmentTotal = document.createElement("p");
			investmentTotal.className = "summary-total";
			investmentTotal.textContent = `Total: ${formatCurrency(data.investmentTotal)}`;
			investmentGroup.append(investmentTotal);
			container.append(investmentGroup);

			appendSummaryGroup(container, "Archivos seleccionados (no enviados)", [
				["Nombres de archivo", data.files.length ? data.files.join(", ") : "Ninguno"]
			]);
			appendSummaryGroup(container, "Declaraciones", [
				["Información ficticia para uso educativo", data.declarations.fictitiousData ? "Confirmada" : "No confirmada"],
				["Actividad no oficial y sin envío", data.declarations.educationalUse ? "Confirmada" : "No confirmada"]
			]);
		}

		function showStep(index) {
			currentStep = index;
			steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
			indicators.forEach((indicator, stepIndex) => {
				indicator.classList.toggle("current", stepIndex === currentStep);
				indicator.classList.toggle("complete", stepIndex < currentStep);
				if (stepIndex === currentStep) indicator.setAttribute("aria-current", "step");
				else indicator.removeAttribute("aria-current");
			});
			const number = currentStep + 1;
			const text = `Paso ${number} de ${steps.length}: ${stepNames[currentStep]}`;
			progress.setAttribute("aria-valuenow", String(number));
			progress.setAttribute("aria-valuetext", text);
			progressTitle.textContent = text;
			progressPercent.textContent = `${Math.round((number / steps.length) * 100)} %`;
			progressFill.style.width = `${(number / steps.length) * 100}%`;
			previousButton.disabled = currentStep === 0;
			nextButton.hidden = currentStep === steps.length - 1;
			submitButton.hidden = currentStep !== steps.length - 1;
			if (currentStep === steps.length - 1) renderSummary(summary, collectData());
			document.querySelector(`#step-${number}-heading`).focus?.();
			window.scrollTo({ top: 0, behavior: "smooth" });
		}

		function validateCurrentStep() {
			const activeStep = steps[currentStep];
			if (currentStep === 3 && rowContainer.querySelectorAll("tr").length === 0) {
				const error = document.querySelector("#investment-error");
				error.textContent = "Agrega al menos un ítem al plan de inversión.";
				error.hidden = false;
				document.querySelector("#add-investment").focus();
				return false;
			}
			const controls = Array.from(activeStep.querySelectorAll("input, select, textarea"));
			for (const control of controls) {
				if (control.id === "applicant-rut" || control.id === "business-rut") {
					control.setCustomValidity(control.value && !isValidRut(control.value) ? "Ingresa un RUT válido, incluyendo su dígito verificador." : "");
				}
				if (!control.checkValidity()) {
					control.reportValidity();
					control.focus();
					return false;
				}
			}
			const investmentError = document.querySelector("#investment-error");
			if (investmentError) investmentError.hidden = true;
			return true;
		}

		previousButton.addEventListener("click", () => showStep(Math.max(0, currentStep - 1)));
		nextButton.addEventListener("click", () => {
			if (validateCurrentStep()) showStep(Math.min(steps.length - 1, currentStep + 1));
		});

		["applicant-rut", "business-rut"].forEach((id) => {
			const input = document.getElementById(id);
			input.addEventListener("input", () => input.setCustomValidity(""));
		});

		form.addEventListener("submit", (event) => {
			event.preventDefault();
			const error = document.querySelector("#submit-error");
			error.hidden = true;
			if (!validateCurrentStep()) return;

			const data = collectData();
			const year = new Date().getFullYear();
			const folio = `SIM-${year}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
			try {
				sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data));
				sessionStorage.setItem(SESSION_FOLIO_KEY, folio);
			} catch {
				error.textContent = "No fue posible guardar el resumen en esta pestaña. Revisa el almacenamiento del navegador e inténtalo nuevamente.";
				error.hidden = false;
				return;
			}
			window.location.assign("confirmacion.html");
		});
	}

	function initializeConfirmation() {
		const folio = sessionStorage.getItem(SESSION_FOLIO_KEY);
		const serializedData = sessionStorage.getItem(SESSION_DATA_KEY);
		if (!folio || !serializedData) {
			window.location.replace("formulario.html");
			return;
		}

		let data;
		try {
			data = JSON.parse(serializedData);
		} catch {
			sessionStorage.removeItem(SESSION_DATA_KEY);
			sessionStorage.removeItem(SESSION_FOLIO_KEY);
			window.location.replace("formulario.html");
			return;
		}
		if (!data || !data.applicant || !data.business || !data.project || !Array.isArray(data.investments) || !Array.isArray(data.files) || !data.declarations) {
			sessionStorage.removeItem(SESSION_DATA_KEY);
			sessionStorage.removeItem(SESSION_FOLIO_KEY);
			window.location.replace("formulario.html");
			return;
		}

		document.querySelector("#confirmation-folio").textContent = folio;
		const container = document.querySelector("#confirmation-summary-content");
		appendSummaryGroup(container, "Persona postulante", [
			["Nombre", data.applicant.name], ["RUT", data.applicant.rut],
			["Correo", data.applicant.email], ["Teléfono", data.applicant.phone],
			["Región", data.applicant.region], ["Comuna", data.applicant.commune]
		]);
		appendSummaryGroup(container, "Empresa o negocio", [
			["Nombre", data.business.name], ["RUT", data.business.rut],
			["Rubro", data.business.sector], ["Inicio de actividades", data.business.startDate],
			["Tamaño", data.business.size], ["Ventas anuales aproximadas", formatCurrency(data.business.annualSales)]
		]);
		appendSummaryGroup(container, "Proyecto", [
			["Nombre", data.project.name], ["Descripción", data.project.description], ["Objetivo", data.project.goal],
			["Monto solicitado", formatCurrency(data.project.requestedAmount)],
			["Aporte propio", formatCurrency(data.project.ownContribution)]
		]);
		const investmentGroup = document.createElement("section");
		investmentGroup.className = "summary-group";
		const title = document.createElement("h4");
		title.textContent = "Plan de inversión";
		const list = document.createElement("ul");
		data.investments.forEach((item) => {
			const entry = document.createElement("li");
			entry.textContent = `${item.item}: ${item.description} · ${item.category} · ${formatCurrency(item.amount)}`;
			list.append(entry);
		});
		const total = document.createElement("p");
		total.className = "summary-total";
		total.textContent = `Total: ${formatCurrency(data.investmentTotal)}`;
		investmentGroup.append(title, list, total);
		container.append(investmentGroup);
		appendSummaryGroup(container, "Archivos seleccionados (no enviados)", [
			["Nombres de archivo", data.files.length ? data.files.join(", ") : "Ninguno"]
		]);
		appendSummaryGroup(container, "Declaraciones", [
			["Información ficticia para uso educativo", data.declarations.fictitiousData ? "Confirmada" : "No confirmada"],
			["Actividad no oficial y sin envío", data.declarations.educationalUse ? "Confirmada" : "No confirmada"]
		]);
	}

	if (page === "application") initializeApplication();
	if (page === "confirmation") initializeConfirmation();
})();
