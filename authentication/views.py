from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Utilisateur
from .serializers import (
    UtilisateurSerializer, 
    UtilisateurRegistrationSerializer,  # ✅ CORRECTION
    CustomTokenObtainPairSerializer,   # ✅ CORRECTION
    ChangePasswordSerializer,          # ✅ CORRECTION
    ProfileUpdateSerializer            # ✅ CORRECTION
)

class RegisterView(generics.CreateAPIView):
    """Inscription d'un nouvel utilisateur"""
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurRegistrationSerializer  # ✅ CORRIGÉ
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'message': 'Compte créé avec succès',
            'user': UtilisateurSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

class LoginView(generics.GenericAPIView):
    """Connexion utilisateur avec JWT"""
    serializer_class = CustomTokenObtainPairSerializer  # ✅ CORRIGÉ
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            
            return Response({
                'success': True,
                'message': 'Connexion réussie',
                'tokens': {
                    'refresh': serializer.validated_data['refresh'],
                    'access': serializer.validated_data['access'],
                },
                'user': serializer.validated_data['user']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Email ou mot de passe incorrect',
                'details': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)

class ProfileView(generics.RetrieveUpdateAPIView):
    """Voir et modifier le profil utilisateur"""
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        """Mise à jour du profil avec serializer spécialisé"""
        serializer = ProfileUpdateSerializer(
            self.get_object(), 
            data=request.data, 
            partial=kwargs.pop('partial', True)
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Profil mis à jour avec succès',
            'user': UtilisateurSerializer(user).data
        })

class ChangePasswordView(generics.GenericAPIView):
    """Changer le mot de passe"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': 'Mot de passe modifié avec succès'
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Déconnexion (blacklist du token)"""
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({
                'success': False,
                'error': 'Refresh token requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        return Response({
            'success': True,
            'message': 'Déconnexion réussie'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Token invalide',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    """Vérifier la validité du token"""
    return Response({
        'success': True,
        'message': 'Token valide',
        'user': UtilisateurSerializer(request.user).data
    })
