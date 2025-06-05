from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommandeViewSet, LigneCommandeViewSet

router = DefaultRouter()
router.register(r'commandes', CommandeViewSet, basename='commande')
router.register(r'lignes', LigneCommandeViewSet, basename='lignecommande')

urlpatterns = [
    path('', include(router.urls)),
]
