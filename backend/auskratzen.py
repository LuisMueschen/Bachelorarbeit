#!/usr/bin/env python3

# auskratzen: Reduktion der Wanddicke bei Gold-Restaurationen
#
# Copyright (C) 2019  Peter Rösch, Peter.Roesch@hs-augsburg.de
# for
# CADdent® GmbH, Max-Josef-Metzger-Str. 6, 86157 Augsburg
#
import sys
import os
import math
from collections import deque
import configparser
import logging
import tempfile
import copy
# import vtk
import pyoctree
import openmesh as om
import numpy as np
from pyoctree import pyoctree as ot
import stl


# Konstanten
STUETZEN_EBENEN_RADIUS_MM = 0.75
MITTELUNGS_RADIUS_MM = 0.2
PI_VIERTEL = math.pi/4
DICHTE_GOLD_G_MM_3 = 1.0/51.86
NR_UNTERTEILUNGS_ITERATIONEN = 1


# def positionen_markieren(eingabe_datei_name, punkte_datei_name):
#     """ Interaktives Markieren der relevanten posiitionen mit VTK

#         Zunaechst wird die Mitte der gewuenschten Position der
#         Stuetze markiert, anschliessend dann ein Punkt auf der
#         Innenseite der Oeffnung nahe am Rand. Die Punkte werden
#         in einer Datei gespeichert.

#         Args:
#             eingabe_datei_name (string): Name der STL-Datei
#             punkte_datei_name (string): Name der Ausgabe-Datei
#     """
#     point_list = []
#     reader = vtk.vtkSTLReader()
#     reader.SetFileName(eingabe_datei_name)
#     reader.Update()
#     poly_data = reader.GetOutput()
#     mapper = vtk.vtkPolyDataMapper()
#     mapper.SetInputData(poly_data)
#     actor = vtk.vtkActor()
#     actor.SetMapper(mapper)
#     ren = vtk.vtkRenderer()
#     ren.SetBackground(0.2, 0.2, 0.2)
#     ren.AddActor(actor)
#     renWin = vtk.vtkRenderWindow()
#     renWin.FullScreenOn()
#     renWin.BordersOn()
#     renWin.SetWindowName('Positionen definieren')
#     renWin.AddRenderer(ren)
#     iren = vtk.vtkRenderWindowInteractor()
#     iren.SetInteractorStyle(vtk.vtkInteractorStyleTrackballCamera())

#     sphere_actor_list = []

#     def kugel_hinzufuegen(pick_pos, scalar_value):
#         dataSet = vtk.vtkUnstructuredGrid()
#         points = vtk.vtkPoints()
#         scalars = vtk.vtkFloatArray()
#         dataSet.SetPoints(points)
#         dataSet.GetPointData().SetScalars(scalars)
#         points.InsertNextPoint(pick_pos)
#         scalars.InsertNextValue(scalar_value)
#         # Kugeln als Symbole
#         sphere = vtk.vtkSphereSource()
#         sphere.SetPhiResolution(20)
#         sphere.SetThetaResolution(20)
#         glyph = vtk.vtkGlyph3D()
#         glyph.SetSourceConnection(sphere.GetOutputPort())
#         glyph.SetInputData(dataSet)
#         glyph.SetScaleModeToScaleByScalar()
#         sphere_mapper = vtk.vtkPolyDataMapper()
#         sphere_mapper.SetInputConnection(glyph.GetOutputPort())
#         sphere_mapper.SetScalarRange(0, 1)
#         sphere_actor = vtk.vtkActor()
#         sphere_actor.SetMapper(sphere_mapper)
#         ren.AddActor(sphere_actor)
#         sphere_actor_list.append(sphere_actor)
#     picker = vtk.vtkCellPicker()
#     pick_color = 0.0

#     def save_pick(object, event):
#         """ Position der interaktiven Kugel auslesen und speichern """
#         nonlocal pick_color, picker
#         if picker.GetPointId() >= 0:
#             pick_pos = picker.GetPickPosition()
#             kugel_hinzufuegen(pick_pos, 0.25)
#             point_list.append((pick_pos[0], pick_pos[1], pick_pos[2]))
#             renWin.Render()

#     # Nach der Interaktion wird die Funktion save_pick aufgerufen
#     picker.AddObserver("EndPickEvent", save_pick)
#     iren.SetPicker(picker)

#     # Tastendruck verarbeiten
#     def tastatur_interaktion(obj, ev):
#         key = obj.GetKeySym()
#         if key in ('u', 'U'):
#             if point_list:
#                 point_list.pop()
#                 ren.RemoveActor(sphere_actor_list[-1])
#                 sphere_actor_list.pop()
#                 renWin.Render()
#         elif key in ('q', 'Q'):
#             renWin.Finalize()
#             iren.TerminateApp()

#     iren.AddObserver('KeyPressEvent', tastatur_interaktion)

#     iren.SetRenderWindow(renWin)
#     ren.AddActor(actor)
#     iren.Initialize()
#     renWin.Render()
#     iren.Start()
#     with open(punkte_datei_name, 'w') as punkte_datei:
#         for point in point_list:
#             for coord in point:
#                 punkte_datei.write(str(coord) + ' ')
#             punkte_datei.write('\n')
#     punkte_str = str(np.array(point_list, dtype=np.float32))
#     logging.info(f'{len(point_list)} Punkte ausgewaehlt:\n{punkte_str}')


def stl_ausrichtung_und_vermessung(eingabe_datei_name,
                                   ausgabe_datei_name):
    """ Laden und Vorverarbeitung der STL-Datei mit dem Paket stl

        Die Funktion lädt das Modell, richtet es anhand der
        Trägheitsachsen aus, speichert das Ergebnis und gibt
        das Volumen zurück.

        Args:
            eingabe_datei_name (string): Name der initialen STL-Datei
            ausgabe_datei_name (string): Name der Ausgabe-Datei

        Returns:
            volume (float): Volumen des Modells in mm^3
    """
    try:
        mesh = stl.Mesh.from_file(eingabe_datei_name, calculate_normals=True,
                                  remove_empty_areas=True,
                                  remove_duplicate_polygons=True)
    except FileNotFoundError:
        print(f'Datei {eingabe_datei_name} nicht gefunden')
        exit(-1)
    volumen, schwerpunkt, achsen = mesh.get_mass_properties()
    if ausgabe_datei_name is not None:
        eigenwerte, eigenvektoren = np.linalg.eigh(achsen)
        mesh.translate(-schwerpunkt)
        mesh.rotate_using_matrix(eigenvektoren)
        mesh.save(ausgabe_datei_name, update_normals=True)
    logging.info(f'Volumen: {volumen:.2f}')
    return volumen


class Ebene:
    """ Ueber eine Menge aus mindestens drei Punkten
        definierte Ebene
    """

    def __init__(self, punkte, referenz_richtung):
        """
        Args:
            punkte (np.array): Positionen der Punkte
            referenz_richtung (np.array): Vektor, der die Richtung
                positiver Abstaende definiert
        """
        self.punktzahl = len(punkte)
        if self.punktzahl < 3:
            raise ValueError(f'Ebene: {self.punktzahl} Punkte reichen nicht')
        self.schwerpunkt = np.mean(punkte, axis=0)
        p = punkte - self.schwerpunkt
        kovarianzmatrix = p.T.dot(p) / (p.shape[0] - 1)
        eigenwerte, eigenvektoren = np.linalg.eigh(kovarianzmatrix)
        min_index = np.argmin(np.abs(eigenwerte))
        self.normalenvektor = eigenvektoren[:, min_index]
        if np.dot(self.normalenvektor, referenz_richtung) < 0:
            self.normalenvektor *= -1

    def distanz(self, punkt):
        """ Berechnung der vorzeichenbehafteten Distanz eines
            Punktes zur Ebene

            Args: punkt (np.array): Punkt
            Returns: Distanz, positiv auf der Seite, in die der
                Normalenvektor zeigt.
        """
        return np.dot(self.normalenvektor, punkt - self.schwerpunkt)

    def projektion(self, punkt):
        """ Berechnung der Projektion eines Punktes auf die Ebene

            Args: punkt (np.array): Punkt
            Returns:
                np.array: Projektion des Punkts auf die Ebene
        """
        return punkt - self.distanz(punkt) * self.normalenvektor

    def __str__(self):
        ausgabe = f'Ebene aus {self.punktzahl} Punkten\n' +\
                  f'Schwerpunkt: {self.schwerpunkt}\n' +\
                  f'Normalenvektor: {self.normalenvektor}'
        return ausgabe


class Krone:
    """ Oberflaeche einer Zahnkrone repraesentiert als openmesh
    """
    def __init__(self, stl_datei_name, punkte_datei_name, ausgabe=True):
        """
        Konstruktor

        Args:
            stl_datei_name_eingabe (string): Name der  zu verarbeitenden
                STL-Datei
            punkte_datei_name (string): Name der Punkte-Datei, die pro
                Oeffnung zwei Zeilen enthält:
                    Position der Mitte der Stütze x, z, y
                    Position auf der Innenseite nahe am Rand: x y z
        """
        self.markierte_punkte = np.loadtxt(punkte_datei_name,
                                           dtype=np.float32)
        self.mesh = om.read_trimesh(stl_datei_name, binary=True,
                                    vertex_normal=True)
        if ausgabe:
            logging.debug(f'Datei {stl_datei_name} '
                          f'mit {len(self.mesh.points())} Punkten gelesen')
        self.status_update(ausgabe)
        print("Krone erstellt")

    def status_update(self, ausgabe):
        self.mesh.update_normals()
        self.normal_sign = 1
        self.mesh_points = self.mesh.points()
        #
        # Ecken
        self.v_stuetze = self.naechste_ecke(self.markierte_punkte[0])
        self.pos_stuetze = self.mesh.point(self.v_stuetze)
        #
        # Ebene durch die Basis-Punkte bestimmen
        basis_schwerpunkt = np.mean(self.markierte_punkte[1:], axis=0)
        self.ebene_basis = Ebene(self.markierte_punkte[1:],
                                 self.pos_stuetze-basis_schwerpunkt)
        self.vektor_basis_stuetze = self.pos_stuetze - \
            self.ebene_basis.schwerpunkt
        self.d_basis_stuetze = np.linalg.norm(self.vektor_basis_stuetze)
        self.richtung_basis_stuetze = \
            self.vektor_basis_stuetze / self.d_basis_stuetze
        #
        # Okklusal-Ebene bestimmen
        nachbarn = self.nachbarschaft(self.v_stuetze,
                                      STUETZEN_EBENEN_RADIUS_MM)
        punkte_array = np.array([self.mesh.point(n) for n in nachbarn],
                                dtype=np.float32)
        self.ebene_occ = Ebene(punkte_array,
                               basis_schwerpunkt-self.pos_stuetze)
        winkel = math.degrees(math.acos(
            np.dot(self.ebene_basis.normalenvektor,
                   self.ebene_occ.normalenvektor)))
        if ausgabe:
            logging.debug(f'Winkel zwischen der oberen und unteren Normalen:'
                          f'{winkel:.1f} Grad')
        #
        # Mittleren Radius 0.5 mm unterhalb der oberen Ebene bestimmen
        # Schwerpunkt nach unten verschieben
        schwerpunkt_kopie = self.ebene_occ.schwerpunkt.copy()
        self.ebene_occ.schwerpunkt += 0.5 * self.ebene_occ.normalenvektor
        punkte = [p for p in self.mesh.points()
                  if abs(self.ebene_occ.distanz(p)) < 0.1]
        punkte_array = np.array(punkte, dtype=np.float32)
        schwerpunkt = np.mean(punkte_array, axis=0)
        self.occ_radius = np.mean(np.linalg.norm(
            punkte_array - schwerpunkt, axis=1)) / 2.0
        if ausgabe:
            logging.debug(f'Mittlerer Radius occ: {self.occ_radius:.2f} mm')
        # Schwerpunkt wieder herstellen
        self.ebene_occ.schwerpunkt = schwerpunkt_kopie
        # Zentrum des oberen Bereichs
        self.mittelpunkt_occ = self.pos_stuetze - self.richtung_basis_stuetze\
            * self.occ_radius
        # Ebene durch das Zentrum des oberen Bereichs definieren
        self.ebene_occ_zentrum = copy.deepcopy(self.ebene_occ)
        self.ebene_occ_zentrum.schwerpunkt = self.mittelpunkt_occ
        #
        # Orientierung der Normalen testen
        if np.dot(self.mesh.normal(self.v_stuetze),
                  self.vektor_basis_stuetze) > 0:
            if ausgabe:
                logging.warning('Normalenvektoren werden umgedreht')
            self.normal_sign = -1
        #
        # octree fuer die Schnittpunktsberechnung generieren
        self.update_octree()

    def update_octree(self):
        self.octree = ot.PyOctree(self.mesh.points(),
                                  self.mesh.face_vertex_indices())

    def naechste_ecke(self, punkt):
        """
        Die Ecke mit dem kleinesten Abstand zu einem Punkt finden
            Args:
                punkt (np.array): 3D-Punkt
            Returns:
                vertex handle: Handle der gesuchten Ecke
        """
        mesh_punkte = self.mesh.points()
        min_index = np.argmin(np.linalg.norm(mesh_punkte - punkt, axis=1))
        return self.mesh.vertex_handle(min_index)

    def nachbarschaft(self, v_mitte, max_distanz_mm):
        """ Generator fue alle Ecken, die vom gegebenen Zentrum
            eine maximale Distanz haben

            Args:
                v_mitte (om.VertexHandle): Mittlere Ecke
                max_distanz_mm (float): Maximal Distanz zur Mitte
            Returns:
                om.VertexHandle: Naechste Ecke in der Umgebung
        """
        queue = deque()
        queue.append(v_mitte)
        schon_betrachtet = set()
        schon_betrachtet.add(v_mitte.idx())
        pos_mitte = self.mesh.point(v_mitte)
        while queue:
            # Punkt zurueckgeben
            v_handle = queue.pop()
            yield v_handle
            # Nachbarn speichern
            for v in self.mesh.vv(v_handle):
                v_idx = v.idx()
                if v_idx not in schon_betrachtet:
                    distanz_mm = np.linalg.norm(
                        self.mesh.point(v) - pos_mitte)
                    if distanz_mm <= max_distanz_mm:
                        queue.append(v)
                        schon_betrachtet.add(v_idx)

    def mittlere_vertex_eigenschaften(self, v_mitte, max_distanz_mm):
        """ Schwerpunkt und mittlerer Normalenvektor in einer Umgebung

            Args:
                v_mitte (om.VertexHandle): Mittlere Ecke
                max_distanz_mm (float): Maximal Distanz zur Mitte

            Returns:
                (np.array, np.array): (schwerpunkt, normalenvektor)
        """
        nachbarn = self.nachbarschaft(v_mitte, max_distanz_mm)
        pos_summe = np.zeros(3, dtype=np.float32)
        normal_summe = np.zeros(3, dtype=np.float32)
        anzahl_nachbarn = 0
        for nachbar in nachbarn:
            pos_summe += self.mesh.point(nachbar)
            normal_summe += self.mesh.normal(nachbar) * self.normal_sign
            anzahl_nachbarn += 1
        return (pos_summe / anzahl_nachbarn,
                normal_summe / np.linalg.norm(normal_summe))

    def unterteile_innenteil(self):
        logging.debug('Unterteilung des Innenteils')
        neue_vertices = 0
        for _ in range(NR_UNTERTEILUNGS_ITERATIONEN):
            besuchte_dreiecke = set()
            zu_bearbeiten = set()
            queue = deque()
            for f in self.mesh.vf(self.v_stuetze):
                queue.append(f)
                besuchte_dreiecke.add(f.idx())

            while queue:
                f_handle = queue.pop()
                for f in self.mesh.ff(f_handle):
                    f_idx = f.idx()
                    if f_idx not in besuchte_dreiecke:
                        besuchte_dreiecke.add(f_idx)
                        c = self.mesh.calc_face_centroid(f)
                        dist = abs(self.ebene_occ.distanz(c))
                        if dist <= self.occ_radius:
                            zu_bearbeiten.add(f_idx)
                            queue.append(f)
            logging.debug(f'{len(zu_bearbeiten)} Dreiecke zu unterteilen')

            for f_idx in zu_bearbeiten:
                f_handle = self.mesh.face_handle(f_idx)
                c = self.mesh.calc_face_centroid(f_handle)
                # c_handle = self.mesh.split(f_handle, c)
                neue_vertices += 1
            logging.info(f'{neue_vertices} Ecken im Innenteil hinzugefuegt')
            self.status_update(ausgabe=False)
            print("Krone unterteilt")

    def verschiebungs_richtung(self, v_handle, stuetzen_durchmesser_mm):
        """
            Berechnung der Verschiebungs-Richtung.
            Oberer Teil: radial nach aussen
            Unterer Teil: Weg von der Mittelachse

            Args:
                v_handle (om.VertexHandle): Zu verschiebende Ecke

            Returns:
                np.array: Verschiebungsrichtung
        """
        stuetzen_radius_mm = stuetzen_durchmesser_mm / 2
        v_pos = self.mesh.point(v_handle)
        d_occ = self.ebene_occ.distanz(v_pos)
        if d_occ < self.occ_radius:
            punkt_proj = self.ebene_occ_zentrum.projektion(v_pos)
            b_richtung = punkt_proj - self.ebene_occ_zentrum.schwerpunkt
            b_richtung /= np.linalg.norm(b_richtung)
            basis_punkt = self.ebene_occ_zentrum.schwerpunkt + \
                stuetzen_radius_mm * b_richtung
            v_richtung = v_pos - basis_punkt
            v_richtung /= np.linalg.norm(v_richtung)
        else:
            basis_pos = self.ebene_basis.schwerpunkt
            s_prod = np.dot(self.vektor_basis_stuetze, v_pos - basis_pos)
            projektion = s_prod / self.d_basis_stuetze
            achsen_pos = basis_pos + projektion * self.richtung_basis_stuetze
            v_vektor = v_pos - achsen_pos
            v_richtung = v_vektor / np.linalg.norm(v_vektor)
        return v_richtung

    @staticmethod
    def uebergang(x, val_0, val_1, sigma=0.6):
        """ Glatter Uebergang zwischen zwei Werten

            Args:
                x  (float): x-Position
                val_0 (float): Wert bei x=0
                val_1 (float): Wert fuer grosse x
                sigma (float): Standardabweichung des Uebergangs (Gauss)
        """
        if x < 0:
            return val_0
        else:
            w = math.exp(-x*x/(2*sigma*sigma))
            return w * val_0 + (1-w) * val_1

    def schrumpfen(self, seiten_dicke_mm, okklusal_dicke_mm,
                   stuetzen_radius_mm, rand_breite_mm,
                   uebergangs_breite_mm):
        """
            Schrumpfen der Krone zur Mitte hin

            Args:
                seiten_dicke_mm (float): Zu erreichende Dicke am Rand.
                okklusal_dicke_mm (float): Zu erreichende Dicke im Bereich
                    der Kaufläche
                stuetzen_radius_mm: Radius der Stuetze in mm
                rand_breite_mm (float): Breite des Randbereichs, der nicht
                    veraendert werden soll.
                seiten_dicke_mm (float): Zu erreichende Dicke am Rand.
                uebergangs_breite_mm (float): Breite des Übergangsbereichs
                    zwischen den Bereichen, die nicht geaendert werden
                    sollen und den Bereichen, in denen Ecken verschoben
                    werden sollen
        """
        # Berechnung von sigma fuer den Uebergang
        sigma = uebergangs_breite_mm / 2
        # Kopie der Eckpositionen
        veraenderliche_punkte = self.mesh.points().copy()
        # Startpunkt auf der Aussenhuelle finden
        strahl_array = np.array([
            self.ebene_occ.schwerpunkt,
            self.ebene_occ.schwerpunkt - self.ebene_occ.normalenvektor])
        schnittpunkt_liste = self.octree.rayIntersection(strahl_array)
        schnittpunkt = schnittpunkt_liste[-1].p
        schnittpunkt_handle = self.naechste_ecke(schnittpunkt)
        # Alle Ecken der Aussenseite in Richtung des lokalen
        # Normalenvektors nach innen verschieben
        ziel_dicke = 0
        v_richtung = np.zeros(3, dtype=np.float32)
        queue = deque()
        queue.append(schnittpunkt_handle)
        schon_betrachtet = set()
        schon_betrachtet.add(schnittpunkt_handle.idx())
        while queue:
            v_handle = queue.pop()
            v_pos = self.mesh.point(v_handle)
            index = v_handle.idx()
            v_richtung = -self.mittlere_vertex_eigenschaften(
                    v_handle, MITTELUNGS_RADIUS_MM)[1]
            d_occ = self.ebene_occ.distanz(v_pos)
            if d_occ < 0:
                ziel_dicke = okklusal_dicke_mm
            elif d_occ < 4 * sigma:
                ziel_dicke = self.uebergang(d_occ, okklusal_dicke_mm,
                                            seiten_dicke_mm, sigma)
            else:
                d_basis = self.ebene_basis.distanz(v_pos)
                ziel_dicke = self.uebergang(
                    d_basis - rand_breite_mm,
                    0, seiten_dicke_mm, sigma)
            veraenderliche_punkte[index] += ziel_dicke * v_richtung
            # Nachbarn speichern
            for v in self.mesh.vv(v_handle):
                v_idx = v.idx()
                if v_idx not in schon_betrachtet and \
                        self.ebene_basis.distanz(self.mesh.point(v)) \
                        >= rand_breite_mm/2:
                    queue.append(v)
                    schon_betrachtet.add(v_idx)
        punkte = self.mesh.points()
        punkte[:] = veraenderliche_punkte[:]
        #
        # octree fuer die Schnittpunktsberechnung aktualisieren
        self.update_octree()
        print("krone geschrumpft")

    def auskratzen(self, stuetzen_durchmesser_mm,
                   rand_breite_mm, seiten_dicke_mm, okklusal_dicke_mm,
                   uebergangs_breite_mm, octree):
        """
            Verschiebung von Vertices zur Reduktion der Dicke.

            Args:
                stuetzen_durchmesser_mm: Durchmesser der Stuetze in mm
                rand_breite_mm (float): Breite des Randbereichs, der nicht
                    veraendert werden soll.
                seiten_dicke_mm (float): Zu erreichende Dicke am Rand.
                okklusal_dicke_mm (float): Zu erreichende Dicke im Bereich
                    der Kaufläche
                uebergangs_breite_mm (float): Breite des Übergangsbereichs
                    zwischen den Bereichen, die nicht geaendert werden
                    sollen und den Bereichen, in denen Ecken verschoben
                    werden sollen
                octree (pyoctree.octree): Octree zur schnellen Schnittpunkts-
                   Berechnung
        """
        stuetzen_radius_mm = stuetzen_durchmesser_mm / 2
        mesh_points = self.mesh.points()
        #
        # Arrays zur Speicherung von Verschiebungsrichtung und -betrag
        v_richtungen = np.zeros(mesh_points.shape, dtype=np.float32)
        v_betraege = np.zeros(mesh_points.shape[0], dtype=np.float32)
        # Set erstellen
        schon_betrachtet = set()
        #
        # Vertex-Queue initialisieren
        queue = deque()
        queue.append(self.v_stuetze)
        schon_betrachtet.add(self.v_stuetze.idx())
        #
        # Liste mit fehlerhaften Schnittpunkten
        octree_fehler_menge = set()
        # Bereichswachstumsverfahren zur Bestimmung der Verschiebungs-
        # richtungen und betraege
        while(queue):
            # Punkt verschieben
            v_handle = queue.pop()
            v_idx = v_handle.idx()
            v_pos = self.mesh.point(v_handle)
            d_stuetze = np.linalg.norm(self.mesh.point(v_handle) -
                                       self.pos_stuetze)
            d_basis = self.ebene_basis.distanz(v_pos)
            if d_stuetze > stuetzen_radius_mm and \
                    d_basis > rand_breite_mm/2:
                v_richtung = self.verschiebungs_richtung(
                    v_handle, stuetzen_durchmesser_mm)
                #
                # Verschiebung der Position
                strahl_array = np.array([
                    v_pos + 0.01 * v_richtung,
                    v_pos + 1.01 * v_richtung], dtype=np.float32)
                schnittpunkt_liste = octree.rayIntersection(strahl_array)
                verschiebung = schnittpunkt_liste[-1].s
                v_richtungen[v_idx] = v_richtung
                if verschiebung > 0:
                    v_betraege[v_idx] = verschiebung
                else:
                    octree_fehler_menge.add(v_idx)
            print("hier gehts")
            # Nachbarn speichern
            for v in self.mesh.vv(v_handle):
                v_idx = v.idx()
                if v_idx not in schon_betrachtet and \
                        self.ebene_basis.distanz(self.mesh.point(v)) >= \
                        rand_breite_mm/2:
                    queue.append(v)
                    schon_betrachtet.add(v_idx)
        skalar_array = np.zeros(self.mesh_points.shape[0], dtype=np.float32)
        vektor_array = np.zeros(self.mesh_points.shape, dtype=np.float32)
        #
        # Anwendung der Verschiebungen auf das Mesh
        for idx in range(len(self.mesh_points)):
            if idx in schon_betrachtet and \
                    idx not in octree_fehler_menge:
                zaehler = 0
                v_handle = self.mesh.vertex_handle(idx)
                v_pos = self.mesh_points[idx]
                v_richtung = v_richtungen[idx]
                for v in self.mesh.vv(v_handle):
                    v_idx = v.idx()
                    skalar_array[zaehler] = v_betraege[idx]
                    zaehler += 1
                # Berechnung des Medians
                verschiebung = np.median(skalar_array[:zaehler])
                # Berechnung des Verschiebungs-Anteils
                anteil_stuetze = self.uebergang(
                        np.linalg.norm(self.pos_stuetze-v_pos),
                        0, 1, uebergangs_breite_mm/2)
                anteil_basis = self.uebergang(
                        self.ebene_basis.distanz(v_pos) - rand_breite_mm,
                        0, 1, uebergangs_breite_mm/2)
                v_anteil = min(anteil_stuetze, anteil_basis)
                mesh_points[idx] = v_pos + verschiebung * \
                    v_richtung * v_anteil
        # Glaettung
        anzahl_ausreisser = 0
        mesh_points_copy = mesh_points.copy()
        for idx in octree_fehler_menge:
            zaehler = 0
            for v in self.mesh.vv(self.mesh.vertex_handle(idx)):
                v_idx = v.idx()
                vektor_array[zaehler] = mesh_points_copy[v_idx]
                zaehler += 1
            if zaehler >= 3:
                mittlere_nachbar_position = \
                    np.mean(vektor_array[:zaehler], axis=0)
                mittlere_nachbar_std = np.std(np.linalg.norm(
                    vektor_array[:zaehler]-mittlere_nachbar_position, axis=0),
                    ddof=1)
                mesh_points[idx] = mittlere_nachbar_position
                anzahl_ausreisser += 1
        logging.info(f'{anzahl_ausreisser} Ausreisser korrigiert')


def modell_auskratzen(stl_datei_name_eingabe, punkte_datei_name,
                      stuetzen_durchmesser_mm,
                      rand_breite_mm, seiten_dicke_mm, okklusal_dicke_mm,
                      uebergangs_breite_mm,  stl_datei_name_ausgabe):
    """
        Verschiebung von Vertices zur Reduktion der Dicke.

        Args:
            stl_datei_name_eingabe (string): Name der  zu verarbeitenden
                STL-Datei
            punkte_datei_name (string): Name der Punkte-Datei, die pro
                Oeffnung zwei Zeilen enthält:
                    Position der Mitte der Stütze x, z, y
                    Position auf der Innenseite nahe am Rand: x y z
            stuetzen_durchmesser_mm: Durchmesser der Stuetze in mm
            rand_breite_mm (float): Breite des Randbereichs, der nicht
                veraendert werden soll.
            seiten_dicke_mm (float): Zu erreichende Dicke am Rand.
            okklusal_dicke_mm (float): Zu erreichende Dicke im Bereich
                der Kaufläche
            uebergangs_breite_mm (float): Breite des Übergangsbereichs
                zwischen den Bereichen, die nicht geaendert werden
                sollen und den Bereichen, in denen Ecken verschoben
                werden sollen
            stl_datei_name_ausgabe (string): Name, unter der das
                Ergebnis gespeichert werden soll
    """
    print("auskratzen gestartet")
    # Kronen-Instanz zum verschieben der Aussen-Huelle
    krone_skaliert = Krone(stl_datei_name_eingabe, punkte_datei_name)
    #
    # Alle Punkte zur Mitte hin verschieben
    krone_skaliert.schrumpfen(seiten_dicke_mm, okklusal_dicke_mm,
                              stuetzen_durchmesser_mm/2, rand_breite_mm,
                              uebergangs_breite_mm)
    #
    # Unveraenderte Krone
    krone = Krone(stl_datei_name_eingabe, punkte_datei_name, ausgabe=False)
    #
    # Innenteil unterteilen
    krone.unterteile_innenteil()
    #
    # auskratzen
    krone.auskratzen(stuetzen_durchmesser_mm,
                     rand_breite_mm, seiten_dicke_mm, okklusal_dicke_mm,
                     uebergangs_breite_mm, krone_skaliert.octree)
    #
    # Ausgabe des Ergebnisses
    om.write_mesh(stl_datei_name_ausgabe, krone.mesh, binary=True)
    logging.debug(f'{stl_datei_name_ausgabe} geschrieben')


def auskratzen_main():
    """
        Auskratzen - Funktion fuer den Aufruf der Funktionalitaet
    """
    # Erzeugen eines zufaelligen Dateinamens
    def temp_datei_name(suffix):
        tf = tempfile.NamedTemporaryFile()
        tf.close()
        return tf.name+'.'+suffix
    #
    # Einstellung des np-Ausgabe-Format
    np.set_printoptions(precision=2)
    # Einlesen der Konfigurationsdatei
    if len(sys.argv) < 3:
        print('Aufruf: auskratzen '
              'eingabe_stl_name ausgabe_stl_name [ini_name]')
        sys.exit(0)
    else:
        stl_eingabe_datei_name = sys.argv[1]
        stl_ausgabe_datei_name = sys.argv[2]
    if len(sys.argv) > 3:
        conf_file_name = sys.argv[3]
    else:
        conf_file_name = 'auskratzen.ini'
    config = configparser.ConfigParser(
        interpolation=configparser.ExtendedInterpolation())
    try:
        config.read_file(open(conf_file_name))
    except FileNotFoundError:
        print('Konfigurationsdatei "' + conf_file_name +
              '" nicht gefunden.')
        exit(0)
    # Initialisierung der Protokollierungs-Funktion (logging)
    log_level = config['logging']['level']
    if log_level not in logging.__all__:
        raise ValueError('Unngueltiges loggging level ' + log_level)
        exit(0)
    else:
        level_value = eval('logging.' + log_level)
        if not isinstance(level_value, int):
            raise ValueError('Unngueltiges loggging level ' + log_level)
        else:
            log_format = '%(asctime)s - %(levelname)s: %(message)s'
            log_filename = config['logging']['datei_name']
            log_config = {'format': log_format,
                          'level': log_level,
                          'filename': log_filename}
            logging.basicConfig(**log_config)
            logging.info('### auskratzen ' + sys.argv[1])
    # Verarbeitungsschritte aufrufen
    stl_korrigiert_datei_name = temp_datei_name('stl')
    volumen_pre = stl_ausrichtung_und_vermessung(stl_eingabe_datei_name,
                                                 stl_korrigiert_datei_name)
    #
    punkte_datei_name = '/tmp/tmpaosx1qa5.txt'
    punkte_datei_name = temp_datei_name('txt')
    # positionen_markieren(stl_korrigiert_datei_name, punkte_datei_name)
    #
    stuetzen_durchmesser_mm = config.getfloat('DEFAULT',
                                              'stuetzen_durchmesser_mm')
    seiten_dicke_mm = config.getfloat('DEFAULT', 'seiten_dicke_mm')
    okklusal_dicke_mm = config.getfloat('DEFAULT', 'okklusal_dicke_mm')
    kronenrand_breite_mm = config.getfloat('DEFAULT', 'kronenrand_breite_mm')
    uebergangs_breite_mm = config.getfloat('DEFAULT', 'uebergangs_breite_mm')
    modell_auskratzen(stl_korrigiert_datei_name, punkte_datei_name,
                      stuetzen_durchmesser_mm, kronenrand_breite_mm,
                      seiten_dicke_mm, okklusal_dicke_mm,
                      uebergangs_breite_mm, stl_ausgabe_datei_name)
    volumen_post = stl_ausrichtung_und_vermessung(stl_ausgabe_datei_name,
                                                  None)
    volumen_gespart = volumen_pre - volumen_post
    logging.info(f'Eingespartes Volumen: {volumen_gespart:.2f} mm^3')
    masse_gespart = volumen_gespart * DICHTE_GOLD_G_MM_3
    logging.info(f'Eingespartes Gold: {masse_gespart:.2f} g')
    # Temporaere Dateien loeschen
    os.remove(punkte_datei_name)
    os.remove(stl_korrigiert_datei_name)
    return 0


if __name__ == '__main__':
    import sys
    auskratzen_main()
