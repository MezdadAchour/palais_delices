from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentification principale
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Gestion du profil
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # Gestion des tokens JWT
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('token/verify/', views.verify_token, name='token-verify'),
]
