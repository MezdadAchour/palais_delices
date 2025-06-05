from rest_framework import serializers
from .models import Paiement
from orders.serializers import CommandeSerializer

class PaiementSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    commande_numero = serializers.CharField(source='commande.numero_commande', read_only=True)
    
    class Meta:
        model = Paiement
        fields = [
            'id', 'transactionId', 'commande', 'commande_numero',
            'datePaiement', 'montant', 'methodePaiement', 'statutPaiement',
            'noteRemboursement', 'dateRemboursement'
        ]
        read_only_fields = ['id', 'transactionId', 'datePaiement', 'dateRemboursement']

class PaiementCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un paiement"""
    
    class Meta:
        model = Paiement
        fields = ['commande', 'methodePaiement', 'montant']
    
    def validate(self, attrs):
        commande = attrs.get('commande')
        montant = attrs.get('montant')
        
        if commande and montant != commande.montant:
            raise serializers.ValidationError(
                f"Le montant ({montant}€) ne correspond pas au total de la commande ({commande.montant}€)"
            )
        
        return attrs

class PaiementDetailSerializer(PaiementSerializer):
    """Serializer détaillé pour un paiement"""
    commande = CommandeSerializer(read_only=True)
    
    class Meta(PaiementSerializer.Meta):
        fields = PaiementSerializer.Meta.fields + ['commande']