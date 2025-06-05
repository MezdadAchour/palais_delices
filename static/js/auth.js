// auth.js - Gestion de la connexion et de l'inscription

// Assurez-vous que apiRequest est défini globalement (par exemple, dans main.js)
// async function apiRequest(endpoint, method, data) { ... }
// Assurez-vous que showNotification est défini globalement
// function showNotification(message, type) { ... }

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Redirection si déjà connecté et sur login/register page
  const token = localStorage.getItem("authToken");
  const currentPath = window.location.pathname; // Obtenir le chemin complet
  const loginPagePath = "/login/";
  const registerPagePath = "/register/";

  const homePageRedirectPath = "/"; // Ou "/index/" si c'est bien l'URL de votre page d'accueil

  if (token) {
    // Si l'utilisateur a un token (est potentiellement connecté)
    if (currentPath === loginPagePath || currentPath === registerPagePath) {
      // Et qu'il est sur la page de connexion ou d'inscription
      console.log(
        "Utilisateur connecté sur la page " +
          currentPath +
          ". Redirection vers l'accueil."
      );
      window.location.href = homePageRedirectPath; // Rediriger
    }
  }
});

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const emailInput = form.querySelector("#email");
  const passwordInput = form.querySelector("#password");
  const errorElement = document.getElementById("login-error");
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    errorElement.textContent = "Veuillez remplir tous les champs.";
    errorElement.classList.remove("hidden");
    return;
  }

  errorElement.classList.add("hidden");
  submitButton.disabled = true;
  submitButton.textContent = "Connexion en cours...";

  try {
    // Utilisation de l'endpoint '/auth/login/' qui a fonctionné pour vous
    const response = await apiRequest("/auth/login/", "POST", {
      email: email,
      password: password,
    });

    // Vous pouvez commenter ou supprimer ce log une fois que tout est stable
    console.log("Réponse de /api/auth/login/ lors de la connexion :", response);

    if (
      response &&
      response.success === true &&
      response.tokens &&
      response.tokens.access &&
      response.user
    ) {
      localStorage.setItem("authToken", response.tokens.access);
      if (response.tokens.refresh) {
        localStorage.setItem("refreshToken", response.tokens.refresh);
      }
      localStorage.setItem("user", JSON.stringify(response.user));

      // Mettre à jour l'UI immédiatement (par exemple, les liens de navigation)
      if (typeof checkAuthStatus === "function") {
        await checkAuthStatus(); // Assure que l'UI reflète l'état connecté avant la redirection
      } else {
        console.warn(
          "La fonction checkAuthStatus n'est pas disponible pour mettre à jour l'UI avant redirection."
        );
      }

      // Logique de redirection (maintenant réactivée)
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get("redirect");
      if (redirectUrl) {
        window.location.href = redirectUrl.startsWith("/")
          ? redirectUrl
          : `/${redirectUrl}`;
      } else {
        window.location.href = "/"; // Rediriger vers la page d'accueil par défaut
      }
    } else {
      let detailMessage = "Réponse invalide du serveur lors de la connexion.";
      if (response && response.message) {
        detailMessage = response.message;
      } else if (response && response.detail) {
        detailMessage = response.detail;
      } else if (
        response &&
        typeof response === "object" &&
        Object.keys(response).length > 0
      ) {
        detailMessage = `Structure de réponse inattendue: ${JSON.stringify(
          response
        )}`;
      } else if (!response) {
        detailMessage = "Aucune réponse reçue du serveur ou réponse vide.";
      }
      throw new Error(detailMessage);
    }
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage =
      error.message || "Email ou mot de passe incorrect. Veuillez réessayer.";
    errorElement.textContent = errorMessage;
    errorElement.classList.remove("hidden");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const errorElement = document.getElementById("register-error");
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  // Récupérer les valeurs du formulaire
  const nom = form.querySelector("#nom")?.value;
  // IMPORTANT: Assurez-vous d'avoir un champ pour 'prenom' dans votre register.html
  // exemple: <input type="text" id="prenom" name="prenom" required>
  const prenom = form.querySelector("#prenom")?.value;
  const email = form.querySelector("#email")?.value;
  const telephone = form.querySelector("#telephone")?.value; // Optionnel selon serializer
  const password = form.querySelector("#password")?.value;
  const passwordConfirm = form.querySelector("#password_confirm")?.value;

  // Validation simple côté client
  if (!nom || !prenom || !email || !password || !passwordConfirm) {
    errorElement.textContent =
      "Veuillez remplir tous les champs obligatoires (Nom, Prénom, Email, Mot de passe).";
    errorElement.classList.remove("hidden");
    return;
  }

  if (password !== passwordConfirm) {
    errorElement.textContent = "Les mots de passe ne correspondent pas.";
    errorElement.classList.remove("hidden");
    return;
  }

  errorElement.classList.add("hidden");
  submitButton.disabled = true;
  submitButton.textContent = "Inscription en cours...";

  // Préparer les données pour l'API. UtilisateurRegistrationSerializer attend ces champs.
  const registerData = {
    nom: nom,
    prenom: prenom, // Assurez-vous que ce champ existe dans votre HTML
    email: email,
    password: password,
    password_confirm: passwordConfirm,
  };
  if (telephone) {
    // Inclure le téléphone seulement s'il est fourni
    registerData.telephone = telephone;
  }
  // Ajoutez d'autres champs optionnels si présents dans le formulaire et gérés par le serializer
  // (adresse, date_naissance, accepte_newsletter)

  try {
    // L'endpoint pour l'inscription (vérifiez votre urls.py)
    const response = await apiRequest("/auth/register/", "POST", registerData);

    // UtilisateurRegistrationSerializer ne retourne pas de token, juste l'utilisateur créé.
    // Rediriger vers la page de connexion avec un message de succès.
    // Vous pouvez aussi afficher un message sur la page actuelle.
    alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    window.location.href = "/login/"; // Rediriger vers la page de connexion
  } catch (error) {
    console.error("Register error:", error);
    let errorMessage = "L'inscription a échoué. Veuillez réessayer.";
    if (error.message) {
      try {
        const errorObj = JSON.parse(error.message);
        // Gérer les erreurs spécifiques (par exemple, email déjà utilisé)
        if (errorObj.email) {
          errorMessage = errorObj.email.join(" ");
        } else if (errorObj.password) {
          errorMessage = errorObj.password.join(" ");
        } else if (typeof errorObj === "object") {
          errorMessage = Object.entries(errorObj)
            .map(
              ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join("; ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message || errorMessage;
      }
    }
    errorElement.textContent = errorMessage;
    errorElement.classList.remove("hidden");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}
