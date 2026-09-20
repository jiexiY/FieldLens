"""Extend the existing, validated EMERGE band-ratio workflow to the campus pilot.
This is a 2024 historical vegetation signal, not a current shade or hazard model.
"""
import json
import math
import numpy as np
import prepare_data as source
from rasterio.warp import transform_bounds
from rasterio.transform import from_bounds
from PIL import Image

campus = json.loads((source.OUT / 'campus-osm.json').read_text())
s, w, n, e = campus['bbox']
source.WGSBOX = [w, s, e, n]
source.BBOX = list(transform_bounds('EPSG:4326', 'EPSG:3857', w, s, e, n))
# Roughly 10 m ground sampling, same 10 m source spectral resolution.
source.SIZE = (max(1, round((e-w)*111320*math.cos(math.radians((n+s)/2))/10)), max(1, round((n-s)*111320/10)))
source.DEST_TRANSFORM = from_bounds(*source.BBOX, *source.SIZE)
metadata = json.loads((source.OUT / 'satellite.json').read_text())
item = metadata['scenes'][1]
arrays = {}
for name in ['red', 'green', 'blue', 'nir', 'scl']:
    arrays[name] = source.read_band(item, name, name == 'scl')
    print('Read campus band', name, flush=True)
valid = np.isin(arrays['scl'], [4,5,6,7])
for name in ['red','green','nir']:
    valid &= np.isfinite(arrays[name])
with np.errstate(divide='ignore', invalid='ignore'):
    ndvi=(arrays['nir']-arrays['red'])/(arrays['nir']+arrays['red'])
ndvi[~valid | (ndvi < -1) | (ndvi > 1)] = np.nan
grid = {'bbox4326':source.WGSBOX, 'bbox3857':source.BBOX, 'width':source.SIZE[0], 'height':source.SIZE[1],
        'date':item['datetime'], 'source':item['stacUrl'], 'curriculum':metadata['curriculum'],
        'method':'NDVI=(B08-B04)/(B08+B04). STAC reflectance scaling/offset; SCL mask 4/5/6/7; nearest-neighbor reprojection. Single dated scene, not a temporal median.',
        'validFraction':round(float(np.isfinite(ndvi).mean()),4),
        'ndvi':[[round(float(v),3) if np.isfinite(v) else None for v in row] for row in ndvi]}
(source.OUT/'campus-vegetation.json').write_text(json.dumps(grid,separators=(',',':')))
rgb=np.stack([arrays['red'],arrays['green'],arrays['blue']],axis=-1)
rgb=np.clip(np.nan_to_num(rgb)/.25,0,1)**(1/1.4)
Image.fromarray((rgb*255).astype('uint8')).save(source.OUT/'campus-satellite.png')
print(json.dumps({'size':source.SIZE,'validFraction':grid['validFraction'],'date':grid['date']}),flush=True)
