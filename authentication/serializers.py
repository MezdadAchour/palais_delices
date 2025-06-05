from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import Utilisateur

class UtilisateurSerializer(serializers.ModelSerializer):
    """Serializer pour afficher les informations utilisateur"""
    
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'nom', 'prenom', 
            'telephone', 'role', 'adresse', 'date_naissance',
            'accepte_newsletter', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'username', 'date_joined']

class UtilisateurRegistrationSerializer(serializers.ModelSerializer):
    """Serializer pour l'inscription d'un nouvel utilisateur"""
    
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = Utilisateur
        fields = [
            'email', 'password', 'password_confirm', 'nom', 'prenom',
            'telephone', 'adresse', 'date_naissance', 'accepte_newsletter'
        ]
    
    def validate(self, attrs):
        """Validation des mots de passe"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Les mots de passe ne correspondent pas.'
            })
        return attrs
    
    def validate_email(self, value):
        """Vérifier que l'email n'existe pas déjà"""
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'Un utilisateur avec cet email existe déjà.'
            )
        return value
    
    def create(self, validated_data):
        """Créer un nouvel utilisateur"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = Utilisateur.objects.create_user(
            username=validated_data['email'],  # Utiliser email comme username
            password=password,
            **validated_data
        )
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer personnalisé pour JWT avec infos utilisateur"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Ajouter des informations personnalisées au token
        token['nom'] = user.nom
        token['prenom'] = user.prenom
        token['role'] = user.role
        token['email'] = user.email
        
        return token
    
    def validate(self, attrs):
        """Validation personnalisée pour la connexion"""
        data = super().validate(attrs)
        
        # Ajouter les informations utilisateur à la réponse
        data['user'] = UtilisateurSerializer(self.user).data
        
        return data

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour changer le mot de passe"""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        """Validation des mots de passe"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Les nouveaux mots de passe ne correspondent pas.'
            })
        return attrs
    
    def validate_old_password(self, value):
        """Vérifier l'ancien mot de passe"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Ancien mot de passe incorrect.')
        return value

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour mettre à jour le profil utilisateur"""
    
    class Meta:
        model = Utilisateur
        fields = [
            'nom', 'prenom', 'telephone', 'adresse', 
            'date_naissance', 'accepte_newsletter'
        ]
    
    def validate_telephone(self, value):
        """Validation du téléphone"""
        if value and len(value) < 10:
            raise serializers.ValidationError(
                'Le numéro de téléphone doit contenir au moins 10 chiffres.'
            )
        return value

class LoginSerializer(serializers.Serializer):
    """Serializer pour la connexion (alternative simple)"""
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,  # Utiliser email comme username
                password=password
            )
            
            if not user:
                raise serializers.ValidationError('Email ou mot de passe incorrect.')
            
            if not user.is_active:
                raise serializers.ValidationError('Compte désactivé.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Email et mot de passe requis.')