
const API = {
    login: "/api/auth/login",
    forgotPassword: "/api/auth/forgot-password"
};

const loginForm = document.querySelector("#loginForm");
const forgotForm = document.querySelector("#forgotForm");
const loginHeading = document.querySelector("#loginHeading");
const showForgot = document.querySelector("#showForgot");
const backToLogin = document.querySelector("#backToLogin");
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");
const loginSubmit = document.querySelector("#loginSubmit");
const recoverySubmit = document.querySelector("#recoverySubmit");
const loginMessage = document.querySelector("#loginMessage");
const recoveryMessage = document.querySelector("#recoveryMessage");

document.querySelector("#currentYear").textContent = new Date().getFullYear();

togglePassword.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";

    passwordInput.type = isVisible ? "password" : "text";
    togglePassword.setAttribute("aria-pressed", String(!isVisible));
    togglePassword.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
});

showForgot.addEventListener("click", () => {
    const email = document.querySelector("#email").value.trim();

    loginForm.hidden = true;
    loginHeading.hidden = true;
    forgotForm.hidden = false;
    document.querySelector("#recoveryEmail").value = email;
    clearMessage(loginMessage);
    clearMessage(recoveryMessage);
    clearErrors();
    document.querySelector("#recoveryEmail").focus();
});

backToLogin.addEventListener("click", () => {
    forgotForm.hidden = true;
    loginForm.hidden = false;
    loginHeading.hidden = false;
    clearMessage(recoveryMessage);
    clearErrors();
    document.querySelector("#email").focus();
});

function showMessage(element, message, type) {
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = false;
}

function clearMessage(element) {
    element.textContent = "";
    element.hidden = true;
    delete element.dataset.type;
}

function setFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.closest(".input-wrap").classList.toggle("has-error", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
}

function clearErrors() {
    setFieldError(document.querySelector("#email"), document.querySelector("#emailError"), "");
    setFieldError(passwordInput, document.querySelector("#passwordError"), "");
    setFieldError(document.querySelector("#recoveryEmail"), document.querySelector("#recoveryEmailError"), "");
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function setLoading(button, loading, label) {
    button.disabled = loading;
    button.querySelector(".button-label").textContent = loading ? "Aguarde..." : label;
}

async function postJson(url, data) {
    const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(data)
    });

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        const error = new Error(result.message || "Não foi possível concluir a solicitação.");
        error.status = response.status;
        throw error;
    }

    return result;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    clearMessage(loginMessage);

    const emailInput = document.querySelector("#email");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let valid = true;

    if (!validEmail(email)) {
        setFieldError(emailInput, document.querySelector("#emailError"), "Informe um e-mail válido.");
        valid = false;
    }

    if (!password) {
        setFieldError(passwordInput, document.querySelector("#passwordError"), "Informe sua senha.");
        valid = false;
    }

    if (!valid) {
        showMessage(loginMessage, "Confira os campos destacados e tente novamente.", "error");
        return;
    }

    setLoading(loginSubmit, true, "Entrar na plataforma");

    try {
        await postJson(API.login, {
            email,
            password,
            remember: document.querySelector("#remember").checked
        });

        showMessage(loginMessage, "Login realizado. Redirecionando...", "success");
        window.location.assign("/feed");
    } catch (error) {
        if (error instanceof TypeError) {
            showMessage(loginMessage, "Não foi possível conectar ao servidor. Verifique a API e tente novamente.", "error");
        } else if (error.status === 401) {
            showMessage(loginMessage, "E-mail ou senha incorretos.", "error");
        } else if (error.status === 429) {
            showMessage(loginMessage, "Muitas tentativas. Aguarde um pouco antes de tentar novamente.", "error");
        } else {
            showMessage(loginMessage, error.message || "Ocorreu um erro. Tente novamente.", "error");
        }
    } finally {
        setLoading(loginSubmit, false, "Entrar na plataforma");
    }
});

forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    clearMessage(recoveryMessage);

    const emailInput = document.querySelector("#recoveryEmail");
    const email = emailInput.value.trim();

    if (!validEmail(email)) {
        setFieldError(emailInput, document.querySelector("#recoveryEmailError"), "Informe um e-mail válido.");
        return;
    }

    setLoading(recoverySubmit, true, "Enviar instruções");

    try {
        await postJson(API.forgotPassword, { email });

        showMessage(
            recoveryMessage,
            "Se existir uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha.",
            "success"
        );
    } catch (error) {
        if (error instanceof TypeError) {
            showMessage(recoveryMessage, "Não foi possível conectar ao servidor. Tente novamente mais tarde.", "error");
        } else {
            showMessage(
                recoveryMessage,
                "Não foi possível processar a solicitação agora. Tente novamente mais tarde.",
                "error"
            );
        }
    } finally {
        setLoading(recoverySubmit, false, "Enviar instruções");
    }
});

for (const input of document.querySelectorAll("input")) {
    input.addEventListener("input", () => {
        const error = input.closest(".form-field")?.querySelector(".field-error");

        if (error) {
            setFieldError(input, error, "");
        }
    });
}
