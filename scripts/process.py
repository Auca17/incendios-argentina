#!/usr/bin/env python3
"""Procesa los focos de calor de NASA FIRMS (VIIRS S-NPP) y genera data/data.js.

Uso:
  python process.py <carpeta_con_csv_firms> <ne_10m_admin_1_states_provinces.geojson> <carpeta_salida>

  - carpeta_con_csv_firms: debe contener fire_archive_*.csv y fire_nrt_*.csv (descarga de FIRMS)
  - geojson: Natural Earth admin-1 (dominio público), 10m
    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
  - carpeta_salida: normalmente ./data

Requiere: pandas, numpy, shapely>=2.
Filtro: archivo type==0 (fuego de vegetación); se descartan puntos de confianza baja ('l').
Salida: data.js (window.DATA = {prov, pm, grid, meta}) y meta.json.

Si existe scripts/events.json, también genera ev/<id>.js por incendio: focos de sus provincias
en su rango de meses, agrupados en celdas de 0,05° por semana, para mostrarlos acumulándose
(se cargan de forma perezosa, uno por incendio).
"""
import sys, glob, json, os
import numpy as np, pandas as pd, shapely
from shapely.geometry import shape, mapping

csv_dir, ne_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)

d = json.load(open(ne_path, encoding="utf-8"))
provs = [(f["properties"]["name"], shape(f["geometry"])) for f in d["features"] if f["properties"].get("admin") == "Argentina"]
prov_geo = {"type": "FeatureCollection", "features": [
    {"type": "Feature", "properties": {"name": n}, "geometry": mapping(g.simplify(0.03, preserve_topology=True))} for n, g in provs]}

arch = pd.concat([pd.read_csv(p, usecols=["latitude", "longitude", "acq_date", "confidence", "type"]) for p in glob.glob(os.path.join(csv_dir, "fire_archive_*.csv"))])
arch = arch[arch.type == 0].drop(columns="type")
nrt = pd.concat([pd.read_csv(p, usecols=["latitude", "longitude", "acq_date", "confidence"]) for p in glob.glob(os.path.join(csv_dir, "fire_nrt_*.csv"))])
df = pd.concat([arch, nrt], ignore_index=True)
df = df[df.confidence != "l"].reset_index(drop=True)

lon, lat = df.longitude.values, df.latitude.values
prov = np.full(len(df), -1, dtype=np.int16)
for i, (name, g) in enumerate(provs):
    minx, miny, maxx, maxy = g.bounds
    idx = np.where((lon >= minx) & (lon <= maxx) & (lat >= miny) & (lat <= maxy) & (prov < 0))[0]
    if len(idx):
        prov[idx[shapely.contains_xy(g, lon[idx], lat[idx])]] = i
df["prov"] = prov
ins = df[df.prov >= 0].copy()
ins["ym"] = ins.acq_date.str[:7]
ins["year"] = ins.acq_date.str[:4].astype(int)
names = [p[0] for p in provs]

pm = {n: {k: int(v) for k, v in ins[ins.prov == i].groupby("ym").size().items()} for i, n in enumerate(names)}

STEP = 0.25
ins["gx"] = (np.floor(ins.longitude / STEP) * STEP + STEP / 2).round(3)
ins["gy"] = (np.floor(ins.latitude / STEP) * STEP + STEP / 2).round(3)
grid = {}
for y, sub in ins.groupby("year"):
    c = sub.groupby(["gx", "gy"]).size().reset_index(name="n")
    grid[str(y)] = [[float(r.gx), float(r.gy), int(r.n)] for r in c.itertuples()]

tot = ins.groupby("year").size()
meta = {"fuente": "NASA FIRMS, VIIRS S-NPP (SUOMI VIIRS C2), archivo estándar + tiempo casi real", "desde": str(df.acq_date.min()), "hasta": str(df.acq_date.max()),
        "filtro": "focos de vegetación (type=0 en archivo), confianza nominal o alta", "total_focos": int(len(ins)), "por_anio": {str(k): int(v) for k, v in tot.items()}}
json.dump(meta, open(os.path.join(out, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
data = {"prov": prov_geo, "pm": pm, "grid": {"step": STEP, "anios": grid}, "meta": meta}
open(os.path.join(out, "data.js"), "w", encoding="utf-8").write("window.DATA=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";")
print("OK", len(ins), "focos ->", out)

# ---- per-fire weekly foci (optional) ----
ev_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "events.json")
if os.path.exists(ev_path):
    ESTEP = 0.05
    ev_out = os.path.join(out, "ev")
    os.makedirs(ev_out, exist_ok=True)
    dates = pd.to_datetime(ins.acq_date)
    for ev in json.load(open(ev_path, encoding="utf-8")):
        idx = [names.index(n) for n in ev["provs"]]
        start = pd.Timestamp(year=ev["year"], month=ev["from"], day=1)
        end = pd.Timestamp(year=ev["year"] + (ev["to"] == 12), month=ev["to"] % 12 + 1, day=1)
        sel = ins[ins.prov.isin(idx) & (dates >= start) & (dates < end)].copy()
        sel["week"] = ((pd.to_datetime(sel.acq_date) - start).dt.days // 7).astype(int)
        sel["ex"] = (np.floor(sel.longitude / ESTEP) * ESTEP + ESTEP / 2).round(3)
        sel["ey"] = (np.floor(sel.latitude / ESTEP) * ESTEP + ESTEP / 2).round(3)
        c = sel.groupby(["week", "ex", "ey"]).size().reset_index(name="n")
        weeks = int((end - start).days // 7) + 1
        last = str(sel.acq_date.max()) if len(sel) else None
        payload = {"step": ESTEP, "start": str(start.date()), "weeks": weeks, "last": last, "total": int(len(sel)),
                   "cells": [[float(r.ex), float(r.ey), int(r.week), int(r.n)] for r in c.itertuples()]}
        js = "window.EV_FOCI=window.EV_FOCI||{};window.EV_FOCI[" + json.dumps(ev["id"]) + "]=" + json.dumps(payload, separators=(",", ":")) + ";"
        open(os.path.join(ev_out, ev["id"] + ".js"), "w", encoding="utf-8").write(js)
        print("  ev", ev["id"], len(sel), "focos,", len(c), "celdas-semana")
