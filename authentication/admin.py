from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Utilisateur

@admin.register(Utilisateur)
class UtilisateurAdmin(BaseUserAdmin):
    """
    Configuration de l'interface d'administration pour Utilisateur
    """
    
    # Champs affichés dans la liste
    list_display = [
        'username', 'email', 'nom', 'prenom', 'role', 'is_active', 'date_joined'
    ]
    
    # Filtres dans la sidebar
    list_filter = [
        'role', 'is_active', 'is_staff', 'date_joined'
    ]
    
    # Champs de recherche
    search_fields = ['username', 'email', 'nom', 'prenom', 'telephone']
    
    # Champs modifiables directement dans la liste
    list_editable = ['role', 'is_active']
    
    # Configuration des fieldsets (sections dans le formulaire)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Informations personnelles supplémentaires', {
            'fields': ('nom', 'prenom', 'telephone', 'adresse', 'role', 'date_naissance', 'accepte_newsletter')
        }),
    )
    
    # Fieldsets pour l'ajout d'utilisateur
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Informations personnelles', {
            'fields': ('nom', 'prenom', 'email', 'telephone', 'role')
        }),
    )
    
    # Ordre par défaut
    ordering = ['-date_joined']
