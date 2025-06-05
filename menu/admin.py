from django.contrib import admin
from .models import Menu, Categorie, Plat

@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ['nom', 'actif', 'created_at']
    list_filter = ['actif', 'created_at']
    search_fields = ['nom', 'description']
    list_editable = ['actif']
    
    fieldsets = (
        (None, {
            'fields': ('nom', 'description', 'actif')
        }),
    )

@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'ordre', 'get_plats_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['nom', 'description']
    list_editable = ['ordre']
    ordering = ['ordre', 'nom']
    
    def get_plats_count(self, obj):
        return obj.plats.count()
    get_plats_count.short_description = 'Nombre de plats'
    get_plats_count.admin_order_field = 'plats__count'

@admin.register(Plat)
class PlatAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'prix', 'disponible', 'est_specialite', 'created_at']
    list_filter = ['categorie', 'disponible', 'est_specialite', 'created_at']
    search_fields = ['nom', 'description', 'ingredients']
    list_editable = ['prix', 'disponible', 'est_specialite']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('nom', 'description', 'categorie', 'prix')
        }),
        ('Disponibilité et statut', {
            'fields': ('disponible', 'est_specialite')
        }),
        ('Image', {
            'fields': ('photo',)
        }),
        ('Détails nutritionnels', {
            'fields': ('ingredients', 'allergenes'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('categorie')
