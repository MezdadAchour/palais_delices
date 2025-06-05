// commande.js - Gestion de la page et du processus de commande

document.addEventListener("DOMContentLoaded", function () {
  // S'assurer que l'utilisateur est connecté pour accéder à cette page
  const isLoggedIn =
    (typeof checkAuthStatus === "function" && checkAuthStatus()) ||
    !!localStorage.getItem("authToken");
  const currentPath = window.location.pathname;

  // Rediriger vers login si non connecté et essayant d'accéder à la page de commande
  // La logique dans placeOrder gère aussi cela au moment de payer.
  // Cette redirection immédiate peut être préférée pour ne pas laisser l'utilisateur remplir le formulaire.
  if (
    !isLoggedIn &&
    (currentPath.includes("/commander") ||
      currentPath.includes("/commande.html"))
  ) {
    const loginPageUrl = "/login/"; // Ajustez si votre URL de login est différente
    const commanderPageUrl = "/commander/"; // Ajustez si votre URL de commande est différente
    showNotification(
      "Veuillez vous connecter pour accéder à la page de commande.",
      "info"
    );
    // Sauvegarder le panier actuel avant de rediriger, au cas où il y aurait des articles
    const cart = getCart();
    if (cart && cart.items && cart.items.length > 0) {
      localStorage.setItem("pendingOrderData", JSON.stringify(cart));
    }
    window.location.href = `${loginPageUrl}?redirect=${encodeURIComponent(
      commanderPageUrl
    )}`;
    return; // Arrêter l'exécution si redirigé
  }

  loadCartItems();
  setupStepNavigation();
  loadDeliveryInfoFromProfile(); // Charger les infos de livraison depuis le profil utilisateur

  const placeOrderButton = document.getElementById("place-order");
  if (placeOrderButton) {
    placeOrderButton.addEventListener("click", placeOrder);
  }

  const deliveryOptions = document.querySelectorAll(
    'input[name="deliveryOption"]'
  );
  deliveryOptions.forEach((option) => {
    option.addEventListener("change", updateDeliveryFeeAndTotals);
  });

  const paymentOptions = document.querySelectorAll(
    'input[name="methodePaiement"]'
  );
  paymentOptions.forEach((option) => {
    option.addEventListener("change", togglePaymentFields);
  });

  updateDeliveryFeeAndTotals();
  togglePaymentFields();
  updatePaymentButtonTotal();

  // Vérifier s'il y a des données de commande en attente (après connexion)
  const pendingOrderDataString = localStorage.getItem("pendingOrderData");
  if (pendingOrderDataString) {
    try {
      const pendingCart = JSON.parse(pendingOrderDataString);
      if (pendingCart && pendingCart.items && pendingCart.items.length > 0) {
        // Restaurer le panier
        saveCart(pendingCart); // saveCart est supposée être dans main.js
        loadCartItems(); // Recharger les articles dans la page de commande
        showNotification("Votre panier précédent a été restauré.", "success");
      }
    } catch (e) {
      console.error("Erreur lors de la restauration du panier en attente:", e);
    }
    localStorage.removeItem("pendingOrderData"); // Nettoyer après tentative de restauration
  }
});

function loadDeliveryInfoFromProfile() {
  const userString = localStorage.getItem("user");
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (document.getElementById("delivery-name"))
        document.getElementById("delivery-name").value = `${
          user.prenom || ""
        } ${user.nom || ""}`.trim();
      if (document.getElementById("delivery-phone"))
        document.getElementById("delivery-phone").value = user.telephone || "";
      if (document.getElementById("delivery-email"))
        document.getElementById("delivery-email").value = user.email || "";
      // L'adresse peut être plus complexe (adresse, ville, code postal)
      // Si user.adresse est un champ texte simple :
      if (document.getElementById("delivery-address") && user.adresse) {
        document.getElementById("delivery-address").value = user.adresse;
      }
      // Pour ville et code postal, vous pourriez avoir besoin de champs séparés dans le profil
      // ou d'une logique pour parser user.adresse si elle est structurée.
    } catch (e) {
      console.error(
        "Erreur lors du chargement des informations de livraison depuis le profil:",
        e
      );
    }
  }
}

function loadCartItems() {
  const cartItemsContainer = document.getElementById("checkout-cart-items");
  if (!cartItemsContainer) return;

  const cart = getCart();

  const toStep2Button = document.getElementById("to-step-2");

  if (!cart || !cart.items || cart.items.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <p>Votre panier est vide.</p>
        <a href="/menu/" class="btn btn-secondary">Découvrir notre menu</a>
      </div>
    `;
    if (toStep2Button) toStep2Button.disabled = true;
    updateCartTotals();
    return;
  }

  if (toStep2Button) toStep2Button.disabled = false;

  let html = "";
  cart.items.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    const itemTotal = price * quantity;
    const imageUrl = item.image || "/static/images/default-plat.png"; // Chemin vers une image par défaut

    html += `
      <div class="checkout-cart-item" data-id="${item.id}">
        <div class="checkout-item-image">
          <img src="${imageUrl}" alt="${
      item.name || "Plat"
    }" onerror="this.onerror=null;this.src='/static/images/default-plat.png';">
        </div>
        <div class="checkout-item-info">
          <div class="checkout-item-title">${item.name || "Plat inconnu"}</div>
          <div class="checkout-item-price">${formatPrice(
            price
          )} x ${quantity}</div>
        </div>
        <div class="checkout-item-quantity">
          <button class="quantity-btn minus" data-id="${
            item.id
          }" aria-label="Réduire la quantité">-</button>
          <input type="number" value="${quantity}" min="0" max="100" data-id="${
      item.id
    }" aria-label="Quantité">
          <button class="quantity-btn plus" data-id="${
            item.id
          }" aria-label="Augmenter la quantité">+</button>
        </div>
        <div class="checkout-item-total">${formatPrice(itemTotal)}</div>
        <button class="checkout-item-remove" data-id="${
          item.id
        }" aria-label="Retirer l'article">&times;</button>
      </div>
    `;
  });
  cartItemsContainer.innerHTML = html;
  updateCartTotals();
  addCartItemEventListeners();
}

function addCartItemEventListeners() {
  const cartItemsContainer = document.getElementById("checkout-cart-items");
  if (!cartItemsContainer) return;

  cartItemsContainer
    .querySelectorAll(".quantity-btn.minus")
    .forEach((button) => {
      button.addEventListener("click", function () {
        const itemId = parseInt(this.dataset.id);
        const quantityInput = this.parentElement.querySelector(
          'input[type="number"]'
        );
        let quantity = parseInt(quantityInput.value);
        if (quantity > 1) {
          quantity--;
          updateCartItemQuantity(itemId, quantity);
          loadCartItems();
        } else {
          // Si la quantité devient 1 et on clique moins, on retire l'article
          removeFromCart(itemId);
          loadCartItems();
        }
      });
    });

  cartItemsContainer
    .querySelectorAll(".quantity-btn.plus")
    .forEach((button) => {
      button.addEventListener("click", function () {
        const itemId = parseInt(this.dataset.id);
        const quantityInput = this.parentElement.querySelector(
          'input[type="number"]'
        );
        let quantity = parseInt(quantityInput.value);
        if (quantity < 100) {
          // Limite max
          quantity++;
          updateCartItemQuantity(itemId, quantity);
          loadCartItems();
        }
      });
    });

  cartItemsContainer
    .querySelectorAll(".checkout-item-quantity input")
    .forEach((input) => {
      input.addEventListener("change", function () {
        const itemId = parseInt(this.dataset.id);
        let quantity = parseInt(this.value);
        if (isNaN(quantity) || quantity <= 0) {
          removeFromCart(itemId); // Retire si la quantité est invalide ou nulle
        } else {
          if (quantity > 100) quantity = 100; // Limite max
          updateCartItemQuantity(itemId, quantity);
        }
        loadCartItems();
      });
    });

  cartItemsContainer
    .querySelectorAll(".checkout-item-remove")
    .forEach((button) => {
      button.addEventListener("click", function () {
        const itemId = parseInt(this.dataset.id);
        removeFromCart(itemId);
        loadCartItems();
      });
    });
}

function updateCartTotals() {
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartDeliveryFeeEl = document.getElementById("cart-delivery-fee");
  const cartTotalEl = document.getElementById("cart-total");

  if (!cartSubtotalEl || !cartDeliveryFeeEl || !cartTotalEl) return;

  const cart = getCart();
  const subtotal = cart.total;
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;

  cartSubtotalEl.textContent = formatPrice(subtotal);
  cartDeliveryFeeEl.textContent = formatPrice(deliveryFee);
  cartTotalEl.textContent = formatPrice(total);
  updatePaymentButtonTotal();
}

function getDeliveryFee() {
  const selectedOption = document.querySelector(
    'input[name="deliveryOption"]:checked'
  );
  if (!selectedOption) return 0; // Valeur par défaut si rien n'est sélectionné

  switch (selectedOption.value) {
    case "standard":
      return 2.99; // Correspond à la value 'standard' dans commande.html
    case "express":
      return 4.99; // Correspond à la value 'express' dans commande.html
    case "pickup":
      return 0.0; // Correspond à la value 'pickup' dans commande.html
    default:
      return 0;
  }
}

function updateDeliveryFeeAndTotals() {
  updateCartTotals();
  const deliveryTimeElement = document.getElementById("delivery-time");
  if (deliveryTimeElement) {
    const selectedOption = document.querySelector(
      'input[name="deliveryOption"]:checked'
    );
    if (selectedOption) {
      switch (selectedOption.value) {
        case "standard":
          deliveryTimeElement.textContent = "30-45 minutes";
          break;
        case "express":
          deliveryTimeElement.textContent = "15-20 minutes";
          break;
        case "pickup":
          deliveryTimeElement.textContent = "15 minutes (à emporter)";
          break;
        default:
          deliveryTimeElement.textContent = "N/A";
      }
    }
  }
}

function togglePaymentFields() {
  const selectedPayment = document.querySelector(
    'input[name="methodePaiement"]:checked'
  );
  const cardFields = document.getElementById("card-payment-fields");
  if (!cardFields) return;

  if (selectedPayment && selectedPayment.value === "carte") {
    // 'carte' est la value dans commande.html
    cardFields.classList.remove("hidden");
    // cardFields.style.display = 'block'; // La classe CSS devrait gérer ça
    cardFields
      .querySelectorAll("input")
      .forEach((input) => (input.required = true));
  } else {
    cardFields.classList.add("hidden");
    // cardFields.style.display = 'none';
    cardFields.querySelectorAll("input").forEach((input) => {
      input.required = false;
      input.value = ""; // Optionnel: vider les champs si on change de méthode
    });
  }
}

function updatePaymentButtonTotal() {
  const paymentTotalAmountEl = document.getElementById("payment-total-amount");
  const cart = getCart();
  const deliveryFee = getDeliveryFee();
  const total = cart.total + deliveryFee;
  if (paymentTotalAmountEl) {
    paymentTotalAmountEl.textContent = `(${formatPrice(total)})`;
  }
}

function setupStepNavigation() {
  const toStep2Button = document.getElementById("to-step-2");
  const toStep3Button = document.getElementById("to-step-3");
  const backToStep1Button = document.getElementById("back-to-step-1");
  const backToStep2Button = document.getElementById("back-to-step-2");

  if (toStep2Button) {
    toStep2Button.addEventListener("click", () => {
      const cart = getCart();
      if (cart.items.length > 0) {
        // N'autoriser le passage que si le panier n'est pas vide
        goToStep(2);
      } else {
        showNotification(
          "Votre panier est vide. Veuillez ajouter des articles pour continuer.",
          "error"
        );
      }
    });
  }
  if (toStep3Button) {
    toStep3Button.addEventListener("click", () => {
      const deliveryForm = document.getElementById("delivery-form");
      if (deliveryForm.checkValidity()) {
        goToStep(3);
      } else {
        deliveryForm.reportValidity();
        showNotification(
          "Veuillez remplir tous les champs de livraison obligatoires.",
          "error"
        );
      }
    });
  }
  if (backToStep1Button) {
    backToStep1Button.addEventListener("click", () => goToStep(1));
  }
  if (backToStep2Button) {
    backToStep2Button.addEventListener("click", () => goToStep(2));
  }
}

function goToStep(stepNumber) {
  const steps = document.querySelectorAll(".step");
  const stepContents = document.querySelectorAll(".order-step-content");

  steps.forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.remove("active", "completed");
    if (stepNum < stepNumber) step.classList.add("completed");
    if (stepNum === stepNumber) step.classList.add("active");
  });

  stepContents.forEach((content) => content.classList.remove("active"));
  const activeContent = document.getElementById(`step-${stepNumber}-content`);
  if (activeContent) activeContent.classList.add("active");

  const orderContainer = document.querySelector(".order-container");
  if (orderContainer) {
    orderContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function placeOrder() {
  const isLoggedIn =
    (typeof checkAuthStatus === "function" && checkAuthStatus()) ||
    !!localStorage.getItem("authToken");

  if (!isLoggedIn) {
    const cart = getCart();
    if (cart && cart.items && cart.items.length > 0) {
      localStorage.setItem("pendingOrderData", JSON.stringify(cart));
    }
    const loginPageUrl = "/login/";
    const commanderPageUrl = "/commander/";
    showNotification(
      "Veuillez vous connecter pour finaliser votre commande.",
      "info"
    );
    window.location.href = `${loginPageUrl}?redirect=${encodeURIComponent(
      commanderPageUrl
    )}`;
    return;
  }

  const deliveryForm = document.getElementById("delivery-form");
  if (!deliveryForm.checkValidity()) {
    goToStep(2); // Ramener à l'étape de livraison si invalide
    deliveryForm.reportValidity();
    showNotification(
      "Veuillez vérifier les informations de livraison.",
      "error"
    );
    return;
  }

  const paymentForm = document.getElementById("payment-form");
  if (!paymentForm.checkValidity()) {
    paymentForm.reportValidity();
    showNotification(
      "Veuillez vérifier les informations de paiement.",
      "error"
    );
    return;
  }

  const paymentMethodInput = document.querySelector(
    'input[name="methodePaiement"]:checked'
  );
  if (!paymentMethodInput) {
    showNotification("Veuillez choisir un mode de paiement.", "error");
    return;
  }

  const placeOrderButton = document.getElementById("place-order");
  const originalButtonText = placeOrderButton.textContent;
  placeOrderButton.disabled = true;
  placeOrderButton.textContent = "Traitement en cours...";
  const orderErrorElement = document.getElementById("order-error");
  orderErrorElement.classList.add("hidden");
  orderErrorElement.textContent = ""; // Vider les messages d'erreur précédents

  const cart = getCart();
  if (!cart || !cart.items || cart.items.length === 0) {
    showNotification(
      "Votre panier est vide. Impossible de passer la commande.",
      "error"
    );
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = originalButtonText;
    goToStep(1); // Ramener à l'étape du panier
    return;
  }

  const deliveryOptionInput = document.querySelector(
    'input[name="deliveryOption"]:checked'
  );
  const deliveryFee = getDeliveryFee();
  const totalAmount = cart.total + deliveryFee;

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  if (!user || !user.id) {
    showNotification(
      "Erreur: Informations utilisateur non trouvées. Veuillez vous reconnecter.",
      "error"
    );
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = originalButtonText;
    // Optionnel: rediriger vers login
    // window.location.href = '/login/?redirect=/commander/';
    return;
  }

  let modeLivraisonPayload = "delivery"; // Valeur par défaut
  if (deliveryOptionInput) {
    if (deliveryOptionInput.value === "pickup") modeLivraisonPayload = "pickup";
    // 'standard' et 'express' correspondent à 'delivery' dans le modèle Django.
    else if (
      deliveryOptionInput.value === "standard" ||
      deliveryOptionInput.value === "express"
    )
      modeLivraisonPayload = "delivery";
  }

  let modePaiementPayload = "";
  if (paymentMethodInput) {
    switch (paymentMethodInput.value) {
      case "carte":
        modePaiementPayload = "card";
        break; // 'card' est la clé backend
      case "especes_livraison":
        modePaiementPayload = "cash";
        break; // 'cash' est la clé backend
      case "paypal":
        modePaiementPayload = "online";
        break; // 'online' est la clé backend
      default:
        showNotification("Mode de paiement sélectionné non valide.", "error");
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = originalButtonText;
        return;
    }
  }

  const orderPayload = {
    // user: user.id, // Géré par CurrentUserDefault ou explicitement dans serializer.create
    modeLivraison: modeLivraisonPayload,
    modePaiement: modePaiementPayload,
    fraisLivraison: deliveryFee.toFixed(2),
    adresseLivraison:
      document.getElementById("delivery-address")?.value || null, // Envoyer null si vide
    telephoneContact: document.getElementById("delivery-phone")?.value || null, // Envoyer null si vide
    commentaire: document.getElementById("order-comment")?.value || "",
    lignes_commande: cart.items.map((item) => ({
      plat: item.id, // 'plat' est attendu par LigneCommandeSerializer et prendra l'ID
      quantite: item.quantity,
      prixUnitaire: parseFloat(item.price).toFixed(2),
    })),
  };

  // Concaténer les infos de livraison dans le commentaire principal si besoin
  let deliveryDetailsForComment = "";
  const deliveryName = document.getElementById("delivery-name")?.value;
  const deliveryAddress = document.getElementById("delivery-address")?.value;
  const deliveryCity = document.getElementById("delivery-city")?.value; // Supposant que vous avez ce champ
  const deliveryPhone = document.getElementById("delivery-phone")?.value;
  const deliveryInstructions = document.getElementById(
    "delivery-instructions"
  )?.value;

  if (modeLivraisonPayload === "delivery" && deliveryName && deliveryAddress) {
    deliveryDetailsForComment = `Livraison pour: ${deliveryName}, Adresse: ${deliveryAddress}`;
    if (deliveryCity) deliveryDetailsForComment += `, ${deliveryCity}`;
    if (deliveryPhone) deliveryDetailsForComment += `, Tél: ${deliveryPhone}.`;
    if (deliveryOptionInput)
      deliveryDetailsForComment += ` Option: ${deliveryOptionInput.value}.`;
    if (deliveryInstructions)
      deliveryDetailsForComment += ` Instructions: ${deliveryInstructions}`;
  } else if (modeLivraisonPayload === "pickup" && deliveryName) {
    deliveryDetailsForComment = `À emporter pour: ${deliveryName}`;
    if (deliveryPhone) deliveryDetailsForComment += `, Tél: ${deliveryPhone}.`;
  }

  if (deliveryDetailsForComment) {
    orderPayload.commentaire = orderPayload.commentaire
      ? `${orderPayload.commentaire.trim()}\n${deliveryDetailsForComment}`
      : deliveryDetailsForComment;
  }
  if (orderPayload.commentaire === "") {
    // Ne pas envoyer un commentaire vide si pas nécessaire
    delete orderPayload.commentaire;
  }
  if (orderPayload.modeLivraison === "pickup") {
    // Pas d'adresse ou de frais pour pickup
    delete orderPayload.adresseLivraison;
    orderPayload.fraisLivraison = "0.00"; // S'assurer que les frais sont à 0 pour pickup
  }

  console.log(
    "Envoi des données de commande:",
    JSON.stringify(orderPayload, null, 2)
  );

  try {
    const responseData = await apiRequest(
      "/orders/commandes/",
      "POST",
      orderPayload
    );

    document.getElementById("order-number").textContent = `#${
      responseData.commande.numero_commande || responseData.commande.id
    }`;
    document.getElementById("order-date").textContent = formatDate(
      responseData.commande.dateCommande || new Date().toISOString()
    );
    document.getElementById("order-amount").textContent = formatPrice(
      parseFloat(responseData.commande.montant) +
        parseFloat(responseData.commande.fraisLivraison)
    );

    const deliveryOptionLabel = deliveryOptionInput
      ? deliveryOptionInput.labels[0].querySelector(".radio-title").textContent
      : "N/A";
    document.getElementById("order-delivery").textContent = deliveryOptionLabel;

    clearCart();
    localStorage.removeItem("pendingOrderData");
    goToStep(4);
  } catch (error) {
    console.error("Erreur lors de la création de la commande:", error);
    let errorMessage =
      "La création de la commande a échoué. Veuillez réessayer.";
    if (error.message) {
      try {
        const errorObj = JSON.parse(error.message);
        if (typeof errorObj === "object" && errorObj !== null) {
          // Formatter les erreurs de DRF (qui sont souvent des dictionnaires de listes)
          errorMessage = Object.entries(errorObj)
            .map(([key, value]) => {
              const fieldName = key
                .replace("lignes_commande", "Articles")
                .replace(/_/g, " "); // Traduction simple
              const messages = Array.isArray(value)
                ? value.join(", ")
                : typeof value === "object"
                ? JSON.stringify(value)
                : value;
              return `${
                fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
              }: ${messages}`;
            })
            .join("\n");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message; // Si error.message n'est pas du JSON
      }
    }
    orderErrorElement.innerHTML = errorMessage.replace(/\n/g, "<br>"); // Afficher les retours à la ligne
    orderErrorElement.classList.remove("hidden");
    orderErrorElement.scrollIntoView({ behavior: "smooth" });
  } finally {
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = originalButtonText;
  }
}

// S'assurer que les fonctions utilitaires (getCart, formatPrice, etc.) sont disponibles
// (elles sont supposées être dans main.js ou un fichier utilitaire global)
