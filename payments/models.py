from django.db import models
from django.core.validators import MinValueValidator
from orders.models import Commande
import uuid

class Paiement(models.Model):
    """
    Modèle pour la gestion des paiements (conforme au rapport)
    """
    METHODE_CHOICES = [
        ('card', 'Carte bancaire'),
        ('cash', 'Espèces'),
        ('online', 'Paiement en ligne'),
        ('check', 'Chèque'),
        ('voucher', 'Bon de réduction'),
    ]
    
    STATUT_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours de traitement'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
        ('refunded', 'Remboursé'),
    ]
    
    # Relation avec la commande (OneToOne)
    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name='paiement',
        verbose_name="Commande"
    )
    
    # Informations de paiement (noms compatibles avec la DB existante)
    datePaiement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date du paiement"
    )
    
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Montant payé"
    )
    
    methodePaiement = models.CharField(
        max_length=10,
        choices=METHODE_CHOICES,
        verbose_name="Méthode de paiement"
    )
    
    statutPaiement = models.CharField(
        max_length=15,
        choices=STATUT_CHOICES,
        default='pending',
        verbose_name="Statut du paiement"
    )
    
    transactionId = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="ID Transaction"
    )
    
    class Meta:
        db_table = 'paiement'
        verbose_name = 'Paiement'
        verbose_name_plural = 'Paiements'
        ordering = ['-datePaiement']
    
    def __str__(self):
        return f"Paiement {self.transactionId or self.id} - {self.commande.numero_commande}"
    
    def save(self, *args, **kwargs):
        """Générer transactionId si pas défini"""
        if not self.transactionId:
            self.transactionId = str(uuid.uuid4())[:8]
        super().save(*args, **kwargs)
    
    def marquer_comme_complete(self):
        """Marquer le paiement comme terminé"""
        from django.utils import timezone
        self.statutPaiement = 'completed'
        self.save()
        
        # Mettre à jour le statut de la commande
        if self.commande.statut == 'pending':
            self.commande.statut = 'confirmed'
            self.commande.save()
    
    def marquer_comme_echec(self, raison=""):
        """Marquer le paiement comme échoué"""
        self.statutPaiement = 'failed'
        self.save()

class Remboursement(models.Model):
    """
    Modèle pour tracer les remboursements
    """
    STATUT_CHOICES = [
        ('pending', 'En attente'),
        ('processed', 'Traité'),
        ('failed', 'Échoué'),
    ]
    
    remboursement_id = models.CharField(
        max_length=100,
        unique=True,
        default= str(uuid.uuid4()),
        verbose_name="ID Remboursement"
    )
    
    paiement_original = models.ForeignKey(
        Paiement,
        on_delete=models.CASCADE,
        related_name='remboursements',
        verbose_name="Paiement original"
    )
    
    montant_rembourse = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Montant remboursé"
    )
    
    raison = models.TextField(
        verbose_name="Raison du remboursement"
    )
    
    statut_remboursement = models.CharField(
        max_length=15,
        choices=STATUT_CHOICES,
        default='pending',
        verbose_name="Statut"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de traitement"
    )
    
    class Meta:
        db_table = 'remboursement'
        verbose_name = 'Remboursement'
        verbose_name_plural = 'Remboursements'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Remboursement {self.remboursement_id} - {self.montant_rembourse}DA"
