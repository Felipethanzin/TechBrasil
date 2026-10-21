
"use strict";

const API_BASE_URL = "/api";
const MINIMUM_AGE = 13;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const form = document.getElementById("signup-form");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll("[data-indicator]")];

const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");
const progressPercentage = document.getElementById("progress-percentage");
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
    picture: document.getElementById("input-profile-picture")
};

const state = {
    step: 1,
    busy: false,
    avatarPreviewUrl: null
};

const stepContent = {
    1: {
        caption: "Etapa 1 de 4",
        title: "Crie sua conta",
        description: "Comece preenchendo seus dados."
    },
    2: {
        caption: "Etapa 2 de 4",
        title: "Sua data de nascimento",
        description: "Informe sua data de nascimento."
    },
    3: {
        caption: "Etapa 3 de 4",
        title: "Adicione seu telefone",
        description: "Esta etapa é opcional. Não é necessário verificar seu número."
    },
    4: {
        caption: "Etapa 4 de 4",
        title: "Quase tudo pronto!",
        description: "Escolha uma foto de perfil ou conclua sem ela."
    }
};

document.getElementById("current-year").textContent =
    new Date().getFullYear();

/* =========================
   MENSAGENS E NAVEGAÇÃO
========================= */

function clearMessages() {
    alertBox.hidden = true;
    alertBox.textContent = "";

    successBox.hidden = true;
    successBox.textContent = "";
}

function showAlert(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;

    successBox.hidden = true;
    successBox.textContent = "";

    alertBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function showSuccess(message) {
    successBox.textContent = message;
    successBox.hidden = false;

    alertBox.hidden = true;
    alertBox.textContent = "";
}

function showStep(number) {
    if (number < 1 || number > 4) return;

    state.step = number;
    clearMessages();

    steps.forEach((step) => {
        const active = Number(step.dataset.step) === number;

        step.hidden = !active;
        step.classList.toggle("active", active);
    });

    indicators.forEach((indicator)