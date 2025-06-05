from django.db import models
from django.core.validators import MinValueValidator
from authentication.models import Utilisateur
from menu.models import Plat
import uuid

# Create your models here.
class Commande(models.Model):
    STATUT_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmée'),
        ('preparing', 'En préparation'),
        ('ready', 'Prête'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée'),
    ]
    
    PAIEMENT_CHOICES = [
        ('card', 'Carte bancaire'),
        ('cash', 'Espèces'),
        ('online', 'Paiement en ligne'),
    ]
    
    LIVRAISON_CHOICES = [
        ('delivery', 'Livraison à domicile'),
        ('pickup', 'Retrait en magasin'),
    ]
    
    numero_commande = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='commandes')
    dateCommande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='pending')
    montant = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    modePaiement = models.CharField(max_length=10, choices=PAIEMENT_CHOICES)
    modeLivraison = models.CharField(max_length=10, choices=LIVRAISON_CHOICES, default='delivery')
    fraisLivraison = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    commentaire = models.TextField(blank=True, null=True)
    
    # Informations de livraison
    adresseLivraison = models.TextField(blank=True, null=True)
    telephoneContact = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'commande'
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'
        ordering = ['-dateCommande']
    
    def save(self, *args, **kwargs):
        if not self.numero_commande:
            self.numero_commande = self.generate_order_number()
        super().save(*args, **kwargs)
    
    def generate_order_number(self):
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"CMD{timestamp}"
    
    def __str__(self):
        return f"Commande {self.numero_commande} - {self.user.nom}"
    
    @property
    def total_items(self):
        return sum(ligne.quantite for ligne in self.lignes.all())
    
    @property
    def total_avec_livraison(self):
        return self.montant + self.fraisLivraison

class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='lignes')
    plat = models.ForeignKey(Plat, on_delete=models.CASCADE)
    quantite = models.IntegerField(validators=[MinValueValidator(1)])
    prixUnitaire = models.DecimalField(max_digits=10, decimal_places=2)
    sousTotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'lignecommande'
        verbose_name = 'Ligne de commande'
        verbose_name_plural = 'Lignes de commande'
    
    def save(self, *args, **kwargs):
        self.sousTotal = self.quantite * self.prixUnitaire
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.plat.nom} x{self.quantite} - {self.commande.numero_commande}"
