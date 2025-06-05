from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets (si vous en ajoutez plus tard)
router = DefaultRouter()

urlpatterns = [
    # ========== ENDPOINTS PRINCIPAUX ==========
    
    # Menus actifs
    path('menus/', views.MenuListView.as_view(), name='menu-list'),
    
    # Catégories
    path('categories/', views.CategorieListView.as_view(), name='categorie-list'),
    path('categories-with-plats/', views.CategorieWithPlatsView.as_view(), name='categories-with-plats'),
    
    # Plats
    path('plats/', views.PlatListView.as_view(), name='plat-list'),
    path('plats/<int:pk>/', views.PlatDetailView.as_view(), name='plat-detail'),
    
    # ========== ENDPOINTS SPÉCIALISÉS ==========
    
    # Plats par catégorie
    path('categories/<int:categorie_id>/plats/', views.plats_par_categorie, name='plats-par-categorie'),
    
    # Spécialités du jour
    path('specialites/', views.specialites_du_jour, name='specialites-du-jour'),
    
    # Recherche de plats
    path('search/', views.search_plats, name='search-plats'),
    
    # ========== ROUTER URLS ==========
    path('', include(router.urls)),
]
