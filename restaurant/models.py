from django.db import models
from django.core.validators import MinValueValidator
from authentication.models import Utilisateur

class Table(models.Model):
    numero = models.CharField(max_length=10, unique=True)
    nbPlaces = models.IntegerField(validators=[MinValueValidator(1)])
    position = models.CharField(max_length=50, blank=True, null=True)
    disponible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tables'
        verbose_name = 'Table'
        verbose_name_plural = 'Tables'
        ordering = ['numero']
    
    def __str__(self):
        return f"Table {self.numero} ({self.nbPlaces} places)"

class Reservation(models.Model):
    STATUT_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmée'),
        ('cancelled', 'Annulée'),
        ('completed', 'Terminée'),
    ]
    
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='reservations')
    dateReservation = models.DateField()
    heureReservation = models.TimeField()
    nbPersonnes = models.IntegerField(validators=[MinValueValidator(1)])
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='pending')
    commentaire = models.TextField(blank=True, null=True)
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reservation'
        verbose_name = 'Réservation'
        verbose_name_plural = 'Réservations'
        ordering = ['-dateReservation', '-heureReservation']
    
    def __str__(self):
        return f"Réservation {self.user.nom} - {self.dateReservation} {self.heureReservation}"
    
    @property
    def is_past(self):
        from datetime import datetime, time
        reservation_datetime = datetime.combine(self.dateReservation, self.heureReservation)
        return reservation_datetime < datetime.now()
