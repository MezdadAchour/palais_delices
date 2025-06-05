from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router vide pour l'instant
router = DefaultRouter()

urlpatterns = [
    # ========== ENDPOINTS TABLES ==========
    
    # Liste des tables disponibles
    path('tables/', views.TableListView.as_view(), name='table-list'),
    
    # Tables disponibles pour une date/heure
    path('tables/disponibles/', views.tables_disponibles, name='tables-disponibles'),
    
    # ========== ENDPOINTS RÉSERVATIONS ==========
    
    # Liste et création de réservations
    path('reservations/', views.ReservationListCreateView.as_view(), name='reservation-list-create'),
    
    # Détail d'une réservation
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='reservation-detail'),
    
    # Annuler une réservation
    path('reservations/<int:reservation_id>/annuler/', views.annuler_reservation, name='annuler-reservation'),
    
    # Mes réservations
    path('reservations/mes-reservations/', views.mes_reservations, name='mes-reservations'),
    
    # ========== ROUTER URLs ==========
    path('', include(router.urls)),
]
