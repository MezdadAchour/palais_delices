    # frontend/urls.py
from django.urls import path
from . import views  # Importe les vues depuis le fichier views.py du même dossier

app_name = 'frontend'  # Ceci est optionnel mais recommandé pour nommer vos URLs.
                           # Cela permet d'éviter les conflits de noms d'URL avec d'autres applications.
                           # Vous pourrez alors utiliser {% url 'frontend:index' %} dans vos templates.

urlpatterns = [
        # URL pour la page d'accueil (par exemple, http://votresite.com/)
        path('', views.index_view, name='index'),

        # URL pour la page du menu (par exemple, http://votresite.com/menu/)
        path('menu/', views.menu_view, name='menu'),

        # URL pour la page de réservation (par exemple, http://votresite.com/reservations/)
        path('reservations/', views.reservation_view, name='reservations'),

        # URL pour la page de commande (par exemple, http://votresite.com/commander/)
        path('commander/', views.commander_view, name='commander'),

        # URL pour la page de contact (par exemple, http://votresite.com/contact/)
        # path('contact/', views.contact_view, name='contact'), # Assurez-vous d'avoir une vue et un template pour cela

        # URL pour la page de connexion (par exemple, http://votresite.com/login/)
        path('login/', views.login_view, name='login'),

        # URL pour la page d'inscription (par exemple, http://votresite.com/register/)
        path('register/', views.register_view, name='register'),

        # URL pour la page de profil (par exemple, http://votresite.com/profile/)
        path('profile/', views.profile_view, name='profile'),
    ]
    