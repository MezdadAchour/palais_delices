from django.contrib import admin
from .models import Commande, LigneCommande

class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0
    readonly_fields = ['sousTotal']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('plat')

@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['numero_commande', 'get_user_name', 'dateCommande', 'statut', 'montant', 'modePaiement']
    list_filter = ['statut', 'modePaiement', 'modeLivraison', 'dateCommande']
    search_fields = ['numero_commande', 'user__nom', 'user__email']
    list_editable = ['statut']
    date_hierarchy = 'dateCommande'
    readonly_fields = ['numero_commande', 'created_at', 'updated_at']
    
    inlines = [LigneCommandeInline]
    
    fieldsets = (
        ('Informations commande', {
            'fields': ('numero_commande', 'user', 'dateCommande', 'statut')
        }),
        ('Montants', {
            'fields': ('montant', 'fraisLivraison')
        }),
        ('Livraison et paiement', {
            'fields': ('modeLivraison', 'modePaiement', 'adresseLivraison', 'telephoneContact')
        }),
        ('Commentaires', {
            'fields': ('commentaire',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_user_name(self, obj):
        return f"{obj.user.nom} ({obj.user.email})"
    get_user_name.short_description = 'Client'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(LigneCommande)
class LigneCommandeAdmin(admin.ModelAdmin):
    list_display = ['get_commande_numero', 'get_plat_nom', 'quantite', 'prixUnitaire', 'sousTotal']
    list_filter = ['commande__dateCommande', 'plat__categorie']
    search_fields = ['commande__numero_commande', 'plat__nom']
    readonly_fields = ['sousTotal']
    
    def get_commande_numero(self, obj):
        return obj.commande.numero_commande
    get_commande_numero.short_description = 'Commande'
    
    def get_plat_nom(self, obj):
        return obj.plat.nom
    get_plat_nom.short_description = 'Plat'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('commande', 'plat')
