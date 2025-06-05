// main.js - Fichier JavaScript principal

document.addEventListener("DOMContentLoaded", function () {
  // Mobile Menu Toggle
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener("click", function () {
      mobileMenuToggle.classList.toggle("active");
      navLinks.classList.toggle("active");
    });
  }

  // Close mobile menu when clicking outside
  document.addEventListener("click", function (event) {
    if (
      navLinks &&
      navLinks.classList.contains("active") &&
      !event.target.closest(".main-nav")
    ) {
      navLinks.classList.remove("active");
      if (mobileMenuToggle) {
        mobileMenuToggle.classList.remove("active");
      }
    }
  });

  // Close modal when clicking on the close button or outside the modal
  const modals = document.querySelectorAll(".modal");
  const closeButtons = document.querySelectorAll(".close-modal");

  closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  });

  window.addEventListener("click", function (event) {
    modals.forEach((modal) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  // Vérifier le statut d'authentification au chargement de la page
  checkAuthStatus();
});

// URL de base pour les appels API
const API_BASE_URL = "/api"; // URL relative car le JS est servi par le même domaine que l'API Django

/**
 * Fonction pour effectuer des requêtes API.
 * Gère l'ajout du token d'authentification et le token CSRF.
 * @param {string} endpoint - Le point d'accès de l'API (ex: /auth/user/)
 * @param {string} method - La méthode HTTP (GET, POST, PUT, DELETE, etc.)
 * @param {Object|null} data - Les données à envoyer pour POST, PUT, PATCH
 * @returns {Promise<Object|String|null>} - La réponse JSON, texte, ou null.
 */
async function apiRequest(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("authToken");
  const csrfToken = getCookie("csrftoken"); // Récupérer le token CSRF

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Ajouter le token CSRF pour les méthodes qui modifient des données
  // Django le vérifie pour POST, PUT, PATCH, DELETE par défaut.
  if (
    csrfToken &&
    !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase())
  ) {
    headers["X-CSRFToken"] = csrfToken;
  }

  const options = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Si la réponse est 204 No Content (souvent pour DELETE), ne pas essayer de parser en JSON
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const json = await response.json();
      if (!response.ok) {
        // Essayer d'extraire un message d'erreur plus spécifique de la réponse JSON
        const errorMessage =
          json.detail ||
          json.message ||
          JSON.stringify(json) ||
          "Une erreur est survenue lors de la requête API.";
        console.error("API Error (JSON):", response.status, json);
        throw new Error(errorMessage);
      }
      return json;
    } else {
      const text = await response.text();
      if (!response.ok) {
        console.error("API Error (Text):", response.status, text);
        throw new Error(text || `Erreur HTTP: ${response.status}`);
      }
      return text; // Retourner le texte si ce n'est pas du JSON (rare pour les API DRF)
    }
  } catch (error) {
    console.error(`Erreur dans apiRequest vers ${endpoint}:`, error);
    // Peut-être afficher une notification d'erreur plus conviviale ici via showNotification
    // showNotification(`Erreur de communication: ${error.message}`, 'error');
    throw error; // Propage l'erreur pour que l'appelant puisse la gérer
  }
}

/**
 * Récupère la valeur d'un cookie par son nom.
 * Nécessaire pour le token CSRF de Django.
 * @param {string} name - Le nom du cookie (ex: 'csrftoken')
 * @returns {string|null} - La valeur du cookie ou null.
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Vérifie le statut d'authentification de l'utilisateur en interrogeant le backend
 * et met à jour l'interface utilisateur (par exemple, les liens de navigation).
 */
async function checkAuthStatus() {
  const authToken = localStorage.getItem("authToken");
  const authLinksElements = document.querySelectorAll(".auth-links"); // Peut y avoir plusieurs (header, footer)

  // URLs (à adapter si vous utilisez une méthode pour les rendre dynamiques via Django)
  const loginUrl = "/login/"; // Correspond à {% url 'frontend:login' %}
  const registerUrl = "/register/"; // Correspond à {% url 'frontend:register' %}
  const profileUrl = "/profile/"; // Correspond à {% url 'frontend:profile' %}
  const adminUrl = "/admin/"; // URL standard de l'admin Django

  const updateAuthUI = (isLoggedIn, user = null) => {
    authLinksElements.forEach((authLinksLi) => {
      // Vider les anciens liens
      while (authLinksLi.firstChild) {
        authLinksLi.removeChild(authLinksLi.firstChild);
      }

      if (isLoggedIn && user) {
        const profileLink = document.createElement("a");
        profileLink.href = profileUrl;
        profileLink.className = "btn btn-outline";
        profileLink.textContent = "Mon profil";
        authLinksLi.appendChild(profileLink);

        const logoutButton = document.createElement("button");
        logoutButton.id = `logout-btn-${Math.random()
          .toString(36)
          .substring(7)}`; // ID unique pour éviter conflits
        logoutButton.className = "btn btn-primary";
        logoutButton.textContent = "Déconnexion";
        logoutButton.addEventListener("click", handleLogout);
        authLinksLi.appendChild(logoutButton);

        // Ajouter le lien Admin si l'utilisateur est staff/admin
        // La propriété 'is_staff' ou 'is_superuser' vient de votre API utilisateur
        if (
          user.is_staff ||
          user.is_superuser ||
          user.role === "admin" ||
          user.role === "staff"
        ) {
          const adminLink = document.createElement("a");
          adminLink.href = adminUrl; // Lien vers l'interface d'administration Django
          adminLink.className = "btn btn-secondary admin-link"; // Stylez-le comme vous le souhaitez
          adminLink.textContent = "Admin";
          adminLink.style.marginLeft = "10px"; // Un peu d'espacement
          // Insérer avant le bouton de déconnexion ou à la fin
          authLinksLi.insertBefore(adminLink, logoutButton);
        }
        authLinksLi.classList.add("logged-in");
      } else {
        const loginLink = document.createElement("a");
        loginLink.href = loginUrl;
        loginLink.className = "btn btn-outline";
        loginLink.textContent = "Connexion";
        authLinksLi.appendChild(loginLink);

        const registerLink = document.createElement("a");
        registerLink.href = registerUrl;
        registerLink.className = "btn btn-primary";
        registerLink.textContent = "Inscription";
        authLinksLi.appendChild(registerLink);
        authLinksLi.classList.remove("logged-in");
      }
    });
  };

  if (authToken) {
    try {
      // Appel à une API pour vérifier le token et obtenir les infos utilisateur.
      // Adaptez '/auth/user/' à votre endpoint API réel pour récupérer l'utilisateur connecté.
      // Cet endpoint doit être protégé (nécessiter un token valide).
      const user = await apiRequest("/auth/profile/"); // Assurez-vous que cet endpoint existe dans authentication.urls

      if (user && (user.id || user.username)) {
        // Vérifier une propriété clé de l'objet utilisateur
        console.log(
          "Utilisateur connecté (vérifié par API):",
          user.username || user.email
        );
        localStorage.setItem("user", JSON.stringify(user)); // Mettre à jour les infos utilisateur localement
        updateAuthUI(true, user);
      } else {
        // L'API a répondu mais n'a pas retourné un utilisateur valide, ou token invalide non géré par une erreur HTTP
        console.log(
          "Token potentiellement invalide ou utilisateur non trouvé par API."
        );
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        updateAuthUI(false);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification du statut d'authentification via API:",
        error.message
      );
      // Si l'erreur est 401 ou 403, le token est probablement invalide/expiré
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        (error.name === "Error" &&
          (error.message.toLowerCase().includes("unauthorized") ||
            error.message
              .toLowerCase()
              .includes("authentication credentials were not provided")))
      ) {
        console.log("Token invalide ou expiré. Déconnexion locale.");
      }
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      updateAuthUI(false);
    }
  } else {
    // Pas de token, l'utilisateur n'est pas connecté
    console.log("Aucun token trouvé, utilisateur non connecté.");
    localStorage.removeItem("user"); // S'assurer que les infos user sont aussi nettoyées
    updateAuthUI(false);
  }
}

/**
 * Gère la déconnexion de l'utilisateur.
 */
async function handleLogout() {
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    try {
      // Optionnel: appeler une API de déconnexion sur le backend si elle existe
      // (par exemple, pour invalider le token côté serveur si c'est un refresh token ou pour logger la déconnexion)
      // await apiRequest('/auth/logout/', 'POST'); // Adaptez l'endpoint
      console.log(
        "Déconnexion réussie (appel API backend optionnel non effectué)."
      );
    } catch (error) {
      console.error(
        "Erreur lors de la déconnexion côté serveur (optionnel):",
        error
      );
    }
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("user"); // Très important
  localStorage.removeItem("cart"); // Vider le panier à la déconnexion

  // Mettre à jour l'UI immédiatement
  checkAuthStatus();

  // Rediriger vers la page d'accueil
  // On vérifie si on n'est pas déjà sur la page d'accueil pour éviter une boucle de rechargement inutile
  if (window.location.pathname !== "/") {
    window.location.href = "/"; // Adaptez si votre page d'accueil a une autre URL
  } else {
    // Si on est déjà sur la page d'accueil, un simple rechargement peut suffire
    // ou laisser checkAuthStatus() gérer la mise à jour de l'UI.
    // Pour forcer une mise à jour propre de l'état, on peut aussi recharger.
    // window.location.reload(); // Décommentez si nécessaire
  }
}

// --- Fonctions Utilitaires (Formatage, etc.) ---

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  } catch (e) {
    return "Date invalide";
  }
}

function formatTime(timeString) {
  try {
    if (timeString && timeString.length <= 8 && timeString.includes(":")) {
      // Format HH:MM ou HH:MM:SS
      const parts = timeString.split(":");
      return `${parts[0]}:${parts[1]}`;
    }
    const date = new Date(timeString); // Tente de parser comme une date complète
    if (isNaN(date)) return "Heure invalide";
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Heure invalide";
  }
}

function formatPrice(price) {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    return "Prix invalide";
  }
  return numPrice.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

// --- Fonctions du Panier (localStorage) ---

function getCart() {
  try {
    const cartString = localStorage.getItem("cart");
    if (!cartString) return { items: [], total: 0 };
    const cart = JSON.parse(cartString);
    // S'assurer que le format est correct
    if (!Array.isArray(cart.items) || typeof cart.total !== "number") {
      return { items: [], total: 0 };
    }
    return cart;
  } catch (e) {
    console.error(
      "Erreur lors de la lecture du panier depuis localStorage:",
      e
    );
    return { items: [], total: 0 }; // Retourner un panier vide en cas d'erreur
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount(); // Mettre à jour le compteur à chaque sauvegarde
  } catch (e) {
    console.error(
      "Erreur lors de la sauvegarde du panier dans localStorage:",
      e
    );
  }
}

function addToCart(item) {
  const cart = getCart();
  const existingItemIndex = cart.items.findIndex((i) => i.id === item.id);

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += item.quantity;
  } else {
    cart.items.push(item);
  }
  cart.total = calculateCartTotal(cart.items);
  saveCart(cart);
  // showNotification(`${item.name} ajouté au panier!`); // Déplacé dans menu.js
  return cart;
}

function removeFromCart(itemId) {
  const cart = getCart();
  const itemToRemove = cart.items.find((item) => item.id === itemId);
  cart.items = cart.items.filter((item) => item.id !== itemId);
  cart.total = calculateCartTotal(cart.items);
  saveCart(cart);
  if (itemToRemove) {
    // showNotification(`${itemToRemove.name} retiré du panier.`); // Peut être géré par l'appelant
  }
  return cart;
}

function updateCartItemQuantity(itemId, quantity) {
  const cart = getCart();
  const itemIndex = cart.items.findIndex((i) => i.id === itemId);

  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Si la quantité est 0 ou moins, retirer l'article
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
  }
  cart.total = calculateCartTotal(cart.items);
  saveCart(cart);
  return cart;
}

function calculateCartTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    const price = parseFloat(item.price);
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(price) || isNaN(quantity)) return total;
    return total + price * quantity;
  }, 0);
}

function clearCart() {
  saveCart({ items: [], total: 0 });
  // showNotification("Panier vidé.");
}

function updateCartCount() {
  const cart = getCart();
  const cartCountElement = document.getElementById("cart-count"); // Renommé pour clarté

  if (cartCountElement) {
    const itemCount = cart.items.reduce(
      (count, item) => count + (parseInt(item.quantity, 10) || 0), // S'assurer que item.quantity est un nombre
      0
    );
    cartCountElement.textContent = itemCount;
  }
}

// --- Helper pour les badges de statut (si utilisé globalement) ---
function getStatusBadgeHTML(status) {
  let className = "status-unknown"; // Classe par défaut
  let label = status ? status.toString() : "Inconnu"; // Label par défaut

  switch (status ? status.toLowerCase() : "") {
    case "pending":
    case "en attente":
      className = "status-pending";
      label = "En attente";
      break;
    case "confirmed":
    case "confirmé":
      className = "status-confirmed";
      label = "Confirmé";
      break;
    case "preparing":
    case "en préparation":
      className = "status-preparing";
      label = "En préparation";
      break;
    case "ready":
    case "prêt":
      className = "status-ready";
      label = "Prêt";
      break;
    case "delivered":
    case "livré":
      className = "status-delivered";
      label = "Livré";
      break;
    case "completed":
    case "terminé":
      className = "status-completed";
      label = "Terminé";
      break;
    case "cancelled":
    case "annulé":
      className = "status-cancelled";
      label = "Annulé";
      break;
  }
  return `<span class="status-badge ${className}">${label}</span>`;
}

// Fonction pour afficher les notifications (si utilisée globalement)
// Déplacée depuis menu.js pour être potentiellement globale
function showNotification(message, type = "success") {
  let notification = document.querySelector(".notification-toast");
  if (!notification) {
    notification = document.createElement("div");
    notification.className = "notification-toast";
    document.body.appendChild(notification);
    Object.assign(notification.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 24px",
      borderRadius: "var(--radius-md, 6px)",
      boxShadow:
        "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05))",
      zIndex: "1050",
      opacity: "0",
      transition: "opacity 0.3s ease-in-out, bottom 0.3s ease-in-out",
      color: "white",
      fontSize: "1rem",
      fontWeight: "500",
      textAlign: "center",
      minWidth: "200px",
      maxWidth: "90%",
    });
  }
  notification.textContent = message;
  notification.style.backgroundColor =
    type === "error" ? "var(--danger, #e74c3c)" : "var(--success, #2ecc71)";

  notification.style.opacity = "0";
  notification.style.bottom = "0px";
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.bottom = "20px";
  }, 10);
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.bottom = "0px";
  }, 3000);
}
