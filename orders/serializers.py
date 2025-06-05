# orders/serializers.py CORRIGÉ pour l'erreur de source redondante

from rest_framework import serializers
from django.db import transaction
from .models import Commande, LigneCommande, Plat
from authentication.serializers import UtilisateurSerializer
from menu.serializers import PlatSerializer

from django.contrib.auth import get_user_model
# from django.utils import timezone # Non utilisé directement ici
# from datetime import datetime, time # Non utilisé directement ici
# from django.utils.timezone import make_aware, get_current_timezone # Non utilisé directement ici

User = get_user_model()


class LigneCommandeSerializer(serializers.ModelSerializer):
    """Serializer de base pour les lignes de commande (pour création et lecture simple)"""
    plat_nom = serializers.CharField(source='plat.nom', read_only=True)

    class Meta:
        model = LigneCommande
        fields = [
            'id', 'plat', 'plat_nom',
            'quantite', 'prixUnitaire', 'sousTotal'
        ]
        read_only_fields = ['id', 'sousTotal', 'plat_nom']

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être au moins de 1.")
        return value


class LigneCommandeDetailSerializer(LigneCommandeSerializer):
    """Serializer détaillé pour une ligne de commande, incluant l'objet Plat complet (pour lecture)"""
    plat = PlatSerializer(read_only=True)

    class Meta(LigneCommandeSerializer.Meta):
        pass


class CommandeSerializer(serializers.ModelSerializer):
    """Serializer pour afficher/lister les commandes (avec lignes de base)"""
    user = UtilisateurSerializer(read_only=True)
    # user_nom est redondant si 'user' est déjà UtilisateurSerializer qui contient nom/prenom.
    # Vous pouvez le garder si vous avez une raison spécifique.
    # user_nom = serializers.CharField(source='user.get_full_name', read_only=True)
    
    # --- CORRECTION ICI ---
    total_items = serializers.IntegerField(read_only=True) # 'source' enlevé car redondant
    # --- FIN DE LA CORRECTION ---
    
    lignes = LigneCommandeSerializer(many=True, read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id', 'numero_commande', 'user', # 'user_nom' enlevé car redondant avec 'user' détaillé
            'dateCommande', 'statut', 'montant', 'fraisLivraison',
            'modeLivraison', 'modePaiement', 'adresseLivraison',
            'telephoneContact', 'commentaire', 'total_items', 'lignes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'numero_commande', 'user', 'dateCommande', 'created_at', 'updated_at',
            'total_items', 'montant', 'lignes', 'statut'
        ]

    def validate(self, attrs):
        mode_livraison = attrs.get('modeLivraison')
        adresse_livraison = attrs.get('adresseLivraison')
        if mode_livraison == 'delivery' and not adresse_livraison:
            raise serializers.ValidationError({
                "adresseLivraison": "L'adresse de livraison est requise pour la livraison à domicile."
            })
        return attrs


class CommandeCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une nouvelle commande"""
    lignes_commande = LigneCommandeSerializer(many=True, write_only=True)

    class Meta:
        model = Commande
        fields = [
            'modeLivraison', 'modePaiement', 'fraisLivraison',
            'adresseLivraison', 'telephoneContact', 'commentaire',
            'lignes_commande'
        ]

    def validate_modeLivraison(self, value):
        valid_choices = [choice[0] for choice in Commande.LIVRAISON_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(f"« {value} » n'est pas un choix valide pour le mode de livraison.")
        return value

    def validate_modePaiement(self, value):
        valid_choices = [choice[0] for choice in Commande.PAIEMENT_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(f"« {value} » n'est pas un choix valide pour le mode de paiement.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes_commande')
        total_montant_calcule = 0
        for ligne_data in lignes_data:
            try:
                prix_unitaire = ligne_data['prixUnitaire']
                quantite = ligne_data['quantite']
                total_montant_calcule += (prix_unitaire * quantite)
            except KeyError:
                raise serializers.ValidationError("Chaque ligne de commande doit contenir 'prixUnitaire' et 'quantite'.")
            except TypeError:
                raise serializers.ValidationError("Erreur de type pour prixUnitaire ou quantite dans les lignes de commande.")

        validated_data['montant'] = total_montant_calcule
        validated_data['user'] = self.context['request'].user
        commande = Commande.objects.create(**validated_data)
        
        for ligne_data in lignes_data:
            LigneCommande.objects.create(commande=commande, **ligne_data)
        
        return commande


class CommandeDetailSerializer(CommandeSerializer):
    """Serializer pour le détail d'une commande, avec lignes et utilisateur détaillés"""
    lignes = LigneCommandeDetailSerializer(many=True, read_only=True)
    # Le champ 'user' est déjà défini dans CommandeSerializer comme UtilisateurSerializer(read_only=True)
    # donc pas besoin de le redéfinir ici à moins de vouloir un autre serializer User.

    class Meta(CommandeSerializer.Meta):
        # Les champs sont hérités, 'lignes' est surchargé.
        # 'user' hérite de CommandeSerializer.
        fields = CommandeSerializer.Meta.fields
