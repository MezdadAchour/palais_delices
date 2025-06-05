from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Paiement, Remboursement

@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    """Configuration admin pour les paiements"""
    
    list_display = [
        'transactionId', 'get_commande_numero', 'methodePaiement',
        'statut_colored', 'montant', 'datePaiement'
    ]
    
    list_filter = [
        'statutPaiement', 'methodePaiement', 'datePaiement'
    ]
    
    search_fields = [
        'transactionId', 'commande__numero_commande'
    ]
    
    readonly_fields = ['transactionId', 'datePaiement']
    
    fieldsets = (
        ('Informations transaction', {
            'fields': (
                'transactionId', 'commande', 'methodePaiement', 'statutPaiement'
            )
        }),
        
        ('Montants', {
            'fields': ('montant',)
        }),
        
        ('Dates', {
            'fields': ('datePaiement',)
        }),
    )
    
    actions = ['marquer_comme_complete', 'marquer_comme_echec']
    
    def get_commande_numero(self, obj):
        """Lien vers la commande"""
        url = reverse('admin:orders_commande_change', args=[obj.commande.pk])
        return format_html(
            '<a href="{}">{}</a>',
            url, obj.commande.numero_commande
        )
    get_commande_numero.short_description = 'Commande'
    
    def statut_colored(self, obj):
        """Statut avec couleur"""
        colors = {
            'pending': '#ffc107',      # Jaune
            'processing': '#17a2b8',   # Bleu
            'completed': '#28a745',    # Vert
            'failed': '#dc3545',       # Rouge
            'cancelled': '#6c757d',    # Gris
            'refunded': '#fd7e14',     # Orange
        }
        color = colors.get(obj.statutPaiement, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_statutPaiement_display()
        )
    statut_colored.short_description = 'Statut'
    
    def marquer_comme_complete(self, request, queryset):
        for paiement in queryset:
            paiement.marquer_comme_complete()
        self.message_user(request, f'{queryset.count()} paiement(s) marqué(s) comme terminé(s).')
    marquer_comme_complete.short_description = "Marquer comme terminé"
    
    def marquer_comme_echec(self, request, queryset):
        updated = queryset.update(statutPaiement='failed')
        self.message_user(request, f'{updated} paiement(s) marqué(s) comme échoué(s).')
    marquer_comme_echec.short_description = "Marquer comme échoué"

@admin.register(Remboursement)
class RemboursementAdmin(admin.ModelAdmin):
    """Configuration admin pour les remboursements"""
    
    list_display = [
        'remboursement_id', 'get_paiement_original', 'montant_rembourse',
        'statut_remboursement', 'created_at'
    ]
    
    list_filter = ['statut_remboursement', 'created_at']
    
    search_fields = [
        'remboursement_id', 'paiement_original__transactionId',
        'raison'
    ]
    
    readonly_fields = ['remboursement_id', 'created_at']
    
    def get_paiement_original(self, obj):
        """Lien vers le paiement original"""
        url = reverse('admin:payments_paiement_change', args=[obj.paiement_original.pk])
        return format_html(
            '<a href="{}">{}</a>',
            url, obj.paiement_original.transactionId or f"Paiement #{obj.paiement_original.id}"
        )
    get_paiement_original.short_description = 'Paiement original'
