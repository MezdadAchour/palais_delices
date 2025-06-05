from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from .models import Paiement, Remboursement
from .serializers import (
    PaiementSerializer, PaiementCreateSerializer, PaiementDetailSerializer
)
from orders.models import Commande

# Create your views here.

class PaiementViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des paiements"""
    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les paiements par utilisateur (sauf admin)"""
        if self.request.user.role == 'admin':
            return Paiement.objects.all().select_related('commande', 'commande__user')
        return Paiement.objects.filter(commande__user=self.request.user).select_related('commande')
    
    def get_serializer_class(self):
        """Choisir le bon serializer selon l'action"""
        if self.action == 'create':
            return PaiementCreateSerializer
        elif self.action == 'retrieve':
            return PaiementDetailSerializer
        return PaiementSerializer
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Créer un nouveau paiement"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Vérifier que la commande appartient à l'utilisateur (sauf admin)
            commande = serializer.validated_data['commande']
            if commande.user != request.user and request.user.role != 'admin':
                return Response({
                    'success': False,
                    'error': 'Permission refusée pour cette commande'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Vérifier qu'il n'y a pas déjà un paiement pour cette commande
            if hasattr(commande, 'paiement'):
                return Response({
                    'success': False,
                    'error': 'Un paiement existe déjà pour cette commande'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer le paiement
            paiement = serializer.save()
            
            # Simuler le traitement du paiement selon la méthode
            success = self.process_payment(paiement)
            
            if success:
                paiement.marquer_comme_complete()
                message = 'Paiement effectué avec succès !'
            else:
                paiement.marquer_comme_echec("Échec du traitement")
                message = 'Échec du paiement. Veuillez réessayer.'
            
            response_serializer = PaiementDetailSerializer(paiement, context={'request': request})
            
            return Response({
                'success': success,
                'message': message,
                'paiement': response_serializer.data
            }, status=status.HTTP_201_CREATED if success else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def process_payment(self, paiement):
        """Simuler le traitement du paiement selon la méthode"""
        method = paiement.methodePaiement
        
        if method == 'cash':
            # Paiement en espèces : toujours accepté
            return True
        elif method == 'card':
            # Simulation de paiement par carte (90% de succès)
            import random
            return random.random() > 0.1
        elif method == 'online':
            # Simulation de paiement en ligne (95% de succès)
            import random
            return random.random() > 0.05
        else:
            # Autres méthodes : acceptées par défaut
            return True
    
    @action(detail=True, methods=['post'])
    def complete_payment(self, request, pk=None):
        """Marquer un paiement comme terminé (admin uniquement)"""
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        paiement = self.get_object()
        
        if paiement.statutPaiement == 'completed':
            return Response({
                'success': False,
                'error': 'Le paiement est déjà terminé'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        paiement.marquer_comme_complete()
        
        return Response({
            'success': True,
            'message': 'Paiement marqué comme terminé',
            'paiement': PaiementSerializer(paiement, context={'request': request}).data
        })
    
    @action(detail=True, methods=['post'])
    def fail_payment(self, request, pk=None):
        """Marquer un paiement comme échoué (admin uniquement)"""
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        paiement = self.get_object()
        raison = request.data.get('raison', 'Échec administratif')
        
        paiement.marquer_comme_echec(raison)
        
        return Response({
            'success': True,
            'message': 'Paiement marqué comme échoué',
            'paiement': PaiementSerializer(paiement, context={'request': request}).data
        })
    
    @action(detail=True, methods=['post'])
    def refund_payment(self, request, pk=None):
        """Créer un remboursement (admin uniquement)"""
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        paiement = self.get_object()
        montant = request.data.get('montant')
        raison = request.data.get('raison', 'Remboursement administratif')
        
        if not montant:
            montant = paiement.montant
        
        try:
            montant = float(montant)
            if montant <= 0 or montant > paiement.montant:
                raise ValueError("Montant invalide")
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'Montant de remboursement invalide'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Créer le remboursement
        remboursement = Remboursement.objects.create(
            paiement_original=paiement,
            montant_rembourse=montant,
            raison=raison,
            statut_remboursement='processed',
            processed_at=timezone.now()
        )
        
        # Mettre à jour le statut du paiement
        paiement.statutPaiement = 'refunded'
        paiement.save()
        
        return Response({
            'success': True,
            'message': f'Remboursement de {montant}€ créé avec succès',
            'remboursement_id': remboursement.remboursement_id,
            'paiement': PaiementSerializer(paiement, context={'request': request}).data
        })
    
    @action(detail=False, methods=['get'])
    def payment_stats(self, request):
        """Statistiques des paiements (admin uniquement)"""
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from django.db.models import Count, Sum
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        this_month = today.replace(day=1)
        
        stats = {
            'total_paiements': Paiement.objects.count(),
            'paiements_aujourd_hui': Paiement.objects.filter(datePaiement__date=today).count(),
            'chiffre_affaires_mois': Paiement.objects.filter(
                datePaiement__date__gte=this_month,
                statutPaiement='completed'
            ).aggregate(total=Sum('montant'))['total'] or 0,
            'paiements_par_statut': dict(
                Paiement.objects.values('statutPaiement').annotate(count=Count('id')).values_list('statutPaiement', 'count')
            ),
            'paiements_par_methode': dict(
                Paiement.objects.values('methodePaiement').annotate(count=Count('id')).values_list('methodePaiement', 'count')
            ),
            'total_remboursements': Remboursement.objects.filter(statut_remboursement='processed').aggregate(
                total=Sum('montant_rembourse')
            )['total'] or 0
        }
        
        return Response({
            'success': True,
            'stats': stats
        })
