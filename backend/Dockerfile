FROM python:3.13.3-bookworm

RUN pip install cmake

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
    && mv cmake-3.18.6-linux-x86_64 /opt/cmake \
    && ln -sf /opt/cmake/bin/cmake /usr/local/bin/cmake

ENV PATH=/opt/cmake/bin:$PATH

RUN git clone --recursive https://gitlab.vci.rwth-aachen.de:9000/OpenMesh/openmesh-python.git
WORKDIR /openmesh-python

# Patch pybind11-CMakeLists
RUN sed -i 's/cmake_minimum_required(VERSION 3.0)/cmake_minimum_required(VERSION 3.5)/' pybind11/CMakeLists.txt

RUN printf "[build-system]\nrequires = [\"setuptools>=42\", \"wheel\", \"cython\", \"numpy\", \"cmake\"] \nbuild-backend = \"setuptools.build_meta\"" > pyproject.toml

RUN pip install . --use-pep517

# RUN git clone https://github.com/mhogg/pyoctree.git
# WORKDIR /pyoctree
# RUN printf "[build-system]\nrequires = [\"setuptools>=42\", \"wheel\", \"cython\", \"numpy\"] \nbuild-backend = \"setuptools.build_meta\"" > pyproject.toml
# RUN pip install .

# RUN pip install signalrcore numpy

RUN mkdir backend
WORKDIR /backend
COPY . .
# CMD [ "python", "./backendSignalRClient.py" ]