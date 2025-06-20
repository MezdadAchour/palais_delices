# Generated by Django 4.2.7 on 2025-06-01 19:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='paiement',
            name='created_at',
        ),
        migrations.RemoveField(
            model_name='paiement',
            name='metadata',
        ),
        migrations.RemoveField(
            model_name='paiement',
            name='updated_at',
        ),
        migrations.AlterField(
            model_name='paiement',
            name='methodePaiement',
            field=models.CharField(choices=[('card', 'Carte bancaire'), ('cash', 'Espèces'), ('online', 'Paiement en ligne')], max_length=10),
        ),
        migrations.AlterField(
            model_name='paiement',
            name='montant',
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name='paiement',
            name='statutPaiement',
            field=models.CharField(choices=[('pending', 'En attente'), ('completed', 'Complété'), ('failed', 'Échoué'), ('refunded', 'Remboursé')], default='pending', max_length=15),
        ),
    ]
