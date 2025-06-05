// home.js - Fichier JavaScript pour la page d'accueil

document.addEventListener("DOMContentLoaded", function () {
  // Vérifier si l'utilisateur est connecté.
  // Cette fonction est supposée être définie dans main.js ou un fichier JS global
  // et est responsable de la communication avec le backend pour le statut d'authentification.
  if (typeof checkAuthStatus === "function") {
    checkAuthStatus();
  } else {
    console.error(
      "La fonction checkAuthStatus() n'est pas définie. Assurez-vous qu'elle est chargée (probablement depuis main.js)."
    );
  }

  // Ajouter le défilement doux pour les liens d'ancrage
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return; // Ne rien faire pour les liens href="#" simples

      try {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      } catch (error) {
        // Gérer les sélecteurs invalides si targetId n'est pas un sélecteur CSS valide
        // console.warn(`Sélecteur invalide pour le défilement doux : ${targetId}`);
      }
    });
  });

  // Ajouter un effet de parallaxe à la section "hero"
  const heroSection = document.querySelector(".hero");
  if (heroSection) {
    window.addEventListener("scroll", function () {
      const scroll = window.scrollY;
      // Appliquer l'effet de parallaxe uniquement si la section hero est visible
      // pour éviter des calculs inutiles.
      // Cette vérification peut être plus complexe si nécessaire.
      heroSection.style.backgroundPositionY = `${scroll * 0.5}px`;
    });
  }
});
