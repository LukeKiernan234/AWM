from pathlib import Path
from django.contrib.gis.utils import LayerMapping
from .models import Toilet


toilet_mapping = {
    'location': 'Location',
    'opening_hours': 'Opening Hours',
    'geometry': 'Point',
}


toilet_shp = Path(__file__).resolve().parent / 'data' / 'toilets.geojson'
def run(verbose=True):
    print(toilet_mapping, Toilet)
    lm = LayerMapping(Toilet, toilet_shp, toilet_mapping, transform=False)
    lm.save(strict=True, verbose=verbose)


