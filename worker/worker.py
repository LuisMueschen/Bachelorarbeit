from signalrcore.hub_connection_builder import HubConnectionBuilder
import time
import os
import threading
import auskratzen
import tempfile
import reliefCreator
import urllib
import logging
import requests
import json

with open("cfg/config.json", 'r') as config:
    server_adress = json.load(config)["serverAdress"]

# debug event
def check_connection(args):
    print("message received: " + args[0])
    hub_connection.send("SendToFrontend", ["Hello Frontend!"])

# deprecated
# def start_new_scraping_task(data):
#     task_thread = threading.Thread(target=handle_scraping, args=data)
#     task_thread.start()

# scraping event 
def handle_scraping(data):
    # 
    # called by the server to initiate a new scraping
    # 

    # assigning and printing parameters from JSON object data
    selections = data[0]['selections']
    support_diameter = float(data[0]['supportDiameter'])
    edge_width = float(data[0]['edgeWidth'])
    transition_width = float(data[0]['transitionWidth'])
    target_wall_thickness = float(data[0]['targetWallThickness'])
    target_top_thickness = float(data[0]['targetTopThickness'])
    file_to_use = data[0]['fileToUse']
    final_filename = data[0]['finalFilename']
    frontend_id = data[0]["connectionID"] 
    print(f'Punkte: {selections}')
    print(f'Stützendurchmesser: {support_diameter}')
    print(f'Randbreite: {edge_width}')
    print(f'Übergangsbreite: {transition_width}')
    print(f'Wanddicke: {target_wall_thickness}')
    print(f'Okklusaldicke: {target_top_thickness}')
    print(f'Dateiname alt: {file_to_use}')
    print(f'Datiename neu: {final_filename}')

    # changing file paths from parameters to fit local paths
    file_to_use = f'files/{file_to_use}'
    final_filename = f'files/{final_filename}'

    # used to create random generated filename for temporary files
    def temp_filename(suffix):
        tf = tempfile.NamedTemporaryFile()
        tf.close()
        return tf.name+'.'+suffix

    # creating temporary point file
    point_file_name = temp_filename(".txt")
    with open(point_file_name, "w") as file:
        # printing coordinates into single lines
        for point in selections:
            line = " ".join(map(str, point))
            file.write(line + "\n")

    # Properly encode the filename for URL usage
    encoded_filename = urllib.parse.quote(data[0]["fileToUse"])

    # retrieving stl file from server
    urllib.request.urlretrieve(f"{server_adress}/download/{encoded_filename}", file_to_use)

    try:
        # calling scraping script with parameters
        auskratzen.modell_auskratzen(
            file_to_use,
            point_file_name,
            support_diameter,
            edge_width,
            target_wall_thickness,
            target_top_thickness,
            transition_width,
            final_filename
        )

        # upload of manipulated file to server
        files = {'file': open(final_filename, 'rb')}
        r = requests.post(url=f'{server_adress}/upload', files=files)

        # checking if file was succesfully uploaded
        if r.status_code != 200:
            hub_connection.send("ManipulationError", [frontend_id])
            print("upload fehlgeschlagen")
            return
        
        # informing frontend that task is finished and file is available to download
        hub_connection.send("NotifyFrontendAboutManipulatedMesh", [data[0]["finalFilename"], frontend_id])
    except Exception as e:
        # informing frontend that there has been an error
        hub_connection.send("ManipulationError", [frontend_id])
        print(e)
    
    # deleting temporary files
    os.remove(file_to_use)
    os.remove(final_filename)
    os.remove(point_file_name)
    print("done")
    
def handle_relief(data):
    # 
    # called by the server to initiate the creation of a new relief model
    # 

    # assigning and printing parameters from JSON object data
    frontend_id = data[0]['connectionID']
    filename = data[0]['filename']
    scale_x = float(data[0]['scaleX'])
    scale_y = float(data[0]['scaleY'])
    scale_z = float(data[0]['scaleZ'])
    invert = bool(data[0]['invert'])
    print(scale_x)
    print(scale_y)
    print(scale_z)
    print(invert)

    # changing file paths from parameters to fit local paths
    local_image_path = f"files/{filename}"
    local_stl_path = f"files/{filename[:-4]}.stl"
    print(local_image_path)
    print(local_stl_path)

    # Properly encode the filename for URL usage
    encoded_filename = urllib.parse.quote(filename)
    # retrieving image file from server
    urllib.request.urlretrieve(f"{server_adress}/download/{encoded_filename}", local_image_path)

    try:
        # creating reliev model
        reliefCreator.create_relief(local_image_path, local_stl_path, scale_x, scale_y, scale_z, invert)

        # upload of manipulated file to server
        file = {'file': open(local_stl_path, 'rb')}
        r = requests.post(url=f'{server_adress}/upload', files=file)

        # checking if file was succesfully uploaded
        if r.status_code != 200:
            hub_connection.send("ManipulationError", [frontend_id])
            print("upload fehlgeschlagen")
            return
        
        print("relief hochgeladen")

        # informing frontend
        hub_connection.send("NotifyFrontendAboutManipulatedMesh", [f"{filename[:-4]}.stl", frontend_id])
    except Exception as e:
        print(e)
        hub_connection.send("ManipulationError", [frontend_id])

    os.remove(local_image_path)
    os.remove(local_stl_path)
    
def pretend_to_work(data):
    # 
    # called by the server to make the worker look like its working for 10 seconds
    # 

    print("start working")
    time.sleep(10)
    print("working finished")
    hub_connection.send("ManipulationError", [data[0]])

def connect_with_retry():
    # creating signalR client and trying to connect to ASP.NET till connection is established
    while True:
        try:
            hub_connection = HubConnectionBuilder().with_url(f'{server_adress}/myhub').build()
            hub_connection.on('CheckConnection', check_connection)
            hub_connection.on('NewScrapingTask', handle_scraping)
            hub_connection.on('NewReliefTask', handle_relief)
            hub_connection.on('NewDummyTask', pretend_to_work)
            hub_connection.start()
            print("verbunden")
            # registering for group "worker"
            hub_connection.on_open(lambda: hub_connection.send("Register", ["worker"]))
            time.sleep(1)
            return hub_connection
        except:
            print("Verbindung Fehlgeschlagen")
            time.sleep(3)

hub_connection = connect_with_retry()

# sending regular ping to check if client is connected, if connection is lost, new try to connect
while True:
    try:
        hub_connection.send("ping", [])
    except Exception as e:
        print("Verbindung verloren")
        try:
            hub_connection.stop()
        except:
            pass
        hub_connection = connect_with_retry()
    time.sleep(5)