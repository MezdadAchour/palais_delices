from rest_framework import serializers
from .models import Table, Reservation
# Assurez-vous que l'import UtilisateurSerializer est correct si vous en avez besoin ailleurs,
# ou importez directement votre modèle utilisateur pour PrimaryKeyRelatedField.
from authentication.serializers import UtilisateurSerializer # Utilisé dans ReservationDetailSerializer
from django.contrib.auth import get_user_model # Pour le queryset du champ 'user'

# Imports nécessaires pour la gestion des dates et fuseaux horaires
from django.utils import timezone
from datetime import datetime, time
from django.utils.timezone import make_aware, get_current_timezone # Importez make_aware et get_current_timezone

User = get_user_model() # Obtenir le modèle Utilisateur actif

class TableSerializer(serializers.ModelSerializer):
    """Serializer pour les tables"""
    is_available = serializers.SerializerMethodField()
    
    class Meta:
        model = Table
        fields = ['id', 'numero', 'nbPlaces', 'position', 'disponible', 'is_available', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_is_available(self, obj):
        """Vérifier si la table est disponible pour une date/heure donnée"""
        # TODO: Implémenter la logique de vérification de disponibilité réelle
        #       basée sur les réservations existantes pour cette table à cette date/heure.
        #       Pour l'instant, cela reflète juste le champ 'disponible' de la table.
        return obj.disponible

class ReservationSerializer(serializers.ModelSerializer):
    """Serializer pour les réservations"""
    # Le champ 'user' est géré par CurrentUserDefault pour la création,
    # et sera un PrimaryKeyRelatedField.
    # Si vous voulez que le champ 'user' soit toujours rempli par le contexte de la requête
    # et jamais fourni directement dans le payload pour la création/mise à jour,
    # vous pouvez le rendre read_only=True ici et le gérer dans les méthodes create/update des serializers spécifiques.
    # Cependant, avec CurrentUserDefault, il est rempli si non fourni, ce qui est bien pour la création.
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        default=serializers.CurrentUserDefault() # Gère automatiquement l'utilisateur connecté à la création
    )
    user_nom = serializers.CharField(source='user.get_full_name', read_only=True)
    table_numero = serializers.CharField(source='table.numero', read_only=True)
    
    class Meta:
        model = Reservation
        fields = [
            'id', 'user', 'user_nom', 'table', 'table_numero',
            'dateReservation', 'heureReservation', 'nbPersonnes',
            'statut', 'commentaire', 'created_at'
        ]
        # 'user' n'est plus dans read_only_fields ici car il a une valeur par défaut (CurrentUserDefault)
        # ce qui signifie qu'il peut être "écrit" (ou plutôt, sa valeur par défaut peut être utilisée).
        # 'user_nom' et 'table_numero' sont purement pour l'affichage.
        read_only_fields = ['id', 'user_nom', 'table_numero', 'created_at']
    
    def validate(self, attrs):
        """Validation personnalisée"""
        date_reservation = attrs.get('dateReservation') # Sera un objet datetime.date
        heure_reservation = attrs.get('heureReservation') # Sera un objet datetime.time
        table = attrs.get('table') # Sera une instance du modèle Table
        nb_personnes = attrs.get('nbPersonnes')

        # 1. Vérifier que la date et l'heure ne sont pas dans le passé
        if date_reservation and heure_reservation: # Les deux sont requis par le modèle
            # Construire un datetime naïf à partir des objets date et time
            naive_reservation_datetime = datetime.combine(date_reservation, heure_reservation)

            # Rendre le datetime "aware" en utilisant le fuseau horaire actuel du projet Django
            # Ceci suppose que USE_TZ = True dans vos settings.py
            aware_reservation_datetime = make_aware(naive_reservation_datetime, timezone=get_current_timezone())
            
            if aware_reservation_datetime < timezone.now():
                # Renvoyer l'erreur sous une forme que le frontend peut associer aux champs
                raise serializers.ValidationError({
                    "dateReservation": ["Impossible de réserver une date ou une heure dans le passé."],
                    "heureReservation": ["Impossible de réserver une date ou une heure dans le passé."]
                })
        
        # 2. Vérifier la disponibilité générale de la table (champ 'disponible' du modèle Table)
        #    'table' est déjà une instance du modèle Table grâce à la gestion de PrimaryKeyRelatedField par DRF.
        if table and not table.disponible: # Le champ 'disponible' du modèle Table
            raise serializers.ValidationError({"table": ["Cette table n'est actuellement pas en service."]})
        
        # 3. Vérifier si le nombre de personnes ne dépasse pas la capacité de la table
        if table and nb_personnes is not None: # nbPersonnes est requis par le modèle
            if nb_personnes <= 0:
                raise serializers.ValidationError({"nbPersonnes": ["Le nombre de personnes doit être supérieur à zéro."]})
            if nb_personnes > table.nbPlaces:
                raise serializers.ValidationError({"nbPersonnes": [f"Le nombre de personnes ({nb_personnes}) dépasse la capacité de la table ({table.nbPlaces} places)."]})

        # TODO: 4. Vérification de conflit de réservation (plus complexe)
        # Il faudrait vérifier si cette 'table' est déjà réservée
        # pour la 'date_reservation' et 'heure_reservation' données (avec une certaine marge).
        # Exemple simple (à affiner avec des plages horaires) :
        # existing_reservations = Reservation.objects.filter(
        # table=table,
        # dateReservation=date_reservation,
        # heureReservation=heure_reservation
        # ).exclude(pk=self.instance.pk if self.instance else None) # Exclure la réservation actuelle en cas de mise àjour
        # if existing_reservations.exists():
        # raise serializers.ValidationError({"table": ["Cette table est déjà réservée pour ce créneau."]})
        
        return attrs

class ReservationCreateSerializer(ReservationSerializer):
    """Serializer pour créer une réservation"""
    # Le champ 'user' dans ReservationSerializer a default=serializers.CurrentUserDefault(),
    # donc DRF utilisera l'utilisateur de la requête si 'user' n'est pas fourni dans le payload.
    # La méthode create hérite du parent et fonctionnera correctement.
    # Vous n'avez plus besoin de surcharger create() juste pour assigner l'utilisateur
    # si CurrentUserDefault est utilisé sur le champ 'user' dans le serializer de base.
    pass # Aucune surcharge nécessaire si ReservationSerializer.user gère CurrentUserDefault

class ReservationDetailSerializer(ReservationSerializer):
    """Serializer détaillé pour une réservation (lecture seule)"""
    # Pour l'affichage détaillé, nous voulons l'objet Utilisateur et Table complets.
    user = UtilisateurSerializer(read_only=True) # De authentication.serializers
    table = TableSerializer(read_only=True) # Le serializer Table défini ci-dessus
    
    # La Meta hérite de ReservationSerializer.Meta, mais nous spécifions les champs
    # pour s'assurer que les versions sérialisées de 'user' et 'table' sont utilisées.
    # Les champs 'user' et 'table' ici vont écraser ceux du ReservationSerializer
    # pour l'affichage, utilisant UtilisateurSerializer et TableSerializer respectivement.
    class Meta(ReservationSerializer.Meta):
        fields = ReservationSerializer.Meta.fields # Prend tous les champs du parent,
                                                 # 'user' et 'table' seront remplacés par les définitions ci-dessus.
        # read_only_fields peuvent aussi être hérités ou redéfinis si nécessaire.