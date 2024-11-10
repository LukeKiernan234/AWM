from django.contrib.gis import admin
from .models import Profile, Toilet


admin.site.register(Toilet)
admin.site.register(Profile, admin.ModelAdmin)