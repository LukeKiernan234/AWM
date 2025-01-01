from django.contrib.gis.db import models
from django.contrib.gis.db.models import Index
from django.contrib.auth import get_user_model
from django.contrib.postgres.indexes import GistIndex
from django.contrib.auth.models import User
# Create your models here.
class Toilet(models.Model):
    location = models.CharField(max_length=100)
    opening_hours = models.CharField(max_length=100)
    geometry = models.PointField()
    def __str__(self):
        return f"{self.location}"
    

        
#Store a point location on a user's profile.
User = get_user_model()
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    location = models.PointField(null=True, blank=True)

    def __str__(self):
        return self.user.username

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.latitude}, {self.longitude})"
