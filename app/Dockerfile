FROM condaforge/miniforge3

RUN mkdir -p /app
WORKDIR /app

# Create the env vars
ENV PYTHONBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=dublin_cycleways.settings

# Create the environment:
COPY ENV.yml /app
RUN conda env create -f ENV.yml && conda clean -afy

RUN apt-get update && apt-get install -y postgresql-client && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the entrypoint script and set permissions
COPY docker-entrypoint.sh /app
# Activate the environment and ensure the entrypoint script is executable
RUN /bin/bash -c "source activate awm_env && chmod +x /app/docker-entrypoint.sh"

# Copy everything in your Django project to the image.
COPY . /app
ENV PYTHONPATH="/app"

# Expose the port uWSGI will run on
EXPOSE 8000

# Run the entrypoint script
ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]

# Run uWSGI
CMD ["uwsgi", "--ini", "/app/uwsgi.ini"]