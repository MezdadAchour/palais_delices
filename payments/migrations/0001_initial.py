# Generated by Django 4.2.7 on 2025-06-01 13:39

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Paiement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datePaiement', models.DateTimeField(auto_now_add=True)),
                ('montant', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('methodePaiement', models.CharField(choices=[('card', 'Carte bancaire'), ('cash', 'Espèces'), ('paypal', 'PayPal'), ('stripe', 'Stripe')], max_length=10)),
                ('statutPaiement', models.CharField(choices=[('pending', 'En attente'), ('processing', 'En cours'), ('completed', 'Terminé'), ('failed', 'Échoué'), ('cancelled', 'Annulé'), ('refunded', 'Remboursé')], default='pending', max_length=15)),
                ('transactionId', models.CharField(blank=True, max_length=100, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('commande', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='paiement', to='orders.commande')),
            ],
            options={
                'verbose_name': 'Paiement',
                'verbose_name_plural': 'Paiements',
                'db_table': 'paiement',
                'ordering': ['-datePaiement'],
            },
        ),
    ]
