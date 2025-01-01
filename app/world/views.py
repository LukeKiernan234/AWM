import json
from django.contrib.gis.geos import Point
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model, login, logout, authenticate
from django.contrib.auth.forms import AuthenticationForm
from .models import Profile, Toilet
from django.core.serializers import serialize
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
import requests
from django.http import JsonResponse
import os
from .models import Favorite
User = get_user_model()

def set_user_location(user_id, latitude, longitude):
    user = User.objects.get(id=user_id)
    location = Point(longitude, latitude)  # Note: Point takes (longitude, latitude)

    # Create or update the user's profile
    profile, created = Profile.objects.get_or_create(user=user)
    profile.location = location
    profile.save()

    return profile

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('map')  # Redirect to the main map view
    else:
        form = AuthenticationForm()
    return render(request, 'world/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('login')  # Redirect to the login page after logout

def map_view(request):
    if request.user.is_authenticated:
        try:
            user_profile = Profile.objects.get(user=request.user)
            location = user_profile.location
        except Profile.DoesNotExist:
            location = None
        return render(request, 'world/map.html', {'user': request.user, 'location': location})
    else:
        return redirect('login')  # Redirect to login if not authenticated
    
def update_location(request):
    if request.method == 'POST' and request.user.is_authenticated:
        latitude = request.POST.get('latitude')
        longitude = request.POST.get('longitude')

        if latitude and longitude:
            try:
                latitude = float(latitude)
                longitude = float(longitude)
                location = Point(longitude, latitude)
                
                profile, created = Profile.objects.get_or_create(user=request.user)
                profile.location = location
                profile.save()

                return JsonResponse({'success': True})
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Invalid coordinates'})
            except Exception as e:
                return JsonResponse({'success': False, 'error': str(e)})
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method or user not authenticated'})
    
    
# Return toilet data as GeoJSON for the map
def toilet_geojson(request):
    toilets = Toilet.objects.all()
    geojson = serialize('geojson', toilets, geometry_field='geometry', fields=('x', 'y', 'opening_hours', 'location'))
    geojson_features = json.loads(geojson)['features']
    return JsonResponse(geojson_features, safe=False)

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}!')
            return redirect('login')  # Redirect to login after successful registration
    else:
        form = UserCreationForm()
    return render(request, 'world/register.html', {'form': form})

def home(request):
    return render(request, 'world/base.html')


def overpass_poi(request):
    if request.method == "GET":
        # Get latitude, longitude, and radius from the query parameters
        latitude = request.GET.get('latitude')
        longitude = request.GET.get('longitude')
        radius = request.GET.get('radius', 20000)  # Default radius is 2000 meters

        if latitude and longitude:
            try:
                # Build Overpass API query
                overpass_url = "https://overpass-api.de/api/interpreter"
                query = f"""
                    [out:json];
                    node["amenity"="toilets"](around:{radius}, {latitude}, {longitude});
                    out;
                """

                # Send the request
                response = requests.post(overpass_url, data={"data": query})
                response.raise_for_status()  # Raise exception for bad responses

                # Return the fetched data as JSON
                return JsonResponse(response.json(), safe=False)

            except Exception as e:
                return JsonResponse({"error": str(e)}, status=500)
        else:
            return JsonResponse({"error": "Latitude and Longitude are required"}, status=400)
        



def parks_geojson(request):
    # Construct the full path to the parks.geojson file
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'parks.geojson')

    try:
        # Open and load the GeoJSON file
        with open(file_path, 'r') as f:
            data = json.load(f)
        return JsonResponse(data, safe=False)  # Serve the file as JSON
    except FileNotFoundError:
        return JsonResponse({'error': 'Parks GeoJSON file not found'}, status=404)
    
    
    

def toggle_favorite(request):
    """Toggle a favorite amenity on or off."""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            name = data.get("name")

            # Check if favorite exists
            favorite, created = Favorite.objects.get_or_create(
                user=request.user,
                latitude=latitude,
                longitude=longitude,
                defaults={"name": name},
            )

            if not created:
                # If it already exists, remove it
                favorite.delete()
                return JsonResponse({"success": True, "action": "removed"})

            return JsonResponse({"success": True, "action": "added"})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"success": False, "error": "Invalid request or user not authenticated"}, status=400)


def get_favorites(request):
    if request.user.is_authenticated:
        # Fetch general favorites
        favorite_entries = Favorite.objects.filter(user=request.user)
        favorite_data = [
            {"latitude": fav.latitude, "longitude": fav.longitude, "name": fav.name}
            for fav in favorite_entries
        ]

        # Fetch favorites for toilets
        toilet_entries = Toilet.objects.all()
        for toilet in toilet_entries:
            if Favorite.objects.filter(user=request.user, latitude=toilet.geometry.y, longitude=toilet.geometry.x).exists():
                favorite_data.append({
                    "latitude": toilet.geometry.y,
                    "longitude": toilet.geometry.x,
                    "name": f"Toilet at {toilet.location}",
                })

        # Fetch favorites for parks
        # Assuming parks are stored in the `Favorite` model as center points
        park_favorites = Favorite.objects.filter(user=request.user)
        for fav in park_favorites:
            if "Park" in fav.name:  # Assuming parks include "Park" in the name
                favorite_data.append({
                    "latitude": fav.latitude,
                    "longitude": fav.longitude,
                    "name": fav.name,
                })

        return JsonResponse({"favorites": favorite_data})
    else:
        return JsonResponse({"error": "User not authenticated"}, status=403)
