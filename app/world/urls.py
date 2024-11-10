from django.urls import path
from . import views


urlpatterns = [
    path('', views.map_view, name='login'),
    path('map/', views.map_view, name='map'),
    path('login/', views.login_view, name='login'),
    #path('signup/', views.signup_view, name='signup'),  
    path('logout/', views.logout_view, name='logout'),
    path('update_location/', views.update_location, name='update_location'),
    path('toilet_geojson/', views.toilet_geojson, name='toilet_geojson'),
]