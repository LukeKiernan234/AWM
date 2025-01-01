from django.urls import path
from . import views


urlpatterns = [
    path('', views.map_view, name='login'),
    path('map/', views.map_view, name='map'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register, name='register'),  # Registration Page
    path('overpass_poi/', views.overpass_poi, name='overpass_poi'),
    path('logout/', views.logout_view, name='logout'),
    path('update_location/', views.update_location, name='update_location'),
    path('toilet_geojson/', views.toilet_geojson, name='toilet_geojson'),
    path('parks_geojson/', views.parks_geojson, name='parks_geojson'),
    path('toggle_favorite/', views.toggle_favorite, name='toggle_favorite'),
    path('get_favorites/', views.get_favorites, name='get_favorites'),
]