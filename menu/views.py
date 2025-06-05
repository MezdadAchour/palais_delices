from django.shortcuts import render
from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Menu, Categorie, Plat
from .serializers import (
    MenuSerializer, CategorieSerializer, PlatSerializer, 
    PlatDetailSerializer, CategorieWithPlatsSerializer
)

class MenuListView(generics.ListAPIView):
    """Liste de tous les menus actifs"""
    queryset = Menu.objects.filter(actif=True)
    serializer_class = MenuSerializer
    permission_classes = [AllowAny]

class CategorieListView(generics.ListAPIView):
    """Liste des catégories ordonnées"""
    queryset = Categorie.objects.all().order_by('ordre', 'nom')
    serializer_class = CategorieSerializer
    permission_classes = [AllowAny]

class CategorieWithPlatsView(generics.ListAPIView):
    """Catégories avec leurs plats"""
    queryset = Categorie.objects.prefetch_related('plats').order_by('ordre')
    serializer_class = CategorieWithPlatsSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrer seulement les catégories qui ont des plats disponibles
        return queryset.filter(plats__disponible=True).distinct()

class PlatListView(generics.ListAPIView):
    """Liste des plats avec filtres"""
    queryset = Plat.objects.filter(disponible=True).select_related('categorie')
    serializer_class = PlatSerializer
    permission_classes = [AllowAny]
    # ✅ CORRECTION: SearchFilter au lieu de SearchBackend
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categorie', 'est_specialite', 'disponible']
    search_fields = ['nom', 'description', 'ingredients']
    ordering_fields = ['nom', 'prix', 'created_at']
    ordering = ['categorie__ordre', 'nom']

class PlatDetailView(generics.RetrieveAPIView):
    """Détail d'un plat"""
    queryset = Plat.objects.select_related('categorie')
    serializer_class = PlatDetailSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def plats_par_categorie(request, categorie_id):
    """Plats d'une catégorie spécifique"""
    try:
        categorie = Categorie.objects.get(id=categorie_id)
        plats = Plat.objects.filter(
            categorie=categorie, 
            disponible=True
        ).order_by('nom')
        
        serializer = PlatSerializer(plats, many=True, context={'request': request})
        
        return Response({
            'categorie': CategorieSerializer(categorie).data,
            'plats': serializer.data
        })
    except Categorie.DoesNotExist:
        return Response(
            {'error': 'Catégorie non trouvée'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def specialites_du_jour(request):
    """Spécialités du jour"""
    specialites = Plat.objects.filter(
        est_specialite=True, 
        disponible=True
    ).select_related('categorie')
    
    serializer = PlatSerializer(specialites, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def search_plats(request):
    """Recherche de plats"""
    query = request.GET.get('q', '')
    
    if len(query) < 2:
        return Response({'error': 'Requête trop courte'}, status=status.HTTP_400_BAD_REQUEST)
    
    plats = Plat.objects.filter(
        Q(nom__icontains=query) | 
        Q(description__icontains=query) |
        Q(ingredients__icontains=query),
        disponible=True
    ).select_related('categorie')
    
    serializer = PlatSerializer(plats, many=True, context={'request': request})
    return Response({
        'query': query,
        'count': len(serializer.data),
        'results': serializer.data
    })
