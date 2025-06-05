from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import datetime, date
from .models import Table, Reservation
from .serializers import (
    TableSerializer, ReservationSerializer, 
    ReservationCreateSerializer, ReservationDetailSerializer
)

class TableListView(generics.ListAPIView):
    """Liste des tables disponibles"""
    queryset = Table.objects.filter(disponible=True).order_by('numero')
    serializer_class = TableSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def tables_disponibles(request):
    """Tables disponibles pour une date/heure donnée"""
    date_str = request.GET.get('date')
    heure_str = request.GET.get('heure')
    nb_personnes = request.GET.get('nb_personnes')
    
    # Validation des paramètres
    if not all([date_str, heure_str]):
        return Response(
            {'error': 'Date et heure requises'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        date_reservation = datetime.strptime(date_str, '%Y-%m-%d').date()
        heure_reservation = datetime.strptime(heure_str, '%H:%M').time()
    except ValueError:
        return Response(
            {'error': 'Format de date/heure invalide'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Filtrer les tables
    tables = Table.objects.filter(disponible=True)
    
    if nb_personnes:
        try:
            nb_personnes = int(nb_personnes)
            tables = tables.filter(nbPlaces__gte=nb_personnes)
        except ValueError:
            pass
    
    # Exclure les tables déjà réservées
    reservations_existantes = Reservation.objects.filter(
        dateReservation=date_reservation,
        heureReservation=heure_reservation,
        statut__in=['confirmee', 'en_cours']
    ).values_list('table_id', flat=True)
    
    tables_disponibles = tables.exclude(id__in=reservations_existantes)
    
    serializer = TableSerializer(tables_disponibles, many=True)
    return Response({
        'date': date_str,
        'heure': heure_str,
        'nb_personnes': nb_personnes,
        'tables_disponibles': serializer.data
    })

class ReservationListCreateView(generics.ListCreateAPIView):
    """Liste et création de réservations"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReservationCreateSerializer
        return ReservationSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reservation.objects.all().select_related('user', 'table')
        return Reservation.objects.filter(user=user).select_related('table')

class ReservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une réservation"""
    serializer_class = ReservationDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reservation.objects.all().select_related('user', 'table')
        return Reservation.objects.filter(user=user).select_related('table')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def annuler_reservation(request, reservation_id):
    """Annuler une réservation"""
    try:
        reservation = Reservation.objects.get(
            id=reservation_id,
            user=request.user
        )
        
        if reservation.statut == 'annulee':
            return Response(
                {'error': 'Réservation déjà annulée'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.statut = 'annulee'
        reservation.save()
        
        return Response({
            'message': 'Réservation annulée avec succès',
            'reservation': ReservationSerializer(reservation).data
        })
        
    except Reservation.DoesNotExist:
        return Response(
            {'error': 'Réservation non trouvée'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_reservations(request):
    """Réservations de l'utilisateur connecté"""
    reservations = Reservation.objects.filter(
        user=request.user
    ).select_related('table').order_by('-dateReservation')
    
    # Séparer les réservations futures et passées
    aujourd_hui = date.today()
    futures = reservations.filter(dateReservation__gte=aujourd_hui)
    passees = reservations.filter(dateReservation__lt=aujourd_hui)
    
    return Response({
        'futures': ReservationSerializer(futures, many=True).data,
        'passees': ReservationSerializer(passees, many=True).data
    })