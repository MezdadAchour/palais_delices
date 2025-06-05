// reservation.js - Gestion de la page de réservation

document.addEventListener("DOMContentLoaded", function () {
  // Assurez-vous que checkAuthStatus et d'autres fonctions de main.js sont chargées
  if (typeof checkAuthStatus !== "function") {
    console.error("La fonction checkAuthStatus de main.js n'est pas trouvée !");
    // return; // Commentez ou gérez pour permettre le fonctionnement même si main.js a un souci
  }
  if (typeof apiRequest !== "function") {
    console.error("La fonction apiRequest de main.js n'est pas trouvée !");
  }
  if (typeof showNotification !== "function") {
    console.error(
      "La fonction showNotification de main.js n'est pas trouvée !"
    );
  }

  const reservationForm = document.getElementById("reservation-form");
  if (reservationForm) {
    setupReservationForm(reservationForm);
  }

  const token = localStorage.getItem("authToken");
  if (token) {
    const myReservationsSection = document.getElementById(
      "my-reservations-section"
    );
    if (myReservationsSection) {
      myReservationsSection.classList.remove("hidden");
      loadUserReservations();
    }
  } else {
    const myReservationsSection = document.getElementById(
      "my-reservations-section"
    );
    if (myReservationsSection) {
      myReservationsSection.classList.add("hidden");
    }
  }
});

function setupReservationForm(form) {
  const dateInput = document.getElementById("reservation-date");
  if (dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${year}-${month}-${day}`;
  }

  const timeInput = document.getElementById("reservation-time");
  const personsInput = document.getElementById("reservation-persons");

  const updateTablesListener = () => {
    const date = dateInput.value;
    const time = timeInput.value;
    const persons = personsInput.value;
    if (date && time && persons) {
      loadAvailableTables(date, time, persons);
    } else {
      const tablesSelect = document.getElementById("reservation-table");
      tablesSelect.innerHTML =
        '<option value="">Sélectionnez d\'abord date, heure et nombre de personnes</option>';
      tablesSelect.disabled = true;
    }
  };

  if (dateInput && timeInput && personsInput) {
    dateInput.addEventListener("change", updateTablesListener);
    timeInput.addEventListener("change", updateTablesListener);
    personsInput.addEventListener("change", updateTablesListener);
  }

  form.addEventListener("submit", handleReservationSubmit);
}

async function loadAvailableTables(date, time, persons) {
  const tablesSelect = document.getElementById("reservation-table");
  if (!tablesSelect) return;

  tablesSelect.disabled = true;
  tablesSelect.innerHTML = '<option value="">Chargement des tables...</option>';

  try {
    // Correction: Utiliser nb_personnes comme paramètre GET, basé sur l'observation de la réponse API
    // et '/api' est généralement préfixé par la fonction apiRequest ou la configuration de base de l'API.
    // L'URL observée était http://127.0.0.1:8000/api/restaurant/tables/disponibles/?...
    // donc l'endpoint pour apiRequest devrait être /restaurant/tables/disponibles/...
    const endpoint = `/restaurant/tables/disponibles/?date=${date}&heure=${time}&nb_personnes=${persons}`;
    const apiResponse = await apiRequest(endpoint);

    // Correction: Accéder à apiResponse.tables_disponibles basé sur la réponse API observée
    const availableTables =
      apiResponse && apiResponse.tables_disponibles
        ? apiResponse.tables_disponibles
        : Array.isArray(apiResponse) // Fallback au cas où
        ? apiResponse
        : [];

    if (availableTables && availableTables.length > 0) {
      tablesSelect.innerHTML =
        '<option value="">Sélectionnez une table</option>';
      availableTables.forEach((table) => {
        tablesSelect.innerHTML += `
          <option value="${table.id}">
            Table ${table.numero || table.id} (${table.nbPlaces} places${
          table.position ? ", " + table.position : ""
        })
          </option>`;
      });
      tablesSelect.disabled = false;
    } else {
      tablesSelect.innerHTML =
        '<option value="">Aucune table disponible pour ce créneau.</option>';
    }
  } catch (error) {
    console.error("Erreur lors du chargement des tables disponibles:", error);
    let errorMessage = "Erreur lors du chargement des tables.";
    if (error && error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError && typeof parsedError === "object") {
          errorMessage = Object.values(parsedError).flat().join(" ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message;
      }
    }
    showNotification("Erreur chargement tables: " + errorMessage, "error");
    tablesSelect.innerHTML = `<option value="">Erreur: ${errorMessage}</option>`;
  }
}

async function handleReservationSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  const errorElement = document.getElementById("reservation-error");
  const successElement = document.getElementById("reservation-success");
  errorElement.classList.add("hidden");
  successElement.classList.add("hidden");

  const date = document.getElementById("reservation-date").value;
  const time = document.getElementById("reservation-time").value;
  const persons = document.getElementById("reservation-persons").value;
  const tableId = document.getElementById("reservation-table").value;
  const comment = document.getElementById("reservation-comment").value;

  if (!date || !time || !persons || !tableId) {
    errorElement.textContent =
      "Veuillez remplir tous les champs obligatoires (Date, Heure, Personnes et Table).";
    errorElement.classList.remove("hidden");
    return;
  }

  const authToken = localStorage.getItem("authToken");
  if (!authToken) {
    showNotification(
      "Veuillez vous connecter pour faire une réservation.",
      "error"
    );
    return;
  }

  // ----- DÉBUT DE LA MODIFICATION IMPORTANTE -----
  // Récupérer l'ID de l'utilisateur depuis localStorage
  const userString = localStorage.getItem("user");
  let userId = null;
  if (userString) {
    try {
      const userObject = JSON.parse(userString);
      if (userObject && userObject.id) {
        userId = userObject.id;
      }
    } catch (e) {
      console.error(
        "Erreur lors de la lecture des informations utilisateur depuis localStorage:",
        e
      );
    }
  }

  if (!userId) {
    showNotification(
      "Impossible de récupérer vos informations utilisateur. Veuillez vous reconnecter.",
      "error"
    );
    errorElement.textContent =
      "Informations utilisateur non trouvées. Essayez de vous reconnecter.";
    errorElement.classList.remove("hidden");
    return;
  }
  // ----- FIN DE LA MODIFICATION IMPORTANTE -----

  submitButton.disabled = true;
  submitButton.textContent = "Réservation en cours...";

  const reservationData = {
    user: userId, // <--- AJOUT DU CHAMP USER AVEC L'ID DE L'UTILISATEUR
    dateReservation: date,
    heureReservation: time,
    nbPersonnes: parseInt(persons),
    table: parseInt(tableId), // 'table' est le nom attendu par ReservationSerializer pour l'ID de la table.
    commentaire: comment,
    statut: "pending",
  };

  try {
    // L'endpoint pour créer une réservation est /api/restaurant/reservations/
    // apiRequest préfixe avec /api, donc l'endpoint est /restaurant/reservations/
    const response = await apiRequest(
      "/restaurant/reservations/", // Endpoint correct d'après votre log d'erreur
      "POST",
      reservationData
    );

    successElement.textContent = `Réservation #${
      response.id || "confirmée"
    } enregistrée avec succès!`;
    successElement.classList.remove("hidden");
    form.reset();
    const tablesSelect = document.getElementById("reservation-table");
    tablesSelect.innerHTML =
      '<option value="">Sélectionnez d\'abord date, heure et nombre de personnes</option>';
    tablesSelect.disabled = true;

    if (typeof loadUserReservations === "function") {
      loadUserReservations();
    }
    successElement.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Erreur lors de la création de la réservation:", error); //
    let errorMessage = "Une erreur est survenue lors de la réservation.";
    if (error.message) {
      try {
        const errorObj = JSON.parse(error.message);
        // Gérer le cas spécifique de l'erreur {"user":["Ce champ est obligatoire."]}
        if (errorObj.user && Array.isArray(errorObj.user)) {
          errorMessage = `Utilisateur: ${errorObj.user.join(", ")}`;
        } else if (typeof errorObj === "object" && errorObj !== null) {
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
        errorMessage = error.message;
      }
    }
    errorElement.textContent = errorMessage;
    errorElement.classList.remove("hidden");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}

async function loadUserReservations() {
  const reservationsListContainer =
    document.getElementById("reservations-list");
  if (!reservationsListContainer) return;

  const authToken = localStorage.getItem("authToken");
  if (!authToken) {
    reservationsListContainer.innerHTML =
      "<p>Veuillez vous connecter pour voir vos réservations.</p>";
    return;
  }

  reservationsListContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Chargement de vos réservations...</p>
    </div>`;

  try {
    // Endpoint pour récupérer les réservations de l'utilisateur.
    // '/api' est géré par apiRequest.
    // Assurez-vous que cet endpoint est correct et gère la pagination si nécessaire.
    const response = await apiRequest(
      // 'response' et non 'apiResponse' pour éviter conflit de portée si jamais
      `/restaurant/reservations/mes-reservations/` // Cet endpoint doit exister côté backend
    );

    // Supposant que la réponse est paginée par DRF (contient 'results')
    // ou que c'est directement un tableau.
    const reservations =
      response && response.results
        ? response.results
        : Array.isArray(response)
        ? response
        : [];

    if (reservations.length === 0) {
      reservationsListContainer.innerHTML = `
        <div class="empty-message">
          <p>Vous n'avez pas encore de réservations.</p>
          <a href="#reservation-form" class="btn btn-primary" onclick="document.getElementById('reservation-form').scrollIntoView({behavior:'smooth'});">Réserver une table</a>
        </div>`;
      return;
    }

    let html = "";
    reservations.forEach((res) => {
      // ReservationDetailSerializer inclut l'objet 'table' et 'user' complets.
      // Donc res.table devrait contenir les détails de la table.
      const tableInfo = res.table || {
        numero: "N/A",
        position: "N/A",
        nbPlaces: "N/A",
      }; // (table est un champ de ReservationDetailSerializer)
      const userInfo = res.user || { user_nom: "N/A" }; // user_nom est sur ReservationSerializer

      html += `
        <div class="reservation-card" data-id="${res.id}">
          <div class="reservation-card-header">
            <div class="reservation-id">Réservation #${res.id}</div>
            <div class="reservation-status">${getStatusBadgeHTML(
              res.statut // Champ statut vient de ReservationSerializer
            )}</div>
          </div>
          <h3>Table ${tableInfo.numero}</h3>
          <div class="reservation-date-time">
            <div><i class="icon">📅</i> ${formatDate(res.dateReservation)}</div>
            <div><i class="icon">🕒</i> ${formatTime(
              res.heureReservation
            )}</div>
          </div>
          <div class="reservation-persons">
            <i class="icon">👥</i> ${res.nbPersonnes} personne${
        // Champ nbPersonnes vient de ReservationSerializer
        res.nbPersonnes > 1 ? "s" : ""
      }
          </div>
          <div class="reservation-table-position">
            Position: ${tableInfo.position || "N/A"}
          </div>
          ${
            res.commentaire // Champ commentaire vient de ReservationSerializer
              ? `<div class="reservation-comment"><i class="icon">💬</i> ${res.commentaire}</div>`
              : ""
          }
          <div class="reservation-actions">
            <button class="btn btn-outline btn-sm view-reservation-details" data-id="${
              res.id
            }">Voir détails</button>
            ${
              res.statut === "pending" || res.statut === "confirmed"
                ? `
              <button class="btn btn-secondary btn-sm cancel-reservation-action" data-id="${res.id}">Annuler</button>
            `
                : ""
            }
          </div>
        </div>`;
    });
    reservationsListContainer.innerHTML = html;

    reservationsListContainer
      .querySelectorAll(".view-reservation-details")
      .forEach((button) => {
        button.addEventListener("click", function () {
          const reservationId = this.dataset.id;
          const reservation = reservations.find((r) => r.id == reservationId);
          if (reservation) openReservationDetailModal(reservation);
        });
      });

    reservationsListContainer
      .querySelectorAll(".cancel-reservation-action")
      .forEach((button) => {
        button.addEventListener("click", function () {
          const reservationId = this.dataset.id;
          handleCancelReservation(reservationId);
        });
      });
  } catch (error) {
    console.error(
      "Erreur lors du chargement des réservations utilisateur:",
      error
    );
    let errorMessage = "Erreur de chargement de vos réservations.";
    if (error && error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError && typeof parsedError === "object") {
          errorMessage = Object.values(parsedError).flat().join(" ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message;
      }
    }
    showNotification(errorMessage, "error");
    reservationsListContainer.innerHTML = `
      <div class="error-message">
        <p>Une erreur est survenue lors du chargement de vos réservations.</p>
        <button class="btn btn-primary" onclick="loadUserReservations()">Réessayer</button>
      </div>`;
  }
}

function openReservationDetailModal(reservation) {
  const modal = document.getElementById("reservation-detail-modal");
  if (!modal) {
    console.error("Modale 'reservation-detail-modal' non trouvée.");
    return;
  }

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

  // Si ReservationDetailSerializer est utilisé pour GET /mes-reservations/, 'table' est un objet.
  const tableInfo = reservation.table || { numero: "N/A", position: "N/A" }; // (table est un champ de ReservationDetailSerializer)
  document.getElementById(
    "modal-reservation-table-display"
  ).textContent = `Table ${tableInfo.numero} (${tableInfo.position || "N/A"})`;

  const statusElement = document.getElementById(
    "modal-reservation-status-display"
  );
  statusElement.innerHTML = getStatusBadgeHTML(reservation.statut);

  document.getElementById("modal-reservation-comment-display").textContent =
    reservation.commentaire || "-";

  const cancelButton = document.getElementById("modal-cancel-reservation-btn");
  const modifyButton = document.getElementById("modal-modify-reservation-btn"); // Actuellement commenté

  if (reservation.statut === "pending" || reservation.statut === "confirmed") {
    if (cancelButton) {
      cancelButton.classList.remove("hidden");
      cancelButton.dataset.id = reservation.id;
      cancelButton.onclick = () => {
        modal.style.display = "none";
        handleCancelReservation(reservation.id);
      };
    }
    // if (modifyButton) { // Si vous l'implémentez
    //   modifyButton.classList.remove('hidden');
    //   modifyButton.dataset.id = reservation.id;
    //   // modifyButton.onclick = () => { /* ... handle modification ... */ };
    // }
  } else {
    if (cancelButton) cancelButton.classList.add("hidden");
    // if (modifyButton) modifyButton.classList.add("hidden");
  }

  modal.style.display = "block";
}

async function handleCancelReservation(reservationId) {
  if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
    return;
  }

  try {
    showNotification("Annulation en cours...", "info");
    // Assurez-vous que cet endpoint pour annuler existe et utilise POST ou PATCH/PUT comme attendu.
    // L'URL '/api' est gérée par apiRequest.
    await apiRequest(
      `/restaurant/reservations/${reservationId}/annuler/`, // Cet endpoint doit exister
      "POST" // Ou la méthode HTTP correcte définie par votre API (PATCH, DELETE etc.)
    );

    showNotification("La réservation a été annulée avec succès.", "success");
    if (typeof loadUserReservations === "function") {
      loadUserReservations(); // Recharger les réservations
    }
    const modal = document.getElementById("reservation-detail-modal");
    if (modal) modal.style.display = "none"; // Fermer la modale si elle était ouverte
  } catch (error) {
    console.error(
      `Erreur lors de l'annulation de la réservation ${reservationId}:`,
      error
    );
    let errorMessage = "Erreur d'annulation.";
    if (error && error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError && typeof parsedError === "object") {
          errorMessage = Object.values(parsedError).flat().join(" ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message;
      }
    }
    showNotification(`Erreur d'annulation: ${errorMessage}`, "error");
  }
}

// Fonctions utilitaires (normalement dans main.js ou un fichier partagé)
// Assurez-vous que ces fonctions sont définies et accessibles.
// Si elles ne sont pas dans main.js ou globalement, vous devrez les inclure ici
// ou vous assurer qu'elles sont correctement importées/chargées.

// Exemple de fonction formatDate (à adapter ou s'assurer qu'elle existe)
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "long", day: "numeric" };
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  } catch (e) {
    return dateString; // Fallback
  }
}

// Exemple de fonction formatTime (à adapter ou s'assurer qu'elle existe)
function formatTime(timeString) {
  if (!timeString) return "N/A";
  // timeString est attendu au format HH:MM:SS ou HH:MM
  const parts = String(timeString).split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeString; // Fallback
}

// Exemple de fonction getStatusBadgeHTML (à adapter ou s'assurer qu'elle existe)
function getStatusBadgeHTML(status) {
  let badgeClass = "status-badge--pending"; // Classe par défaut
  let statusText = "En attente";

  if (status === "confirmed") {
    badgeClass = "status-badge--confirmed";
    statusText = "Confirmée";
  } else if (status === "cancelled") {
    badgeClass = "status-badge--cancelled";
    statusText = "Annulée";
  } else if (status === "completed") {
    badgeClass = "status-badge--completed";
    statusText = "Terminée";
  }
  // Ajoutez d'autres statuts si nécessaire

  return `<span class="status-badge ${badgeClass}">${statusText}</span>`;
}

// Les fonctions showNotification et apiRequest sont supposées être définies dans main.js
// et gérer le préfixe /api/ pour apiRequest.
