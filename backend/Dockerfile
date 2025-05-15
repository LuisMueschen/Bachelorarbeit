FROM python:3.13.3-bookworm

RUN pip install trimesh signalrcore numpy

COPY . .

CMD [ "python", "./backendSignalRClient.py" ]