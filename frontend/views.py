from django.shortcuts import render

    # Vue pour la page d'accueil
def index_view(request):
        """
        Affiche la page d'accueil.
        """
        # Le nom 'index.html' doit correspondre au nom de votre fichier template
        # dans votre dossier de templates (par exemple, 'templates/index.html').
        return render(request, 'index.html')

    # Vue pour la page du menu
def menu_view(request):
        """
        Affiche la page du menu.
        """
        return render(request, 'menu.html')

    # Vue pour la page de réservation
def reservation_view(request):
        """
        Affiche la page de réservation.
        """
        return render(request, 'reservation.html')

    # Vue pour la page de commande
def commander_view(request):
        """
        Affiche la page pour passer une commande.
        """
        return render(request, 'commander.html')

    # Vue pour la page de contact (si vous en avez une, sinon vous pouvez la supprimer)
    # Assurez-vous d'avoir un template 'contact.html'
# def contact_view(request):
        """
        Affiche la page de contact.
        """
        # Si vous n'avez pas de page contact.html pour l'instant,
        # vous pouvez commenter cette vue ou créer un fichier contact.html simple.
        # return render(request, 'contact.html')

    # Vue pour la page de connexion
def login_view(request):
        """
        Affiche la page de connexion.
        """
        return render(request, 'login.html')

    # Vue pour la page d'inscription
def register_view(request):
        """
        Affiche la page d'inscription.
        """
        return render(request, 'register.html')

    # Vue pour la page de profil utilisateur
def profile_view(request):
        """
        Affiche la page de profil utilisateur.
        """
        return render(request, 'profile.html')

    # Si vous préférez utiliser des vues basées sur les classes (Class-Based Views),
    # vous pouvez faire quelque chose comme ceci :
    #
    # from django.views.generic import TemplateView
    #
    # class IndexView(TemplateView):
    #     template_name = "index.html"
    #
    # class MenuView(TemplateView):
    #     template_name = "menu.html"
    #
    # # Et ainsi de suite pour les autres pages...
    