from django.contrib import admin
from .models import Table, Reservation

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['numero', 'nbPlaces', 'position', 'disponible', 'created_at']
    list_filter = ['disponible', 'nbPlaces', 'created_at']
    search_fields = ['numero', 'position']
    list_editable = ['disponible']
    ordering = ['numero']
    
    fieldsets = (
        ('Informations table', {
            'fields': ('numero', 'nbPlaces', 'position')
        }),
        ('Statut', {
            'fields': ('disponible',)
        }),
    )

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['get_user_name', 'table', 'dateReservation', 'heureReservation', 'nbPersonnes', 'statut', 'created_at']
    list_filter = ['statut', 'dateReservation', 'table', 'created_at']
    search_fields = ['user__nom', 'user__email', 'table__numero', 'commentaire']
    list_editable = ['statut']
    date_hierarchy = 'dateReservation'
    
    fieldsets = (
        ('Informations réservation', {
            'fields': ('user', 'dateReservation', 'heureReservation', 'nbPersonnes')
        }),
        ('Table et statut', {
            'fields': ('table', 'statut')
        }),
        ('Commentaires', {
            'fields': ('commentaire',),
            'classes': ('collapse',)
        }),
    )
    
    def get_user_name(self, obj):
        return f"{obj.user.nom} ({obj.user.email})"
    get_user_name.short_description = 'Client'
    get_user_name.admin_order_field = 'user__nom'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'table')
