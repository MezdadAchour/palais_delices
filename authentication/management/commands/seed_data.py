# authentication/management/commands/seed_data.py

import random
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

# Assurez-vous que ces imports correspondent à l'emplacement de vos modèles.
# Si une application s'appelle 'users' au lieu de 'authentication', ajustez l'import.
from authentication.models import Utilisateur
from menu.models import Menu, Categorie, Plat
from orders.models import Commande, LigneCommande
from payments.models import Paiement, Remboursement
from restaurant.models import Table, Reservation

# Initialiser Faker pour générer des données en français
fake = Faker('fr_FR')

class Command(BaseCommand):
    """
    Commande de gestion Django pour peupler la base de données avec des données factices.
    Cette commande est essentielle pour créer un environnement de développement et de test réaliste.
    """
    help = 'Peuple la base de données avec des données factices pour le développement.'

    def add_arguments(self, parser):
        """
        Ajoute des arguments à la commande pour la rendre plus flexible.
        Cela permet de spécifier le nombre d'objets à créer directement depuis la ligne de commande.
        """
        # Mise à jour des quantités par défaut selon la demande
        parser.add_argument('--users', type=int, help="Le nombre d'utilisateurs à créer", default=10)
        parser.add_argument('--tables', type=int, help='Le nombre de tables à créer', default=10)
        parser.add_argument('--plats', type=int, help='Le nombre de plats à créer', default=20)
        parser.add_argument('--commandes', type=int, help='Le nombre de commandes à créer', default=20)
        parser.add_argument('--reservations', type=int, help='Le nombre de réservations à créer', default=10)

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Logique principale de la commande. Enveloppée dans une transaction atomique
        pour garantir l'intégrité des données : si une erreur survient, tout est annulé.
        """
        self.stdout.write(self.style.SUCCESS("Début du processus de seeding..."))

        # Récupération des nombres d'objets à créer depuis les arguments
        num_users = options['users']
        num_tables = options['tables']
        num_plats = options['plats']
        num_commandes = options['commandes']
        num_reservations = options['reservations']

        # -------------------------------------------------------------------
        # 1. Nettoyage de la base de données (ordre inverse des dépendances)
        # -------------------------------------------------------------------
        self.stdout.write("Nettoyage de l'ancienne base de données...")
        Remboursement.objects.all().delete()
        Paiement.objects.all().delete()
        LigneCommande.objects.all().delete()
        Commande.objects.all().delete()
        Reservation.objects.all().delete()
        Table.objects.all().delete()
        Plat.objects.all().delete()
        Categorie.objects.all().delete()
        Menu.objects.all().delete()
        # On ne supprime que les utilisateurs non-staff/super-utilisateurs
        Utilisateur.objects.filter(is_superuser=False, is_staff=False).delete()
        self.stdout.write(self.style.SUCCESS("Nettoyage terminé."))

        # -------------------------------------------------------------------
        # 2. Création des Utilisateurs
        # -------------------------------------------------------------------
        self.stdout.write(f"Création de {num_users} utilisateurs...")
        
        # Créer un superutilisateur pour l'administration si aucun n'existe
        if not Utilisateur.objects.filter(is_superuser=True).exists():
            Utilisateur.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='adminpassword',
                nom='Admin',
                prenom='Super',
                role='admin'
            )
        
        # Créer quelques membres du personnel pour la gestion
        for i in range(2):
            if not Utilisateur.objects.filter(username=f'staff{i}').exists():
                Utilisateur.objects.create_user(
                    username=f'staff{i}',
                    email=f'staff{i}@example.com',
                    password='staffpassword',
                    nom=fake.last_name(),
                    prenom=fake.first_name(),
                    role='staff',
                    is_staff=True
                )

        users = []
        for _ in range(num_users):
            user = Utilisateur.objects.create_user(
                username=fake.unique.user_name(),
                email=fake.unique.email(),
                password='password123',
                nom=fake.last_name(),
                prenom=fake.first_name(),
                role='client',
                telephone=fake.phone_number(),
                adresse=fake.address(),
                date_naissance=fake.date_of_birth(minimum_age=18, maximum_age=70),
                accepte_newsletter=random.choice([True, False])
            )
            users.append(user)

        self.stdout.write(self.style.SUCCESS(f"{Utilisateur.objects.count()} utilisateurs dans la base."))
        all_clients = list(Utilisateur.objects.filter(role='client'))
        if not all_clients:
             self.stdout.write(self.style.WARNING("Aucun utilisateur client n'a été créé. Impossible de créer des commandes ou réservations."))
             all_clients = list(Utilisateur.objects.exclude(is_superuser=True)) # fallback
             if not all_clients:
                self.stdout.write(self.style.ERROR("Aucun utilisateur disponible pour la création de commandes."))
                return


        # -------------------------------------------------------------------
        # 3. Création du Menu, Catégories et Plats
        # -------------------------------------------------------------------
        self.stdout.write("Création du menu, des catégories et des plats...")
        menu, _ = Menu.objects.get_or_create(nom="Menu Principal", defaults={'description': "Notre sélection des meilleurs plats.", 'actif': True})
        
        categories_data = [
            {'nom': 'Entrées', 'description': 'Pour bien commencer.'},
            {'nom': 'Plats Principaux', 'description': 'Le coeur du repas.'},
            {'nom': 'Desserts', 'description': 'La touche sucrée finale.'},
            {'nom': 'Boissons', 'description': 'Pour accompagner votre repas.'},
            {'nom': 'Spécialités du Chef', 'description': 'Les créations uniques.'},
        ]
        
        categories = []
        for i, cat_data in enumerate(categories_data):
            cat, _ = Categorie.objects.get_or_create(nom=cat_data['nom'], defaults={'description': cat_data['description'], 'ordre': i + 1})
            categories.append(cat)
            
        plats = []
        for _ in range(num_plats):
            plat = Plat.objects.create(
                nom=fake.catch_phrase(),
                description=fake.sentence(nb_words=10),
                categorie=random.choice(categories),
                prix=round(random.uniform(5.5, 35.0), 2),
                disponible=random.choices([True, False], weights=[0.9, 0.1], k=1)[0],
                est_specialite=random.choices([True, False], weights=[0.2, 0.8], k=1)[0],
                ingredients=', '.join(fake.words(nb=random.randint(4, 8))),
                allergenes=random.choice(['', 'Gluten, Lait', 'Arachides', '']),
            )
            plats.append(plat)
        self.stdout.write(self.style.SUCCESS(f"{Plat.objects.count()} plats créés."))

        # -------------------------------------------------------------------
        # 4. Création des Tables de restaurant
        # -------------------------------------------------------------------
        self.stdout.write(f"Création de {num_tables} tables...")
        tables = []
        for i in range(1, num_tables + 1):
            table = Table.objects.create(
                numero=str(i),
                nbPlaces=random.choice([2, 4, 4, 6, 8]),
                position=random.choice(['Intérieur', 'Terrasse', 'Près de la fenêtre']),
                disponible=True
            )
            tables.append(table)
        self.stdout.write(self.style.SUCCESS(f"{Table.objects.count()} tables créées."))

        # -------------------------------------------------------------------
        # 5. Création des Réservations
        # -------------------------------------------------------------------
        self.stdout.write(f"Création de {num_reservations} réservations...")
        for _ in range(num_reservations):
            date_res = timezone.now() + timedelta(days=random.randint(-30, 30))
            Reservation.objects.create(
                user=random.choice(all_clients),
                table=random.choice(tables),
                dateReservation=date_res.date(),
                heureReservation=random.choice(['12:00:00', '13:00:00', '19:30:00', '20:30:00']),
                nbPersonnes=random.randint(1, 6),
                statut=random.choice(['confirmed', 'pending', 'cancelled']),
                commentaire=fake.sentence()
            )
        self.stdout.write(self.style.SUCCESS(f"{Reservation.objects.count()} réservations créées."))

        # -------------------------------------------------------------------
        # 6. Création des Commandes et Lignes de Commande
        # -------------------------------------------------------------------
        self.stdout.write(f"Création de {num_commandes} commandes...")
        for i in range(num_commandes):
            client = random.choice(all_clients)
            date_commande = timezone.now() - timedelta(days=random.randint(1, 180), hours=random.randint(1, 23))
            
            # **CORRECTION DE LA CONTRAINTE UNIQUE**
            # On génère un numéro de commande unique ici pour éviter les conflits.
            commande = Commande.objects.create(
                numero_commande=f"CMD-{uuid.uuid4().hex[:8].upper()}",
                user=client,
                dateCommande=date_commande,
                statut=random.choice(['pending', 'processing', 'completed', 'cancelled']),
                fraisLivraison=round(random.uniform(2.5, 5.0), 2),
                modeLivraison=random.choice(['delivery', 'takeaway']),
                modePaiement=random.choice(['card', 'cash']),
                adresseLivraison=client.adresse,
                telephoneContact=client.telephone,
                commentaire=fake.sentence(),
                montant=0
            )
            
            total_commande = 0
            # Ajouter entre 1 et 5 plats par commande
            for _ in range(random.randint(1, 5)):
                plat_choisi = random.choice(plats)
                quantite = random.randint(1, 3)
                
                LigneCommande.objects.create(
                    commande=commande,
                    plat=plat_choisi,
                    quantite=quantite,
                    prixUnitaire=plat_choisi.prix,
                )
                total_commande += quantite * plat_choisi.prix

            # Mettre à jour le montant final de la commande avec la valeur calculée
            commande.montant = total_commande + commande.fraisLivraison
            commande.save()

            # ---------------------------------------------------------------
            # 7. Création des Paiements associés
            # ---------------------------------------------------------------
            if commande.statut != 'cancelled':
                paiement = Paiement.objects.create(
                    commande=commande,
                    montant=commande.montant,
                    methodePaiement=commande.modePaiement,
                    statutPaiement=random.choices(['completed', 'pending', 'failed'], weights=[0.8, 0.1, 0.1], k=1)[0],
                    datePaiement=commande.dateCommande + timedelta(minutes=random.randint(1, 10))
                )
                
                # -----------------------------------------------------------
                # 8. Création de quelques Remboursements (pour le réalisme)
                # -----------------------------------------------------------
                if paiement.statutPaiement == 'completed' and random.choices([True, False], weights=[0.05, 0.95], k=1)[0]:
                     paiement.statutPaiement = 'refunded'
                     paiement.save()
                     Remboursement.objects.create(
                        paiement_original=paiement,
                        montant_rembourse=paiement.montant,
                        raison=fake.sentence(),
                        statut_remboursement=random.choice(['processed', 'pending'])
                     )

        self.stdout.write(self.style.SUCCESS(f"{Commande.objects.count()} commandes créées."))
        self.stdout.write(self.style.SUCCESS(f"{Paiement.objects.count()} paiements créés."))
        self.stdout.write(self.style.SUCCESS(f"{Remboursement.objects.count()} remboursements créés."))
        self.stdout.write(self.style.SUCCESS("\n🎉 Seeding terminé avec succès ! Votre base de données est prête."))
