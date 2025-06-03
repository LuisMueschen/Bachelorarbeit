from signalrcore.hub_connection_builder import HubConnectionBuilder
import time
import os
import threading
import auskratzen
import tempfile
import heightmap
import urllib
import logging
import requests

# debug event
def check_connection(args):
    print("message received: " + args[0])
    hub_connection.send("SendToFrontend", ["Hello Frontend!"])

def start_new_scraping_task(data):
    task_thread = threading.Thread(target=handle_scraping, args=data)
    task_thread.daemon = True
    task_thread.start()

# scraping event 
def handle_scraping(data):
    selections = data[0]['selections']
    support_diameter = float(data[0]['supportDiameter'])
    edge_width = float(data[0]['edgeWidth'])
    transition_width = float(data[0]['transitionWidth'])
    target_wall_thickness = float(data[0]['targetWallThickness'])
    target_top_thickness = float(data[0]['targetTopThickness'])
    file_to_use = data[0]['fileToUse']
    final_filename = data[0]['finalFilename']
    file_to_use = f'files/{file_to_use}'
    final_filename = f'files/{final_filename}'
    connection_id = data[0]["connectionID"]
    print(f'Punkte: {selections}')
    print(f'Stützendurchmesser: {support_diameter}')
    print(f'Randbreite: {edge_width}')
    print(f'Übergangsbreite: {transition_width}')
    print(f'Wanddicke: {target_wall_thickness}')
    print(f'Okklusaldicke: {target_top_thickness}')
    print(f'Dateiname alt: {file_to_use}')
    print(f'Datiename neu: {final_filename}')

    def temp_filename(suffix):
        tf = tempfile.NamedTemporaryFile()
        tf.close()
        return tf.name+'.'+suffix

    # creating temporary point file
    point_file_name = temp_filename(".txt")
    with open(point_file_name, "w") as file:
        for point in selections:
            line = " ".join(map(str, point))
            file.write(line + "\n")

    # downloading file to manipulate
    urllib.request.urlretrieve(f"http://localhost:5500/download/{data[0]['fileToUse']}", file_to_use)

    try:
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
        r = requests.post(url='http://localhost:5500/upload', files=files)
        
        hub_connection.send("NotifyFrontendAboutManipulatedMesh", [data[0]["finalFilename"], connection_id])
    except Exception as e:
        hub_connection.send("NotifyFrontendAboutManipulationError", [connection_id])
        print(e)
    
    # deleting unneccesary files
    os.remove(file_to_use)
    os.remove(final_filename)
    os.remove(point_file_name)
    print("done")
    
def pretend_to_work():
    print("start working")
    time.sleep(10)
    print("working finished")

def handle_relief(data):
    print("relief angeforderd")
    heightmap.create_relief(data[0], "test.stl")
    hub_connection.send("NotifyFrontendAboutManipulatedMesh", [data[0], data[1]])

def connect_with_retry():
    # creating signalR client and trying to connect to ASP.NET till connection is established
    while True:
        try:
            hub_connection = HubConnectionBuilder().with_url('http://localhost:5500/myhub').build()
            hub_connection.on('CheckConnection', check_connection)
            hub_connection.on('NewScrapingTask', handle_scraping)
            hub_connection.on('NewReliefTask', handle_relief)
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