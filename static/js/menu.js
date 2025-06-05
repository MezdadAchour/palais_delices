// menu.js - Fichier pour la gestion de la page du menu et du panier

document.addEventListener("DOMContentLoaded", function () {
  // Charger les catégories et les plats du menu depuis l'API
  loadCategories();
  loadMenuItems();

  // Configuration des interactions du panier d'achat
  const cartToggle = document.getElementById("cart-toggle");
  const cartSidebar = document.getElementById("cart-sidebar");
  const cartOverlay = document.getElementById("cart-overlay");
  const closeCartButton = document.querySelector(".close-cart");

  if (cartToggle && cartSidebar && cartOverlay && closeCartButton) {
    cartToggle.addEventListener("click", function () {
      cartSidebar.classList.add("active");
      cartOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
      renderCartItems();
    });

    function hideCart() {
      cartSidebar.classList.remove("active");
      cartOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }

    closeCartButton.addEventListener("click", hideCart);
    cartOverlay.addEventListener("click", hideCart);
  }

  // Configuration de la modale pour les détails d'un plat
  const menuItemModal = document.getElementById("menu-item-modal");
  const closeModalButton = menuItemModal
    ? menuItemModal.querySelector(".close-modal")
    : null;
  const decreaseQuantity = document.getElementById("decrease-quantity");
  const increaseQuantity = document.getElementById("increase-quantity");
  const itemQuantityInput = document.getElementById("item-quantity");
  const addToCartBtnModal = document.getElementById("add-to-cart");

  if (closeModalButton) {
    closeModalButton.addEventListener("click", function () {
      menuItemModal.style.display = "none";
    });
  }
  window.addEventListener("click", function (event) {
    if (event.target === menuItemModal) {
      menuItemModal.style.display = "none";
    }
  });

  if (decreaseQuantity && increaseQuantity && itemQuantityInput) {
    decreaseQuantity.addEventListener("click", function () {
      const currentValue = parseInt(itemQuantityInput.value);
      if (currentValue > 1) {
        itemQuantityInput.value = currentValue - 1;
      }
    });

    increaseQuantity.addEventListener("click", function () {
      const currentValue = parseInt(itemQuantityInput.value);
      if (currentValue < 10) {
        itemQuantityInput.value = currentValue + 1;
      }
    });
  }

  if (addToCartBtnModal) {
    addToCartBtnModal.addEventListener("click", function () {
      const itemId = parseInt(this.dataset.itemId);
      const itemName = document.getElementById("modal-item-name").textContent;
      const itemPrice = parseFloat(this.dataset.itemPrice);
      const itemImage = document.getElementById("modal-item-image").src;
      const quantity = parseInt(itemQuantityInput.value);

      if (
        isNaN(itemId) ||
        !itemName ||
        isNaN(itemPrice) ||
        isNaN(quantity) ||
        quantity <= 0
      ) {
        showNotification(
          "Erreur : Informations de l'article invalides.",
          "error"
        );
        return;
      }

      const item = {
        id: itemId,
        name: itemName,
        price: itemPrice,
        image: itemImage,
        quantity: quantity,
      };

      addToCart(item);

      menuItemModal.style.display = "none";
      showNotification(`${itemName} ajouté au panier.`);
      updateCartCount();
    });
  }
  updateCartCount();
});

async function loadCategories() {
  const categoryNav = document.getElementById("category-nav");
  if (!categoryNav) {
    console.error("Élément 'category-nav' non trouvé.");
    return;
  }

  try {
    const apiResponse = await apiRequest("/menu/categories/");

    const categoriesFromAPI =
      apiResponse && apiResponse.results ? apiResponse.results : null;

    if (!categoriesFromAPI || categoriesFromAPI.length === 0) {
      console.warn(
        "Aucune catégorie reçue de l'API ou API a retourné un tableau vide dans 'results'."
      );
      categoryNav.innerHTML =
        "<li>Aucune catégorie disponible pour le moment.</li>";
      return;
    }

    let allOptionLi = categoryNav.querySelector(
      'li a[data-category="all"]'
    )?.parentElement;
    categoryNav.innerHTML = "";

    if (allOptionLi) {
      categoryNav.appendChild(allOptionLi);
    } else {
      allOptionLi = document.createElement("li");
      allOptionLi.innerHTML = `<a href="#" class="active" data-category="all">Tous les plats</a>`;
      categoryNav.appendChild(allOptionLi);
    }

    categoriesFromAPI.forEach((category) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="#" data-category="${category.id}">${category.nom}</a>`;
      categoryNav.appendChild(li);
    });

    const categoryLinks = categoryNav.querySelectorAll("a");
    categoryLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        categoryLinks.forEach((l) => l.classList.remove("active"));
        this.classList.add("active");
        const categoryId = this.dataset.category;
        filterMenuItems(categoryId); // Appel à la fonction de filtrage
      });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("categorie");
    let activeLinkFound = false;

    if (categoryParam) {
      const categoryLink = categoryNav.querySelector(
        `a[data-category="${categoryParam}"]`
      );
      if (categoryLink) {
        categoryLink.click();
        activeLinkFound = true;
      }
    }

    if (
      !activeLinkFound &&
      categoryNav.querySelector('a[data-category="all"]')
    ) {
      categoryNav
        .querySelector('a[data-category="all"]')
        .classList.add("active");
    }
  } catch (error) {
    console.error("Erreur lors du chargement des catégories:", error);
    categoryNav.innerHTML = "<li>Erreur de chargement des catégories.</li>";
  }
}

async function loadMenuItems() {
  const menuItemsContainer = document.getElementById("menu-items");
  if (!menuItemsContainer) {
    console.error("Élément 'menu-items' non trouvé.");
    return;
  }

  menuItemsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement du menu...</p>
      </div>`;

  try {
    const apiResponse = await apiRequest("/menu/plats/");

    const menuItemsFromAPI =
      apiResponse && apiResponse.results ? apiResponse.results : null;

    if (!menuItemsFromAPI || menuItemsFromAPI.length === 0) {
      console.warn(
        "Aucun plat reçu de l'API ou API a retourné un tableau vide dans 'results'."
      );
      menuItemsContainer.innerHTML = `<div class="empty-message"><p>Aucun plat disponible pour le moment.</p></div>`;
      window.allMenuItems = [];
      return;
    }

    // Log pour voir la structure d'un item brut de l'API
    if (menuItemsFromAPI.length > 0) {
      console.log(
        "[Debug LoadItems] Structure of a raw item from API:",
        JSON.parse(JSON.stringify(menuItemsFromAPI[0]))
      );
    }

    window.allMenuItems = menuItemsFromAPI.map((item) => ({
      id: item.id,
      nom: item.nom,
      description: item.description,
      prix: parseFloat(item.prix),
      disponible: item.disponible,
      photo: item.photo_url,
      // *** CORRECTION APPLIQUÉE ICI ***
      // Directement utiliser item.categorie si c'est l'ID, et item.categorie_nom pour le nom.
      categorie_id: item.categorie, // Assumant que item.categorie de l'API est l'ID numérique
      categorie: { id: item.categorie, nom: item.categorie_nom }, // Reconstruire l'objet pour l'affichage
    }));

    // Log pour vérifier les données mappées
    if (window.allMenuItems.length > 0) {
      console.log(
        "[Debug LoadItems] Structure of a mapped item:",
        JSON.parse(JSON.stringify(window.allMenuItems[0]))
      );
    }

    const activeCategoryLink = document.querySelector("#category-nav a.active");
    let categoryToFilter = "all";
    if (activeCategoryLink) {
      categoryToFilter = activeCategoryLink.dataset.category;
    }
    filterMenuItems(categoryToFilter);
  } catch (error) {
    console.error("Erreur lors du chargement des plats du menu:", error);
    menuItemsContainer.innerHTML = `
          <div class="error-message">
            <p>Une erreur est survenue lors du chargement du menu. Veuillez réessayer.</p>
            <button class="btn btn-primary" onclick="loadMenuItems()">Réessayer</button>
          </div>`;
  }
}

function renderMenuItems(itemsToRender) {
  const menuItemsContainer = document.getElementById("menu-items");
  if (!menuItemsContainer) return;

  if (!itemsToRender || itemsToRender.length === 0) {
    menuItemsContainer.innerHTML = `
          <div class="empty-message">
            <p>Aucun plat trouvé pour cette catégorie.</p>
          </div>`;
    return;
  }

  let html = "";
  itemsToRender.forEach((item) => {
    html += `
          <div class="menu-item" data-id="${item.id}" data-category="${
      item.categorie_id
    }">
            <div class="menu-item-image">
              <img src="${
                item.photo ||
                "https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Indisponible"
              }" alt="${
      item.nom
    }" onerror="this.onerror=null;this.src='https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Erreur';">
              <span class="category-label">${
                item.categorie?.nom || "N/A"
              }</span>
            </div>
            <div class="menu-item-content">
              <h3 class="menu-item-title">${item.nom}</h3>
              <p class="menu-item-description">${
                item.description || "Pas de description disponible."
              }</p>
              <div class="menu-item-price">${formatPrice(item.prix)}</div>
            </div>
          </div>`;
  });
  menuItemsContainer.innerHTML = html;

  const menuItemElements = menuItemsContainer.querySelectorAll(".menu-item");
  menuItemElements.forEach((element) => {
    element.addEventListener("click", function () {
      const itemId = parseInt(this.dataset.id);
      openMenuItemModal(itemId);
    });
  });
}

function filterMenuItems(categoryId) {
  // Log pour débogage du filtrage
  console.log(
    `[Debug Filter] Attempting to filter for categoryId: '${categoryId}' (type: ${typeof categoryId})`
  );

  const itemsToDisplay = window.allMenuItems || [];
  // Log pour voir tous les items avant filtrage
  // console.log('[Debug Filter] All items available for filtering:', JSON.parse(JSON.stringify(itemsToDisplay)));

  if (categoryId === "all" || !categoryId) {
    console.log("[Debug Filter] Showing all items.");
    renderMenuItems(itemsToDisplay);
  } else {
    const parsedCategoryId = parseInt(categoryId);
    console.log(
      `[Debug Filter] Parsed categoryId to filter with (number): ${parsedCategoryId}`
    );

    const filteredItems = itemsToDisplay.filter((item) => {
      console.log(
        `[Debug Filter] Item: "${item.nom}", item.categorie_id: ${
          item.categorie_id
        } (type: ${typeof item.categorie_id}), Comparing with: ${parsedCategoryId} (type: ${typeof parsedCategoryId})`
      );
      // S'assurer que item.categorie_id est aussi un nombre pour une comparaison stricte, ou utiliser == si les types peuvent varier et que la conversion est souhaitée.
      // Si item.categorie_id peut être null/undefined, il faut le gérer.
      return item.categorie_id === parsedCategoryId;
    });

    console.log(
      "[Debug Filter] Items after filtering:",
      JSON.parse(JSON.stringify(filteredItems))
    );
    renderMenuItems(filteredItems);
  }
}

function openMenuItemModal(itemId) {
  const allItems = window.allMenuItems || [];
  const item = allItems.find((p) => p.id === itemId);

  if (!item) {
    console.error(`Plat avec ID ${itemId} non trouvé.`);
    showNotification("Détails du plat non disponibles.", "error");
    return;
  }

  const modal = document.getElementById("menu-item-modal");
  const modalItemImage = document.getElementById("modal-item-image");
  const modalItemName = document.getElementById("modal-item-name");
  const modalItemDescription = document.getElementById(
    "modal-item-description"
  );
  const modalItemPrice = document.getElementById("modal-item-price");
  const itemQuantityInputModal = document.getElementById("item-quantity");
  const addToCartButtonModal = document.getElementById("add-to-cart");

  if (
    !modal ||
    !modalItemImage ||
    !modalItemName ||
    !modalItemDescription ||
    !modalItemPrice ||
    !itemQuantityInputModal ||
    !addToCartButtonModal
  ) {
    console.error(
      "Un ou plusieurs éléments de la modale sont manquants dans le DOM."
    );
    return;
  }

  modalItemImage.src =
    item.photo ||
    "https://placehold.co/300x200/EFEFEF/AAAAAA?text=Image+Indisponible";
  modalItemImage.alt = item.nom;
  modalItemName.textContent = item.nom;
  modalItemDescription.textContent = item.description;
  modalItemPrice.textContent = formatPrice(item.prix);
  itemQuantityInputModal.value = 1;

  addToCartButtonModal.dataset.itemId = item.id;
  addToCartButtonModal.dataset.itemPrice = item.prix;

  modal.style.display = "block";
}

function renderCartItems() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalElement = document.getElementById("cart-total-amount");
  const cart = getCart();

  if (!cartItemsContainer || !cartTotalElement) {
    console.error(
      "Éléments du DOM pour le panier ('cart-items' ou 'cart-total-amount') non trouvés."
    );
    return;
  }

  if (!cart || cart.items.length === 0) {
    cartItemsContainer.innerHTML = `<div class="empty-cart"><p>Votre panier est vide</p></div>`;
    cartTotalElement.textContent = formatPrice(0);
    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) checkoutBtn.classList.add("disabled");
    return;
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) checkoutBtn.classList.remove("disabled");

  let html = "";
  cart.items.forEach((item) => {
    html += `
          <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
              <img src="${
                item.image ||
                "https://placehold.co/60x60/EFEFEF/AAAAAA?text=Img"
              }" alt="${item.name}">
            </div>
            <div class="cart-item-info">
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-price">${formatPrice(item.price)} x ${
      item.quantity
    }</div>
              <div class="cart-item-subtotal">Sous-total: ${formatPrice(
                item.price * item.quantity
              )}</div>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-quantity-controls">
                    <button class="quantity-btn minus" data-id="${
                      item.id
                    }" aria-label="Diminuer la quantité">-</button>
                    <input type="number" value="${
                      item.quantity
                    }" min="1" max="10" data-id="${
      item.id
    }" aria-label="Quantité">
                    <button class="quantity-btn plus" data-id="${
                      item.id
                    }" aria-label="Augmenter la quantité">+</button>
                </div>
                <button class="cart-item-remove" data-id="${
                  item.id
                }" aria-label="Supprimer l'article">&times;</button>
            </div>
          </div>`;
  });
  cartItemsContainer.innerHTML = html;
  cartTotalElement.textContent = formatPrice(cart.total);

  cartItemsContainer
    .querySelectorAll(".quantity-btn.minus")
    .forEach((button) => {
      button.addEventListener("click", function () {
        const itemId = parseInt(this.dataset.id);
        let currentQuantity =
          getCart().items.find((i) => i.id === itemId)?.quantity || 0;
        if (currentQuantity > 1) {
          updateCartItemQuantity(itemId, currentQuantity - 1);
        } else {
          removeFromCart(itemId);
        }
        renderCartItems();
        updateCartCount();
      });
    });

  cartItemsContainer
    .querySelectorAll(".quantity-btn.plus")
    .forEach((button) => {
      button.addEventListener("click", function () {
        const itemId = parseInt(this.dataset.id);
        let currentQuantity =
          getCart().items.find((i) => i.id === itemId)?.quantity || 0;
        if (currentQuantity < 10) {
          updateCartItemQuantity(itemId, currentQuantity + 1);
          renderCartItems();
          updateCartCount();
        }
      });
    });

  cartItemsContainer
    .querySelectorAll(".cart-item-quantity-controls input")
    .forEach((input) => {
      input.addEventListener("change", function () {
        const itemId = parseInt(this.dataset.id);
        let newQuantity = parseInt(this.value);
        if (isNaN(newQuantity) || newQuantity < 1) {
          newQuantity = 1;
        } else if (newQuantity > 10) {
          newQuantity = 10;
        }
        this.value = newQuantity;
        updateCartItemQuantity(itemId, newQuantity);
        renderCartItems();
        updateCartCount();
      });
    });

  cartItemsContainer.querySelectorAll(".cart-item-remove").forEach((button) => {
    button.addEventListener("click", function () {
      const itemId = parseInt(this.dataset.id);
      removeFromCart(itemId);
      renderCartItems();
      updateCartCount();
    });
  });
}

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
    });
  }

  notification.textContent = message;
  notification.style.backgroundColor =
    type === "error" ? "var(--danger, #dc3545)" : "var(--success, #28a745)";

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

// Rappel : Les fonctions suivantes DOIVENT être définies dans votre fichier principal (main.js ou équivalent)
// et accessibles globalement ou importées si vous utilisez des modules ES6.
//
// async function apiRequest(endpoint, method = 'GET', data = null) { /* ... */ }
// function getCookie(name) { /* ... */ }
// function formatPrice(price) { /* ... */ }
// function getCart() { /* return { items: [], total: 0.00 }; */ }
// function addToCart(item) { /* ... */ }
// function updateCartItemQuantity(itemId, quantity) { /* ... */ }
// function removeFromCart(itemId) { /* ... */ }
// function updateCartCount() { /* ... */ }
