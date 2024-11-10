#!/bin/bash


# Activate the conda environment
echo "Activating conda environment..."
source /opt/conda/etc/profile.d/conda.sh
conda activate awm_env


until pg_isready -h postgis -p 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done
>&2 echo "Postgres is up - executing command"

# Make migrations
echo "Making migrations..."
python manage.py makemigrations

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Create a superuser
echo "Creating a superuser..."
python manage.py createsuperuser --no-input || true
 
# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Load the data if it hasn't been loaded before
DATA_LOADED_FLAG="/data_load/data_loaded.flag"
if [ ! -f "$DATA_LOADED_FLAG" ]; then
  echo "Loading data..."
  python manage.py shell -c "from world import load; load.run()" || true
  touch "$DATA_LOADED_FLAG"
  echo "Data has been loaded on $(date '+%d-%m-%Y %H:%M:%S')." >> "$DATA_LOADED_FLAG"
else
  echo "Data has already been loaded. Skipping data load."
fi
 
# Start uWSGI
echo "Starting uWSGI..."
uwsgi --ini /app/uwsgi.ini