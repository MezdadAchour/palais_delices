from django.db import models
from django.core.validators import MinValueValidator
import os

def plat_image_path(instance, filename):
    """Génère le chemin pour l'upload des images de plats"""
    return f'plats/{instance.id}/{filename}'

class Menu(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'menu'
        verbose_name = 'Menu'
        verbose_name_plural = 'Menus'
    
    def __str__(self):
        return self.nom

class Categorie(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    ordre = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categorie'
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['ordre', 'nom']
    
    def __str__(self):
        return self.nom

class Plat(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    disponible = models.BooleanField(default=True)
    photo = models.ImageField(upload_to=plat_image_path, blank=True, null=True)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='plats')
    est_specialite = models.BooleanField(default=False, help_text="Spécialité du jour")
    ingredients = models.TextField(blank=True, null=True, help_text="Liste des ingrédients")
    allergenes = models.TextField(blank=True, null=True, help_text="Allergènes présents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'plat'
        verbose_name = 'Plat'
        verbose_name_plural = 'Plats'
        ordering = ['categorie__ordre', 'nom']
    
    def __str__(self):
        return f"{self.nom} - {self.prix} DA"
    
    @property
    def photo_url(self):
        if self.photo:
            return self.photo.url
        return '/static/images/default-dish.jpg'
