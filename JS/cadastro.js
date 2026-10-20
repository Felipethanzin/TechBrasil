"use strict";

const API_BASE_URL = "/api";
const MINIMUM_AGE = 13;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const form = document.getElementById("signup-form");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll("[data-indicator]")];
const progressFill = document.getElementById("progress-fill");
const stepCaption = document.getElementById("step-caption");
const stepTitle = document.getElementById("signup-title");
const stepDescription = document.getElementById("step-description");
const alertBox = document.getElementById("form-alert");
const successBox = document.getElementById("form-success");

const fields = {
    fullName: document.getElementById("input-fullname"),
    username: document.getElementById("input-username"),
    email: document.getElementById("input-email"),
    password: document.getElementById("input-password"),
    terms: document.getElementById("input-terms"),
    birthDate: document.getElementById("input-birthdate"),
    phone: document.getElementById("input-phone"),
    code: document.getElementById("input-verification-code"),
    picture: document.getElementById("input-profile-picture")
};

const state = {
    step: 1,
    challengeId: null,
    verified: false,
    avatar: null,
    avatarPreviewUrl: null,
    busy: false
};

const stepContent = {
    1: ["ETAPA 01 DE 05", "Crie sua conta", "Comece preenchendo seus dados."],
    2: ["ETAPA 02 DE 05", "Sua data de nascimento", "Só precisamos confirmar sua faixa etária."],
    3: ["ETAPA 03 DE 05", "Verifique seu celular", "Vamos confirmar seu número de telefone."],
    4: ["ETAPA 04 DE 05", "Confirme seu número", "Digite o código de verificação recebido."],
    5: ["ETAPA 05 DE 05", "Quase tudo pronto!", "Personalize seu perfil de desenvolvedor."]
};

document.getElementById("current-year").textContent = new Date().getFullYear();

function showStep(number) {
    state.step = number;
    clearMessages();

    steps.forEach((step) => {
        const active = Number(step.dataset.step) === number;
        step.hidden = !active;
        step.classList.toggle("active", active);
    });

    indicators.forEach((indicator) => {
        const index = Number(indicator.dataset.indicator);
        indicator.classList.toggle("active", index === number);
        indicator.classList.toggle("done", index < number);
    });

    progressFill.style.width = `${number * 20}%`;
    stepCaption.textContent = stepContent[number][0];
    stepTitle.textContent = stepContent[number][1];
    stepDescription.textContent = stepContent[number][2];

    const card = document.querySelector(".form-card");
    if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function showError(id, message) {
    const element = document.getElementById(`error-${id}`);
    if (element) element.textContent = message;

    const input = document.getElementById(
        id === "fullname" ? "input-fullname" :
        id === "username" ? "input-username" :
        id === "email" ? "input-email" :
        id === "password" ? "input-password" :
        id === "birthdate" ? "input-birthdate" :
        id === "phone" ? "input-phone" :
        id === "code" ? "input-verification-code" :
        id === "picture" ? "input-profile-picture" : ""
    );

    if (input) {
        input.setAttribute("aria-invalid", message ? "true" : "false");
        input.closest(".input-wrap")?.classList.toggle("invalid", Boolean(message));
    }
}

function clearFieldErrors() {
    [
        "fullname", "username", "email", "password",
        "birthdate", "phone", "code", "picture"
    ].forEach((id) => showError(id, ""));
}

function clearMessages() {
    alertBox.hidden = true;
    alertBox.textContent = "";
    successBox.hidden = true;
    successBox.textContent = "";
    clearFieldErrors();
}

function showAlert(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showSuccess(message) {
    successBox.textContent = message;
    successBox.hidden = false;
}

function setBusy(button, busy, label = "Processando...") {
    if (!button.dataset.originalLabel) {
        button.dataset.originalLabel =
            button.querySelector(".button-label")?.textContent ||
            button.textContent.trim();
    }

    state.busy = busy;
    button.disabled = busy;

    const text = button.querySelector(".button-label");
    if (text) {
        text.textContent = busy ? label : button.dataset.originalLabel;
    } else {
        button.setAttribute("aria-busy", String(busy));
    }
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isValidUsername(value) {
    return /^[a-zA-Z0-9._]{3,24}$/.test(value);
}

function passwordStrength(value) {
    let score = 0;

    if (value.length >= 10) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    return score;
}

function validateAccount() {
    clearFieldErrors();
    let valid = true;

    const fullName = fields.fullName.value.trim();
    const username = fields.username.value.trim();
    const email = fields.email.value.trim();
    const password = fields.password.value;

    if (fullName.length < 2) {
        showError("fullname", "Informe seu nome completo.");
        valid = false;
    }

    if (!isValidUsername(username)) {
        showError("username", "Use de 3 a 24 caracteres: letras, números, ponto ou underline.");
        valid = false;
    }

    if (!isValidEmail(email)) {
        showError("email", "Informe um endereço de e-mail válido.");
        valid = false;
    }

    if (
        password.length < 10 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password)
    ) {
        showError("password", "Use pelo menos 10 caracteres, incluindo letras e números.");
        valid = false;
    }

    if (password.length > 72) {
        showError("password", "A senha excede o limite de 72 caracteres.");
        valid = false;
    }

    if (!fields.terms.checked) {
        showAlert("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
        valid = false;
    }

    if (!valid) {
        const firstInvalid = document.querySelector(
            '.form-step.active [aria-invalid="true"]'
        );
        firstInvalid?.focus();
    }

    return valid;
}

function calculateAge(dateString) {
    const birthDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();

    if (
        !dateString ||
        Number.isNaN(birthDate.getTime()) ||
        birthDate > today
    ) {
        return null;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const beforeBirthday =
        today.getMonth() < birthDate.getMonth() ||
        (
            today.getMonth() === birthDate.getMonth() &&
            today.getDate() < birthDate.getDate()
        );

    if (beforeBirthday) age--;

    return age;
}

function validateBirthDate() {
    clearFieldErrors();

    const age = calculateAge(fields.birthDate.value);

    if (age === null) {
        showError("birthdate", "Informe uma data de nascimento válida.");
        fields.birthDate.focus();
        return false;
    }

    if (age < MINIMUM_AGE) {
        showError(
            "birthdate",
            `Você precisa ter pelo menos ${MINIMUM_AGE} anos para criar uma conta.`
        );
        showAlert("O cadastro não pode continuar devido à idade mínima exigida.");
        fields.birthDate.focus();
        return false;
    }

    return true;
}

function formatPhone(value) {
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("55") && digits.length > 11) {
        digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);

    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneDigits() {
    return fields.phone.value.replace(/\D/g, "");
}

function validatePhone() {
    clearFieldErrors();

    if (phoneDigits().length < 10 || phoneDigits().length > 11) {
        showError("phone", "Informe um celular válido com DDD.");
        fields.phone.focus();
        return false;
    }

    return true;
}

function collectSignupData() {
    return {
        fullName: fields.fullName.value.trim(),
        username: fields.username.value.trim().toLowerCase(),
        email: fields.email.value.trim().toLowerCase(),
        password: fields.password.value,
        birthDate: fields.birthDate.value,
        phone: `+55${phoneDigits()}`,
        acceptedTerms: fields.terms.checked
    };
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "same-origin",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            result.message || result.error || "Não foi possível concluir a solicitação."
        );
        error.status = response.status;
        error.data = result;
        throw error;
    }

    return result;
}

document.getElementById("continue-account").addEventListener("click", () => {
    if (validateAccount()) showStep(2);
});

document.getElementById("continue-birthdate").addEventListener("click", () => {
    if (validateBirthDate()) showStep(3);
});

document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
        showStep(Number(button.dataset.back));
    });
});

document.getElementById("toggle-password").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const visible = fields.password.type === "text";

    fields.password.type = visible ? "password" : "text";
    button.setAttribute("aria-pressed", String(!visible));
    button.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
});

fields.username.addEventListener("input", () => {
    const username = fields.username.value.trim();
    const status = document.getElementById("username-status");

    if (!username) {
        status.textContent = "";
        return;
    }

    status.textContent = isValidUsername(username) ? "✓" : "!";
    status.style.color = isValidUsername(username) ? "var(--success)" : "var(--danger)";
});

fields.password.addEventListener("input", () => {
    const score = passwordStrength(fields.password.value);
    const meter = document.querySelector(".password-meter");
    const label = document.getElementById("password-strength");

    meter.dataset.strength = String(score);

    const labels = [
        "Use pelo menos 10 caracteres, letras e números.",
        "Senha fraca",
        "Senha razoável",
        "Boa senha",
        "Senha forte"
    ];

    label.textContent = labels[score];
});

fields.phone.addEventListener("input", () => {
    const cursorEnd = fields.phone.selectionStart === fields.phone.value.length;
    fields.phone.value = formatPhone(fields.phone.value);

    if (cursorEnd) {
        fields.phone.setSelectionRange(
            fields.phone.value.length,
            fields.phone.value.length
        );
    }
});

fields.code.addEventListener("input", () => {
    fields.code.value = fields.code.value.replace(/\D/g, "").slice(0, 6);
});

document.getElementById("send-code").addEventListener("click", async (event) => {
    if (!validateAccount()) {
        showStep(1);
        return;
    }

    if (!validateBirthDate()) {
        showStep(2);
        return;
    }

    if (!validatePhone()) return;

    const button = event.currentTarget;
    setBusy(button, true, "Enviando código...");

    try {
        const data = collectSignupData();

        const result = await apiRequest("/auth/register/start", {
            method: "POST",
            body: JSON.stringify(data)
        });

        state.challengeId = result.challengeId || null;
        document.getElementById("phone-preview").textContent = fields.phone.value;
        showStep(4);

        if (result.message) showSuccess(result.message);

        fields.code.focus();
    } catch (error) {
        showAlert(
            error.status === 429
                ? "Muitas tentativas. Aguarde antes de tentar novamente."
                : error.message
        );
    } finally {
        setBusy(button, false);
    }
});

document.getElementById("resend-code").addEventListener("click", async () => {
    if (!state.challengeId) {
        showAlert("Não há uma verificação ativa. Volte e solicite um novo código.");
        return;
    }

    const button = document.getElementById("resend-code");
    button.disabled = true;

    try {
        const result = await apiRequest("/auth/register/resend", {
            method: "POST",
            body: JSON.stringify({ challengeId: state.challengeId })
        });

        showSuccess(result.message || "Se a solicitação for válida, um novo código será enviado.");
    } catch (error) {
        showAlert(error.message);
    } finally {
        button.disabled = false;
    }
});

document.getElementById("verify-code").addEventListener("click", async (event) => {
    clearFieldErrors();

    if (!/^\d{6}$/.test(fields.code.value)) {
        showError("code", "Digite o código de 6 dígitos.");
        fields.code.focus();
        return;
    }

    if (!state.challengeId) {
        showAlert("Sua verificação expirou. Volte e solicite um novo código.");
        return;
    }

    const button = event.currentTarget;
    setBusy(button, true, "Verificando...");

    try {
        const result = await apiRequest("/auth/register/verify", {
            method: "POST",
            body: JSON.stringify({
                challengeId: state.challengeId,
                code: fields.code.value
            })
        });

        state.verified = true;
        state.challengeId = result.challengeId || state.challengeId;
        showStep(5);
    } catch (error) {
        showAlert(error.message || "Código inválido ou expirado.");
    } finally {
        setBusy(button, false);
    }
});

fields.picture.addEventListener("change", () => {
    clearFieldErrors();

    const file = fields.picture.files?.[0];
    if (!file) {
        state.avatar = null;
        return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        showError("picture", "Escolha uma imagem JPG, PNG ou WebP.");
        fields.picture.value = "";
        return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
        showError("picture", "A imagem deve ter no máximo 5 MB.");
        fields.picture.value = "";
        return;
    }

    if (state.avatarPreviewUrl) URL.revokeObjectURL(state.avatarPreviewUrl);

    state.avatar = file;
    state.avatarPreviewUrl = URL.createObjectURL(file);

    const preview = document.getElementById("avatar-preview");
    preview.replaceChildren();

    const image = document.createElement("img");
    image.src = state.avatarPreviewUrl;
    image.alt = "Prévia da foto de perfil";
    preview.appendChild(image);
});

async function completeSignup() {
    if (!state.verified) {
        showAlert("Verifique seu número antes de concluir o cadastro.");
        return;
    }

    if (state.avatar) {
        const formData = new FormData();
        formData.append("profilePicture", state.avatar);
        formData.append("challengeId", state.challengeId || "");

        try {
            const response = await fetch(`${API_BASE_URL}/profile/avatar/pending`, {
                method: "POST",
                credentials: "same-origin",
                body: formData
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.message || "Não foi possível salvar sua foto.");
            }
        } catch (error) {
            showAlert(
                `${error.message} Seu cadastro foi verificado, mas a foto precisa ser configurada depois.`
            );
            return;
        }
    }

    showSuccess("Verificação concluída. Seu cadastro foi enviado com sucesso.");
    form.replaceChildren();

    const completion = document.createElement("div");
    completion.className = "step-copy";

    const heading = document.createElement("h3");
    heading.textContent = "Bem-vindo ao TechBrasil!";

    const description = document.createElement("p");
    description.textContent = "Sua etapa de cadastro foi concluída. Entre na sua conta para continuar.";

    const link = document.createElement("a");
    link.className = "primary-button";
    link.href = "login.html";
    link.textContent = "Ir para o login →";

    completion.append(heading, description, link);
    form.appendChild(completion);
}

document.getElementById("finish-signup").addEventListener("click", completeSignup);
document.getElementById("skip-picture").addEventListener("click", completeSignup);

form.addEventListener("submit", (event) => event.preventDefault());

showStep(1);
