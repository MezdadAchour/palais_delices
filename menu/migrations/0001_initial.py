# Generated by Django 4.2.7 on 2025-06-01 13:39

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import menu.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Categorie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('ordre', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Catégorie',
                'verbose_name_plural': 'Catégories',
                'db_table': 'categorie',
                'ordering': ['ordre', 'nom'],
            },
        ),
        migrations.CreateModel(
            name='Menu',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('actif', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Menu',
                'verbose_name_plural': 'Menus',
                'db_table': 'menu',
            },
        ),
        migrations.CreateModel(
            name='Plat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('prix', models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('disponible', models.BooleanField(default=True)),
                ('photo', models.ImageField(blank=True, null=True, upload_to=menu.models.plat_image_path)),
                ('est_specialite', models.BooleanField(default=False, help_text='Spécialité du jour')),
                ('ingredients', models.TextField(blank=True, help_text='Liste des ingrédients', null=True)),
                ('allergenes', models.TextField(blank=True, help_text='Allergènes présents', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('categorie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plats', to='menu.categorie')),
            ],
            options={
                'verbose_name': 'Plat',
                'verbose_name_plural': 'Plats',
                'db_table': 'plat',
                'ordering': ['categorie__ordre', 'nom'],
            },
        ),
    ]
