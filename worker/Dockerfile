FROM python:3.13.3-bookworm

RUN apt update && apt install -y \
    git \
    build-essential \
    libeigen3-dev \
    python3-dev \
    pybind11-dev \
    wget ca-certificates

# Entferne altes cmake, falls vorhanden
RUN apt-get remove --purge -y cmake

# CMake 3.18.6 herunterladen und installieren
RUN wget https://github.com/Kitware/CMake/releases/download/v3.18.6/cmake-3.18.6-linux-x86_64.tar.gz \
    && tar -xzvf cmake-3.18.6-linux-x86_64.tar.gz \
    && mv cmake-3.18.6-Linux-x86_64 /opt/cmake \
    && ln -sf /opt/cmake/bin/cmake /usr/local/bin/cmake

ENV PATH=/opt/cmake/bin:$PATH

RUN git clone --recursive https://gitlab.vci.rwth-aachen.de:9000/OpenMesh/openmesh-python.git
WORKDIR /openmesh-python
RUN git submodule update --init --recursive

# Patch pybind11-CMakeLists
RUN sed -i 's/cmake_minimum_required(VERSION 3.0)/cmake_minimum_required(VERSION 3.5)/' pybind11/CMakeLists.txt

RUN pip install . --use-pep517

WORKDIR /

RUN git clone https://github.com/mhogg/pyoctree.git
WORKDIR /pyoctree
RUN printf "[build-system]\nrequires = [\"setuptools>=42\", \"wheel\", \"cython\", \"numpy\"] \nbuild-backend = \"setuptools.build_meta\"" > pyproject.toml
RUN pip install .

RUN pip install signalrcore numpy cmake stl pillow trimesh

RUN mkdir worker
WORKDIR /worker
COPY . .
CMD [ "python", "worker.py" ]