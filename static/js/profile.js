// profile.js - Gestion de la page de profil utilisateur

document.addEventListener("DOMContentLoaded", function () {
  const isLoggedIn =
    (typeof checkAuthStatus === "function" && checkAuthStatus()) ||
    !!localStorage.getItem("authToken");
  const currentPath = window.location.pathname;

  if (
    !isLoggedIn &&
    !(
      currentPath.includes("/login") ||
      currentPath.includes("/register") ||
      currentPath.includes("login.html") ||
      currentPath.includes("register.html")
    )
  ) {
    const loginPageUrl = "/login/";
    const currentTargetUrl = encodeURIComponent(
      window.location.pathname + window.location.search + window.location.hash
    );
    window.location.href = `${loginPageUrl}?redirect=${currentTargetUrl}`;
    return;
  }

  loadUserProfile();
  setupTabs();
  setupProfileForm();
  setupPasswordForm();
  setupModalCloseEvents();
});

function loadUserProfile() {
  const userString = localStorage.getItem("user");
  if (!userString) {
    console.error("Données utilisateur non trouvées dans localStorage.");
    return;
  }
  try {
    const user = JSON.parse(userString);
    const profileName = document.getElementById("profile-name");
    const profileEmailDisplay = document.getElementById("profile-email");
    const profileInitials = document.getElementById("profile-initials");

    if (profileName)
      profileName.textContent =
        `${user.prenom || ""} ${user.nom || ""}`.trim() ||
        user.username ||
        "Utilisateur";
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email || "";
    if (profileInitials) {
      const prenomInitial = user.prenom ? user.prenom[0] : "";
      const nomInitial = user.nom ? user.nom[0] : "";
      profileInitials.textContent =
        (prenomInitial + nomInitial).toUpperCase() ||
        (user.username ? user.username[0].toUpperCase() : "U");
    }

    if (document.getElementById("profile-prenom"))
      document.getElementById("profile-prenom").value = user.prenom || "";
    if (document.getElementById("profile-nom"))
      document.getElementById("profile-nom").value = user.nom || "";
    if (document.getElementById("profile-email-input")) {
      document.getElementById("profile-email-input").value = user.email || "";
      // email.readOnly est déjà dans le HTML, c'est bien.
    }
    if (document.getElementById("profile-telephone"))
      document.getElementById("profile-telephone").value = user.telephone || "";
    if (document.getElementById("profile-adresse"))
      document.getElementById("profile-adresse").value = user.adresse || "";
  } catch (e) {
    console.error("Erreur lors du parsing des données utilisateur :", e);
  }
}

function setupTabs() {
  const tabLinks = document.querySelectorAll(".profile-nav a");
  const tabContents = document.querySelectorAll(".profile-tab");

  function activateTab(tabId) {
    tabLinks.forEach((link) => link.classList.remove("active"));
    tabContents.forEach((tab) => tab.classList.remove("active"));

    const currentLink = document.querySelector(
      `.profile-nav a[data-tab="${tabId}"]`
    );
    const currentTab = document.getElementById(`${tabId}-tab`);

    if (currentLink) currentLink.classList.add("active");
    if (currentTab) currentTab.classList.add("active");

    if (tabId === "commandes") {
      const ordersContainer = document.getElementById("user-orders-list");
      if (
        ordersContainer &&
        (!ordersContainer.dataset.loaded ||
          ordersContainer.innerHTML.includes("loading"))
      ) {
        loadUserOrders();
        ordersContainer.dataset.loaded = "true";
      }
    } else if (tabId === "reservations") {
      const reservationsContainer = document.getElementById(
        "user-reservations-list"
      );
      if (
        reservationsContainer &&
        (!reservationsContainer.dataset.loaded ||
          reservationsContainer.innerHTML.includes("loading"))
      ) {
        loadUserReservations();
        reservationsContainer.dataset.loaded = "true";
      }
    }
  }

  const hash = window.location.hash.substring(1);
  const initialTab =
    hash && document.getElementById(`${hash}-tab`)
      ? hash
      : tabLinks[0]
      ? tabLinks[0].dataset.tab
      : "profil";
  activateTab(initialTab);

  tabLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const tabId = this.dataset.tab;
      activateTab(tabId);
      if (history.pushState) {
        history.pushState(null, null, `#${tabId}`);
      } else {
        window.location.hash = tabId;
      }
    });
  });
}

async function loadUserOrders() {
  const ordersContainer = document.getElementById("user-orders-list");
  if (!ordersContainer) return;
  ordersContainer.innerHTML = `<div class="loading"><div class="spinner"></div><p>Chargement de vos commandes...</p></div>`;

  try {
    const response = await apiRequest("/orders/commandes/my_orders/");
    if (response && response.success && Array.isArray(response.commandes)) {
      if (response.commandes.length === 0) {
        ordersContainer.innerHTML = `<div class="empty-message"><p>Vous n'avez aucune commande pour le moment.</p><a href="/menu/" class="btn btn-primary">Passer une commande</a></div>`;
        return;
      }
      renderOrders(response.commandes, ordersContainer);
    } else {
      throw new Error(
        response.error ||
          response.message ||
          "Format de réponse invalide pour les commandes."
      );
    }
  } catch (error) {
    console.error("Erreur lors du chargement des commandes:", error);
    ordersContainer.innerHTML = `<div class="error-message"><p>Impossible de charger vos commandes: ${error.message}.</p><button onclick="loadUserOrders()" class="btn btn-sm btn-outline">Réessayer</button></div>`;
  }
}

function renderOrders(orders, container) {
  let html = '<ul class="data-list orders-data-list">';
  orders.forEach((order) => {
    const orderTotal =
      (parseFloat(order.montant) || 0) +
      (parseFloat(order.fraisLivraison) || 0);
    html += `
      <li class="data-list-item order-card" data-order-id="${order.id}">
        <div class="order-card-header">
          <span class="order-card-id">Commande ${
            order.numero_commande || `#${order.id}`
          }</span>
          ${getStatusBadgeHTML(order.statut)}
        </div>
        <div class="order-card-body">
          <p class="order-card-date">Date: ${formatDate(order.dateCommande)}</p>
          <p class="order-card-total">Total: ${formatPrice(orderTotal)}</p>
          <p class="order-card-items">Articles: ${
            order.total_items != null
              ? order.total_items
              : order.lignes
              ? order.lignes.length
              : 0
          }</p>
        </div>
        <div class="order-card-actions">
          <button class="btn btn-sm btn-outline view-order-details" data-order-id="${
            order.id
          }">Voir détails</button>
        </div>
      </li>
    `;
  });
  html += "</ul>";
  container.innerHTML = html;

  container.querySelectorAll(".view-order-details").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.dataset.orderId;
      const order = orders.find((o) => o.id == orderId);
      if (order) displayOrderDetailModal(order);
    });
  });
}

async function loadUserReservations() {
  const reservationsContainer = document.getElementById(
    "user-reservations-list"
  );
  if (!reservationsContainer) return;
  reservationsContainer.innerHTML = `<div class="loading"><div class="spinner"></div><p>Chargement de vos réservations...</p></div>`;

  try {
    const response = await apiRequest(
      "/restaurant/reservations/mes-reservations/"
    );
    // La réponse de l'API est { "futures": [...], "passees": [...] }
    if (
      response &&
      (Array.isArray(response.futures) || Array.isArray(response.passees))
    ) {
      const allReservations = [
        ...(response.futures || []),
        ...(response.passees || []),
      ];
      // Trier les réservations, par exemple par date (plus récentes en premier)
      allReservations.sort(
        (a, b) =>
          new Date(b.dateReservation + "T" + b.heureReservation) -
          new Date(a.dateReservation + "T" + a.heureReservation)
      );

      if (allReservations.length === 0) {
        reservationsContainer.innerHTML = `<div class="empty-message"><p>Vous n'avez aucune réservation pour le moment.</p><a href="/reservations/" class="btn btn-primary">Faire une réservation</a></div>`;
        return;
      }
      renderReservations(allReservations, reservationsContainer);
    } else {
      throw new Error(
        response.error ||
          response.message ||
          "Format de réponse invalide pour les réservations."
      );
    }
  } catch (error) {
    console.error("Erreur lors du chargement des réservations:", error);
    reservationsContainer.innerHTML = `<div class="error-message"><p>Impossible de charger vos réservations: ${error.message}.</p><button onclick="loadUserReservations()" class="btn btn-sm btn-outline">Réessayer</button></div>`;
  }
}

function renderReservations(reservations, container) {
  let html = '<ul class="data-list reservations-data-list">';
  reservations.forEach((res) => {
    // Le ReservationDetailSerializer devrait fournir `table` comme un objet contenant `numero` et `position`
    const tableInfo = res.table || { numero: "N/A", position: "N/A" };
    const tableDisplay = `Table ${tableInfo.numero || "N/A"}${
      tableInfo.position ? " (" + tableInfo.position + ")" : ""
    }`;

    html += `
      <li class="data-list-item reservation-card" data-reservation-id="${
        res.id
      }">
        <div class="reservation-card-header">
            <span class="reservation-card-id">Réservation #${res.id}</span>
            ${getStatusBadgeHTML(res.statut)}
        </div>
        <div class="reservation-card-body">
            <p class="reservation-card-date">Date: ${formatDate(
              res.dateReservation
            )} à ${formatTime(res.heureReservation)}</p>
            <p class="reservation-card-details">${tableDisplay} pour ${
      res.nbPersonnes
    } personne(s)</p>
        </div>
        <div class="reservation-card-actions">
            <button class="btn btn-sm btn-outline view-reservation-details" data-reservation-id="${
              res.id
            }">Voir détails</button>
        </div>
      </li>
    `;
  });
  html += "</ul>";
  container.innerHTML = html;

  container.querySelectorAll(".view-reservation-details").forEach((button) => {
    button.addEventListener("click", function () {
      const reservationId = this.dataset.reservationId;
      const reservation = reservations.find((r) => r.id == reservationId);
      if (reservation) displayReservationDetailModal(reservation);
    });
  });
}

function displayOrderDetailModal(order) {
  const modal = document.getElementById("order-detail-modal");
  if (!modal) return;

  // Utilisation des IDs corrigés du HTML (se terminant par -display)
  document.getElementById("modal-order-id-display").textContent = `#${
    order.numero_commande || order.id
  }`;
  document.getElementById("modal-order-date-display").textContent = formatDate(
    order.dateCommande
  );
  document.getElementById("modal-order-status-display").innerHTML =
    getStatusBadgeHTML(order.statut);
  document.getElementById("modal-order-payment-display").textContent =
    getPaymentMethodLabel(order.modePaiement);
  document.getElementById("modal-order-delivery-mode-display").textContent =
    getDeliveryModeLabel(order.modeLivraison);

  const itemsTbody = document.getElementById("modal-order-items-display");
  itemsTbody.innerHTML = "";
  let subtotalCalculated = 0;
  if (order.lignes && Array.isArray(order.lignes)) {
    order.lignes.forEach((ligne) => {
      const platNom =
        ligne.plat && ligne.plat.nom
          ? ligne.plat.nom
          : ligne.plat_nom || "Plat inconnu";
      const prixUnitaire = parseFloat(ligne.prixUnitaire) || 0;
      const quantite = parseInt(ligne.quantite, 10) || 0;
      const sousTotalLigne = prixUnitaire * quantite;
      subtotalCalculated += sousTotalLigne;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${platNom}</td>
        <td>${formatPrice(prixUnitaire)}</td>
        <td>${quantite}</td>
        <td class="text-right">${formatPrice(sousTotalLigne)}</td>
      `;
      itemsTbody.appendChild(tr);
    });
  }

  const deliveryFee = parseFloat(order.fraisLivraison) || 0;
  // Le 'montant' de la commande doit être le total des sous-totaux des lignes (sans frais de livraison)
  // Si order.montant inclut déjà les frais, il faut ajuster.
  // Ici, on suppose que order.montant = subtotalCalculated
  document.getElementById("modal-order-subtotal-display").textContent =
    formatPrice(subtotalCalculated);
  document.getElementById("modal-order-delivery-fee-display").textContent =
    formatPrice(deliveryFee);
  document.getElementById("modal-order-total-display").textContent =
    formatPrice(subtotalCalculated + deliveryFee);

  const addressSection = document.getElementById(
    "modal-order-address-section-display"
  );
  const addressDisplay = document.getElementById("modal-order-address-display");
  if (order.modeLivraison === "delivery" && order.adresseLivraison) {
    addressDisplay.textContent = order.adresseLivraison;
    if (order.telephoneContact)
      addressDisplay.textContent += ` (Contact: ${order.telephoneContact})`;
    addressSection.style.display = "block";
  } else {
    addressSection.style.display = "none";
  }
  document.getElementById("modal-order-comment-display").textContent =
    order.commentaire || "-";

  const reorderBtn = document.getElementById("reorder-btn");
  if (reorderBtn) {
    reorderBtn.onclick = () => {
      if (
        typeof clearCart === "function" &&
        typeof addToCart === "function" &&
        order.lignes
      ) {
        clearCart();
        let itemsAdded = 0;
        order.lignes.forEach((ligne) => {
          const plat = ligne.plat; // Devrait être l'objet plat détaillé
          if (plat && plat.id && plat.nom && ligne.prixUnitaire != null) {
            addToCart({
              id: plat.id,
              name: plat.nom,
              price: parseFloat(ligne.prixUnitaire),
              quantity: ligne.quantite,
              image:
                plat.photo_url ||
                plat.photo ||
                "/static/images/default-plat.png",
            });
            itemsAdded++;
          } else {
            console.warn(
              "Données de plat incomplètes pour la re-commande:",
              ligne
            );
          }
        });
        if (itemsAdded > 0) {
          showNotification(
            `${itemsAdded} type(s) d'article(s) ajouté(s) au panier.`,
            "success"
          );
          window.location.href = "/commander/";
        } else {
          showNotification(
            "Impossible de recréer la commande, données d'articles manquantes.",
            "error"
          );
        }
      } else {
        showNotification(
          "Fonctionnalité de nouvelle commande non disponible ou panier vide.",
          "error"
        );
      }
    };
  }
  modal.style.display = "block";
}

function displayReservationDetailModal(reservation) {
  const modal = document.getElementById("reservation-detail-modal");
  if (!modal) return;

  document.getElementById(
    "modal-reservation-id-display"
  ).textContent = `#${reservation.id}`;
  document.getElementById("modal-reservation-date-display").textContent =
    formatDate(reservation.dateReservation);
  document.getElementById("modal-reservation-time-display").textContent =
    formatTime(reservation.heureReservation);
  document.getElementById("modal-reservation-persons-display").textContent = `${
    reservation.nbPersonnes
  } personne${reservation.nbPersonnes > 1 ? "s" : ""}`;

  // ReservationDetailSerializer devrait fournir `table` comme un objet avec `numero` et `position`
  const tableInfo = reservation.table || { numero: "N/A", position: "" };
  document.getElementById(
    "modal-reservation-table-display"
  ).textContent = `Table ${tableInfo.numero || "N/A"} ${
    tableInfo.position ? "(" + tableInfo.position + ")" : ""
  }`;

  document.getElementById("modal-reservation-status-display").innerHTML =
    getStatusBadgeHTML(reservation.statut);
  document.getElementById("modal-reservation-comment-display").textContent =
    reservation.commentaire || "-";

  const cancelButton = document.getElementById("modal-cancel-reservation-btn");
  if (reservation.statut === "pending" || reservation.statut === "confirmed") {
    if (cancelButton) {
      cancelButton.classList.remove("hidden");
      cancelButton.onclick = async () => {
        if (confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
          try {
            showNotification("Annulation en cours...", "info");
            await apiRequest(
              `/restaurant/reservations/${reservation.id}/annuler/`,
              "POST"
            ); // Endpoint d'annulation
            showNotification("Réservation annulée avec succès.", "success");
            modal.style.display = "none";
            loadUserReservations();
          } catch (error) {
            console.error(
              "Erreur lors de l'annulation de la réservation:",
              error
            );
            showNotification(`Erreur d'annulation: ${error.message}`, "error");
          }
        }
      };
    }
  } else {
    if (cancelButton) cancelButton.classList.add("hidden");
  }
  modal.style.display = "block";
}

function setupModalCloseEvents() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    const closeButton = modal.querySelector(".close-modal");
    if (closeButton) {
      closeButton.addEventListener(
        "click",
        () => (modal.style.display = "none")
      );
    }
    // Fermer aussi via les boutons spécifiques dans chaque modale
    const specificCloseBtnId =
      modal.id === "order-detail-modal"
        ? "close-order-detail-modal-btn"
        : modal.id === "reservation-detail-modal"
        ? "close-reservation-detail-modal-btn"
        : null;
    if (specificCloseBtnId) {
      const specificCloseBtn = document.getElementById(specificCloseBtnId);
      if (specificCloseBtn) {
        specificCloseBtn.addEventListener(
          "click",
          () => (modal.style.display = "none")
        );
      }
    }
  });
  window.addEventListener("click", function (event) {
    modals.forEach((modal) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  });
}

async function setupProfileForm() {
  const profileForm = document.getElementById("profile-form");
  if (!profileForm) return;
  profileForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    const errorElement = document.getElementById("profile-error");
    const successElement = document.getElementById("profile-success");

    errorElement.classList.add("hidden");
    errorElement.textContent = "";
    successElement.classList.add("hidden");
    successElement.textContent = "";

    const profileData = {
      nom: document.getElementById("profile-nom")?.value,
      prenom: document.getElementById("profile-prenom")?.value,
      telephone: document.getElementById("profile-telephone")?.value,
      adresse: document.getElementById("profile-adresse")?.value,
      // date_naissance: document.getElementById("profile-date-naissance")?.value, // Si vous ajoutez ces champs
      // accepte_newsletter: document.getElementById("profile-newsletter")?.checked,
    };

    const cleanProfileData = Object.fromEntries(
      Object.entries(profileData).filter(
        ([_, v]) => v !== null && v !== undefined && v !== ""
      )
    );

    if (Object.keys(cleanProfileData).length === 0) {
      showNotification("Aucune information à mettre à jour.", "info");
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Enregistrement...";

    try {
      // L'endpoint doit correspondre à votre urls.py pour ProfileUpdateSerializer (souvent /api/auth/profile/ ou /api/auth/profile/update/)
      const response = await apiRequest(
        "/auth/profile/",
        "PATCH",
        cleanProfileData
      );
      // On vérifie que la réponse contient bien l'objet 'user' avant de le sauvegarder
      if (response && response.user) {
        localStorage.setItem("user", JSON.stringify(response.user)); // <--- Ligne corrigée
      } else {
        // Au cas où l'API renverrait une structure inattendue
        console.error(
          "La réponse de l'API ne contient pas d'objet utilisateur valide.",
          response
        );
        throw new Error("Réponse invalide du serveur après la mise à jour.");
      }
      loadUserProfile();
      successElement.textContent =
        "Vos informations ont été mises à jour avec succès!";
      successElement.classList.remove("hidden");
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      let errorMessage = "Erreur lors de la mise à jour.";
      if (error.message) {
        try {
          const errorObj = JSON.parse(error.message);
          errorMessage = Object.entries(errorObj)
            .map(
              ([key, value]) =>
                `${key.replace("_", " ")}: ${
                  Array.isArray(value) ? value.join(", ") : value
                }`
            )
            .join("; ");
        } catch (parseError) {
          errorMessage = error.message;
        }
      }
      errorElement.textContent = errorMessage;
      errorElement.classList.remove("hidden");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
}

async function setupPasswordForm() {
  const passwordForm = document.getElementById("password-form");
  if (!passwordForm) return;
  passwordForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    const errorElement = document.getElementById("password-error");
    const successElement = document.getElementById("password-success");

    errorElement.classList.add("hidden");
    errorElement.textContent = "";
    successElement.classList.add("hidden");
    successElement.textContent = "";

    const passwordData = {
      old_password: document.getElementById("current-password").value,
      new_password: document.getElementById("new-password").value,
      new_password_confirm: document.getElementById("confirm-password").value,
    };

    if (
      !passwordData.old_password ||
      !passwordData.new_password ||
      !passwordData.new_password_confirm
    ) {
      errorElement.textContent = "Veuillez remplir tous les champs.";
      errorElement.classList.remove("hidden");
      return;
    }
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      errorElement.textContent =
        "Les nouveaux mots de passe ne correspondent pas.";
      errorElement.classList.remove("hidden");
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Modification...";

    try {
      await apiRequest("/auth/password/change/", "POST", passwordData); // Endpoint de ChangePasswordSerializer
      successElement.textContent =
        "Votre mot de passe a été modifié avec succès!";
      successElement.classList.remove("hidden");
      passwordForm.reset();
    } catch (error) {
      console.error("Erreur de changement de mot de passe:", error);
      let errorMessage = "Erreur lors du changement de mot de passe.";
      if (error.message) {
        try {
          const errorObj = JSON.parse(error.message);
          if (errorObj.old_password)
            errorMessage = `Ancien mot de passe: ${errorObj.old_password.join(
              " "
            )}`;
          else if (errorObj.new_password)
            errorMessage = `Nouveau mot de passe: ${errorObj.new_password.join(
              " "
            )}`;
          else if (errorObj.detail) errorMessage = errorObj.detail;
          else
            errorMessage = Object.entries(errorObj)
              .map(
                ([key, value]) =>
                  `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
              )
              .join("; ");
        } catch (parseError) {
          errorMessage = error.message;
        }
      }
      errorElement.textContent = errorMessage;
      errorElement.classList.remove("hidden");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
}

// Fonctions utilitaires globales supposées être dans main.js
// function formatDate(dateString) { ... }
// function formatTime(timeString) { ... }
// function formatPrice(price) { ... }
// function getStatusBadgeHTML(status) { ... }
// function showNotification(message, type) { ... }
// function apiRequest(endpoint, method, data) { ... }
// function checkAuthStatus() { ... }
// function getCart() { ... }
// function saveCart(cart) { ... }
// function addToCart(item) { ... }
// function removeFromCart(itemId) { ... }
// function updateCartItemQuantity(itemId, quantity) { ... }
// function clearCart() { ... }

function getDeliveryModeLabel(modeKey) {
  const modes = {
    delivery: "Livraison à domicile",
    pickup: "Retrait en magasin",
  };
  return modes[modeKey] || modeKey;
}
function getPaymentMethodLabel(methodKey) {
  const methods = {
    card: "Carte bancaire",
    cash: "Espèces", // Correspond à la clé backend
    online: "Paiement en ligne",
    // Les valeurs du frontend comme 'especes_livraison' sont mappées vers 'cash' avant l'envoi API
  };
  return methods[methodKey] || methodKey;
}
