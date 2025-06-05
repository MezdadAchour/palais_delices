from rest_framework import serializers
from .models import Menu, Categorie, Plat

class MenuSerializer(serializers.ModelSerializer):
    """Serializer pour les menus"""
    
    class Meta:
        model = Menu
        fields = ['id', 'nom', 'description', 'actif', 'created_at']
        read_only_fields = ['id', 'created_at']

class CategorieSerializer(serializers.ModelSerializer):
    """Serializer pour les catégories"""
    plats_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'ordre', 'plats_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_plats_count(self, obj):
        return obj.plats.filter(disponible=True).count()

class PlatSerializer(serializers.ModelSerializer):
    """Serializer pour les plats"""
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Plat
        fields = [
            'id', 'nom', 'description', 'prix', 'disponible',
            'photo', 'photo_url', 'categorie', 'categorie_nom',
            'est_specialite', 'ingredients', 'allergenes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None

class PlatDetailSerializer(PlatSerializer):
    """Serializer détaillé pour un plat"""
    categorie = CategorieSerializer(read_only=True)
    
    class Meta(PlatSerializer.Meta):
        fields = PlatSerializer.Meta.fields + ['categorie']

class CategorieWithPlatsSerializer(CategorieSerializer):
    """Serializer catégorie avec ses plats"""
    plats = PlatSerializer(many=True, read_only=True)
    
    class Meta(CategorieSerializer.Meta):
        fields = CategorieSerializer.Meta.fields + ['plats']