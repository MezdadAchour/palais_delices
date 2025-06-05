from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction # Bien que create soit dans serializer, garder au cas où.
from .models import Commande, LigneCommande
from .serializers import (
    CommandeSerializer,
    CommandeCreateSerializer,
    CommandeDetailSerializer,   # Pour le détail d'une commande
    LigneCommandeSerializer,    # Si vous aviez un ViewSet séparé pour LigneCommande non ReadOnly
    LigneCommandeDetailSerializer # Pour le LigneCommandeViewSet ReadOnly
)
from django.db.models import Count, Sum # Pour les statistiques
from datetime import timedelta # Pour les statistiques


class CommandeViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des commandes"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les commandes par utilisateur (sauf admin)"""
        user = self.request.user
        # Précharger les données associées pour optimiser les requêtes
        base_queryset = Commande.objects.all().select_related('user').prefetch_related('lignes__plat')
        
        # Vérifier si l'utilisateur a l'attribut 'role' et si c'est 'admin'
        if hasattr(user, 'role') and user.role == 'admin':
            return base_queryset
        return base_queryset.filter(user=user)
    
    def get_serializer_class(self):
        """Choisir le bon serializer selon l'action"""
        if self.action == 'create':
            return CommandeCreateSerializer
        elif self.action == 'retrieve':
            return CommandeDetailSerializer # Utiliser le serializer détaillé pour une commande
        # Pour 'list', 'update', 'partial_update', CommandeSerializer (version de base) est utilisé
        return CommandeSerializer
    
    # La méthode perform_create est souvent utilisée pour injecter des données comme request.user
    # Mais CommandeCreateSerializer.create() le gère déjà via self.context['request'].user.
    # def perform_create(self, serializer):
    # serializer.save(user=self.request.user) # Si le serializer ne le faisait pas.

    @transaction.atomic # Assure que la création est atomique si des erreurs surviennent
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle commande avec ses lignes"""
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            commande = serializer.save() # La méthode create de CommandeCreateSerializer est appelée
            
            # Utiliser CommandeDetailSerializer pour la réponse pour avoir tous les détails
            response_serializer = CommandeDetailSerializer(commande, context={'request': request})
            
            return Response({
                'success': True,
                'message': 'Commande créée avec succès !',
                'commande': response_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except serializers.ValidationError as e:
            return Response({
                'success': False,
                'errors': e.detail # e.detail contient le dictionnaire structuré des erreurs
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Loggez l'erreur pour le débogage côté serveur
            print(f"Erreur inattendue lors de la création de commande: {type(e).__name__} - {e}")
            # Pour le client, un message plus générique
            return Response({
                'success': False,
                'error': "Une erreur interne s'est produite lors du traitement de votre commande."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Mettre à jour le statut d'une commande (admin uniquement)"""
        if not (hasattr(request.user, 'role') and request.user.role == 'admin'):
            return Response({
                'success': False, 'error': 'Permission refusée.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        commande = self.get_object()
        new_status = request.data.get('statut')
        
        if not new_status or new_status not in dict(Commande.STATUT_CHOICES):
            return Response({
                'success': False, 'error': 'Statut invalide ou manquant.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_status_display = commande.get_statut_display()
        commande.statut = new_status
        commande.save()
        
        # Utiliser CommandeDetailSerializer pour une réponse complète
        response_data = CommandeDetailSerializer(commande, context={'request': request}).data
        return Response({
            'success': True,
            'message': f'Statut de la commande #{commande.numero_commande} mis à jour de "{old_status_display}" vers "{commande.get_statut_display()}".',
            'commande': response_data
        })
    
    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """Annuler une commande"""
        commande = self.get_object()
        
        is_admin = hasattr(request.user, 'role') and request.user.role == 'admin'
        if commande.user != request.user and not is_admin:
            return Response({'success': False, 'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        if commande.statut in ['delivered', 'cancelled', 'completed']: # Ajout de 'completed'
            return Response({
                'success': False,
                'error': f'Impossible d\'annuler une commande "{commande.get_statut_display()}".'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        commande.statut = 'cancelled'
        commande.save()
        
        response_data = CommandeDetailSerializer(commande, context={'request': request}).data
        return Response({
            'success': True,
            'message': f'Commande #{commande.numero_commande} annulée avec succès.',
            'commande': response_data
        })
    
    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """Récupérer les commandes de l'utilisateur connecté"""
        commandes = self.get_queryset().filter(user=request.user) # get_queryset est déjà filtré si non admin
        
        # Utiliser CommandeDetailSerializer pour que la liste 'mes commandes' soit détaillée
        serializer = CommandeDetailSerializer(commandes, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'count': commandes.count(),
            'commandes': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def order_stats(self, request):
        """Statistiques des commandes (admin uniquement)"""
        if not (hasattr(request.user, 'role') and request.user.role == 'admin'):
            return Response({'success': False, 'error': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday()) # Lundi de cette semaine
        start_of_month = today.replace(day=1)
        
        # Statuts considérés comme des revenus (à adapter selon votre logique métier)
        revenue_generating_statuses = ['delivered', 'completed', 'ready'] # 'ready' si paiement à l'enlèvement

        stats = {
            'total_commandes': Commande.objects.count(),
            'commandes_aujourd_hui': Commande.objects.filter(dateCommande__date=today).count(),
            'commandes_semaine': Commande.objects.filter(dateCommande__date__gte=start_of_week).count(),
            'commandes_mois': Commande.objects.filter(dateCommande__date__gte=start_of_month).count(),
            'chiffre_affaires_mois': Commande.objects.filter(
                dateCommande__date__gte=start_of_month,
                statut__in=revenue_generating_statuses
            ).aggregate(total=Sum('montant'))['total'] or 0,
            'commandes_par_statut': dict(
                Commande.objects.values_list('statut').annotate(count=Count('id'))
            )
        }
        
        return Response({'success': True, 'stats': stats})

class LigneCommandeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les lignes de commande (lecture seule)"""
    serializer_class = LigneCommandeDetailSerializer # Utilise le serializer détaillé
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer par utilisateur (sauf admin)"""
        user = self.request.user
        base_queryset = LigneCommande.objects.all().select_related('commande__user', 'plat')

        if hasattr(user, 'role') and user.role == 'admin':
            return base_queryset
        return base_queryset.filter(commande__user=user)
