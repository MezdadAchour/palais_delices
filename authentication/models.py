from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator

class UtilisateurManager(BaseUserManager):
    """
    Manager personnalisé pour utiliser l'email comme identifiant
    """
    def create_user(self, email, password=None, **extra_fields):
        """Créer et sauvegarder un utilisateur avec email et mot de passe"""
        if not email:
            raise ValueError('L\'adresse email est obligatoire')
        
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)  # Utiliser email comme username
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Créer et sauvegarder un superutilisateur"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superutilisateur doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superutilisateur doit avoir is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)

class Utilisateur(AbstractUser):
    """
    Modèle utilisateur personnalisé conforme au rapport de mémoire
    """
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('admin', 'Administrateur'),
        ('staff', 'Personnel'),
    ]
    
    # Champs obligatoires
    nom = models.CharField(
        max_length=50,
        verbose_name="Nom de famille",
        help_text="Nom de famille de l'utilisateur"
    )
    
    prenom = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Prénom",
        help_text="Prénom de l'utilisateur"
    )
    
    # Email unique et obligatoire
    email = models.EmailField(
        unique=True,
        verbose_name="Adresse email",
        help_text="Adresse email (utilisée pour la connexion)"
    )
    
    # Validation du numéro de téléphone
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Le numéro de téléphone doit être au format: '+999999999'. 15 chiffres maximum."
    )
    
    telephone = models.CharField(
        validators=[phone_regex],
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Téléphone",
        help_text="Numéro de téléphone au format international"
    )
    
    # Rôle utilisateur (conforme au rapport)
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='client',
        verbose_name="Rôle",
        help_text="Rôle de l'utilisateur dans le système"
    )
    
    # Adresse complète
    adresse = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse complète",
        help_text="Adresse de livraison ou de facturation"
    )
    
    # Champs supplémentaires
    date_naissance = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date de naissance"
    )
    
    accepte_newsletter = models.BooleanField(
        default=False,
        verbose_name="Accepte la newsletter"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    
    # Configuration pour utiliser email comme identifiant
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom']  # Champs requis en plus de email et password
    
    # Utiliser le manager personnalisé
    objects = UtilisateurManager()
    
    class Meta:
        db_table = 'utilisateur'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        """Représentation string de l'utilisateur"""
        if self.prenom:
            return f"{self.nom} {self.prenom} ({self.email})"
        return f"{self.nom} ({self.email})"
    
    def get_full_name(self):
        """Retourne le nom complet"""
        if self.prenom:
            return f"{self.prenom} {self.nom}"
        return self.nom
    
    def get_short_name(self):
        """Retourne le prénom ou nom"""
        return self.prenom if self.prenom else self.nom
    
    def is_admin(self):
        """Vérifie si l'utilisateur est administrateur"""
        return self.role == 'admin' or self.is_superuser
    
    def is_staff_member(self):
        """Vérifie si l'utilisateur fait partie du personnel"""
        return self.role in ['admin', 'staff'] or self.is_staff
    
    def is_client(self):
        """Vérifie si l'utilisateur est un client"""
        return self.role == 'client'
    
    def save(self, *args, **kwargs):
        """Override save pour utiliser email comme username"""
        if self.email:
            self.username = self.email
        super().save(*args, **kwargs)
