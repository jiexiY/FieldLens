"""Reproduce the Lake Alice sample from public USGS + Copernicus sources.

EMERGE Textbook 1, Ch 3 Lesson 3: NDVI=(NIR-red)/(NIR+red),
NDWI=(green-NIR)/(green+NIR). This adaptation uses two individual clear
Sentinel-2 L2A acquisitions rather than the lesson's temporal median.
No disease, water-quality, flood, or land-cover prediction is made.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent / '.deps'))
import concurrent.futures as futures
import datetime as dt
import io
import json
import math
import os
import urllib.parse
import urllib.request
import numpy as np
from PIL import Image
import laspy
import rasterio
from rasterio.warp import reproject, transform_bounds, Resampling
from rasterio.windows import from_bounds, Window
from rasterio.transform import from_bounds as make_transform
import certifi

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data-cache'
OUT = ROOT / 'public' / 'data'
CACHE.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
EPT = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/FL_Peninsular_FDEM_Alachua_2018'
STAC = 'https://earth-search.aws.element84.com/v1'
COLLECTION = 'sentinel-2-c1-l2a'
AERIAL = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer'
LON, LAT = -82.3630, 29.6420
COS = math.cos(math.radians(LAT))
CX = math.radians(LON) * 6378137
CY = math.log(math.tan(math.pi/4 + math.radians(LAT)/2)) * 6378137
WIDTH, HEIGHT = 1000, 780  # approximate local ground metres
BBOX = [CX-WIDTH/2/COS, CY-HEIGHT/2/COS, CX+WIDTH/2/COS, CY+HEIGHT/2/COS]
WGSBOX = transform_bounds('EPSG:3857', 'EPSG:4326', *BBOX)
SIZE = (128, 100)
DEST_TRANSFORM = make_transform(*BBOX, *SIZE)

def get(url, payload=None):
    req = urllib.request.Request(url, data=json.dumps(payload).encode() if payload else None,
        headers={'User-Agent':'FieldLens research prototype/0.1', 'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()

def cached(name, url, payload=None):
    file = CACHE / name
    if not file.exists():
        file.write_bytes(get(url, payload))
    return file.read_bytes()

def lidar():
    meta = json.loads(cached('ept.json', EPT + '/ept.json'))
    bounds = meta['bounds']
    nodes = {}
    def intersects(key):
        d,x,y,z = map(int, key.split('-'))
        if d > 10: return False
        edge=(bounds[3]-bounds[0])/(2**d)
        low = [bounds[0]+edge*x, bounds[1]+edge*y, bounds[2]+edge*z]
        return low[0] <= BBOX[2] and low[0]+edge >= BBOX[0] and low[1] <= BBOX[3] and low[1]+edge >= BBOX[1] and low[2] <= 120 and low[2]+edge >= -10
    pending=['0-0-0-0']
    visited=set()
    while pending:
        key=pending.pop()
        if key in visited: continue
        visited.add(key)
        tree=json.loads(cached(f'hierarchy-{key}.json', f'{EPT}/ept-hierarchy/{key}.json'))
        for node,count in tree.items():
            if not intersects(node): continue
            if count == -1: pending.append(node)
            elif count > 0: nodes[node]=count
    print(f'LiDAR: extracting {len(nodes)} intersecting octree nodes', flush=True)
    def read_node(key):
        raw=cached(f'{key}.laz', f'{EPT}/ept-data/{key}.laz')
        las=laspy.read(io.BytesIO(raw))
        x,y,z=np.array(las.x),np.array(las.y),np.array(las.z)
        classes=np.array(las.classification)
        keep=(x>=BBOX[0])&(x<=BBOX[2])&(y>=BBOX[1])&(y<=BBOX[3])&(z>-10)&(z<120)&~np.isin(classes,[7,18])
        return np.stack([(x[keep]-CX)*COS, z[keep], -(y[keep]-CY)*COS, classes[keep]],axis=1)
    with futures.ThreadPoolExecutor(max_workers=8) as pool:
        arrays=list(pool.map(read_node, sorted(nodes)))
    points=np.concatenate(arrays)
    before=len(points)
    # Fixed seed for a reproducible display subset. This is not an analytic density sample.
    if len(points)>650000:
        points=points[np.random.default_rng(42).choice(len(points),650000,replace=False)]
    z0=float(np.percentile(points[points[:,3]==2,1], 2))
    points[:,1]-=z0
    points.astype('<f4').tofile(OUT/'lake-alice.bin')
    classes, counts = np.unique(points[:,3], return_counts=True)
    info={
        'source':EPT+'/ept.json', 'dataset':'FL_Peninsular_FDEM_Alachua_2018',
        'surveyPeriod':'2018-12-05 / 2019-12-03', 'points':len(points), 'pointsBeforeDisplaySampling':before,
        'maxOctreeDepth':10, 'originLongitude':LON, 'originLatitude':LAT, 'originZ':z0,
        'horizontalCRS':'EPSG:3857', 'localScale':COS, 'width':WIDTH,'height':HEIGHT,
        'binaryFormat':'little-endian float32 [east metres, elevation minus originZ, south metres, LAS classification]',
        'classificationCounts':dict(zip(map(lambda c:str(int(c)),classes),map(int,counts))),
        'colorNote':'Point colors can use a separate aerial mosaic or a display palette. The LAS dataset contains no RGB.',
    }
    (OUT/'lidar.json').write_text(json.dumps(info,indent=2))
    print(f'LiDAR ready: {len(points):,} points, base elevation {z0:.2f}',flush=True)
    return info

def aerial():
    params={'bbox':','.join(map(str,BBOX)), 'bboxSR':3857,'imageSR':3857,
        'size':'1600,1248','format':'jpg','interpolation':'RSP_BilinearInterpolation','f':'json'}
    result=json.loads(cached('aerial-export.json', AERIAL+'/exportImage?'+urllib.parse.urlencode(params)))
    if 'href' not in result: raise RuntimeError(result)
    (OUT/'aerial.jpg').write_bytes(cached('aerial.jpg',result['href']))
    identify={'geometry':json.dumps({'x':CX,'y':CY,'spatialReference':{'wkid':3857}}),
        'geometryType':'esriGeometryPoint','returnCatalogItems':'true','returnGeometry':'false','f':'json'}
    catalog=json.loads(cached('aerial-identify.json',AERIAL+'/identify?'+urllib.parse.urlencode(identify)))
    info={'source':AERIAL,'export':result,'catalog':catalog,'retrieved':dt.datetime.now(dt.timezone.utc).isoformat(),
        'note':'USGS NAIP Plus aerial mosaic; capture date can vary across the scene. Separate acquisition from LiDAR.'}
    (OUT/'aerial.json').write_text(json.dumps(info,indent=2))
    print('USGS aerial mosaic ready',flush=True)
    return info

def read_band(item, name, categorical=False):
    asset=item['assets'][name]
    href=asset['href']
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_MAX_RETRY=2,
                      GDAL_HTTP_TIMEOUT=60, GDAL_HTTP_CONNECTTIMEOUT=15,
                      GDAL_HTTP_UNSAFESSL='NO', CURL_CA_BUNDLE=certifi.where()):
        with rasterio.open(href) as ds:
            wb=transform_bounds('EPSG:3857',ds.crs,*BBOX,densify_pts=21)
            approximate=from_bounds(*wb,transform=ds.transform)
            left=max(0,math.floor(approximate.col_off)-2)
            top=max(0,math.floor(approximate.row_off)-2)
            right=min(ds.width,math.ceil(approximate.col_off+approximate.width)+2)
            bottom=min(ds.height,math.ceil(approximate.row_off+approximate.height)+2)
            window=Window(left,top,right-left,bottom-top)
            data=ds.read(1,window=window)
            dest=np.zeros((SIZE[1],SIZE[0]),dtype='float32')
            reproject(data,dest,src_transform=ds.window_transform(window),src_crs=ds.crs,
                dst_transform=DEST_TRANSFORM,dst_crs='EPSG:3857',resampling=Resampling.nearest,
                src_nodata=ds.nodata,dst_nodata=0)
    bands=asset.get('raster:bands',[{}])[0]
    if not categorical:
        valid=dest!=0
        dest=dest*bands.get('scale',1)+bands.get('offset',0)
        dest[~valid]=np.nan
    return dest

def ramp(values, stops):
    result=np.zeros((*values.shape,4),dtype='uint8')
    for c in range(3):
        result[:,:,c]=np.interp(np.nan_to_num(values,nan=0), [s[0] for s in stops],[s[1][c] for s in stops]).astype('uint8')
    result[:,:,3]=np.where(np.isfinite(values),255,0)
    return result

def satellite():
    seasons=[('spring','2024-03-01T00:00:00Z/2024-05-31T23:59:59Z'),('autumn','2024-09-01T00:00:00Z/2024-11-30T23:59:59Z')]
    scenes=[]
    for slug,interval in seasons:
        request={'collections':[COLLECTION],'bbox':list(WGSBOX),'datetime':interval,
                 'query':{'eo:cloud_cover':{'lt':15}},'limit':40}
        response=json.loads(cached(f'stac-c1-{slug}.json',STAC+'/search',request))
        pinned={'spring':'S2B_T17RLN_20240321T161815_L2A','autumn':'S2A_T17RLN_20240922T162015_L2A'}
        candidates=[f for f in response['features'] if f['id']==pinned[slug]]
        if not candidates: raise RuntimeError('No matching Sentinel-2 scene: '+slug)
        accepted=None
        for item in candidates[:4]:
            print('Checking Sentinel-2 '+item['id'],flush=True)
            path=CACHE/f"c1-window-v2-{item['id']}.npz"
            if path.exists():
                arrays=dict(np.load(path))
            else:
                names=['red','green','blue','nir','scl']
                with futures.ThreadPoolExecutor(max_workers=5) as pool:
                    arrays=dict(zip(names,pool.map(lambda n:read_band(item,n,n=='scl'),names)))
                np.savez_compressed(path,**arrays)
            # ESA SCL: exclude no data, saturated/defective, shadow, cloud, cirrus, snow.
            valid=np.isin(arrays['scl'],[4,5,6,7])
            for n in ['red','green','nir']: valid &= np.isfinite(arrays[n])
            if np.nanmedian(arrays['red'])<0:
                raise ValueError('Reflectance metadata failed sanity check: negative median red reflectance')
            fraction=float(valid.mean())
            if fraction>.90:
                accepted=(item,arrays,valid,fraction)
                break
        if not accepted: raise RuntimeError('No sufficiently clear local Sentinel scene for '+slug)
        item,a,valid,fraction=accepted
        with np.errstate(divide='ignore',invalid='ignore'):
            ndvi=(a['nir']-a['red'])/(a['nir']+a['red'])
            ndwi=(a['green']-a['nir'])/(a['green']+a['nir'])
        ndvi[~valid]=np.nan
        ndwi[~valid]=np.nan
        # Preserve physical bounds; reject invalid denominators and out of range values.
        ndvi[(ndvi<-1)|(ndvi>1)]=np.nan
        ndwi[(ndwi<-1)|(ndwi>1)]=np.nan
        Image.fromarray(ramp(ndvi,[(-1,(38,67,83)),(0,(182,167,124)),(.3,(173,189,118)),(.6,(80,130,69)),(1,(19,65,45))])).save(OUT/f'{slug}-ndvi.png')
        Image.fromarray(ramp(ndwi,[(-1,(194,178,144)),(-.3,(124,146,122)),(0,(84,150,163)),(.3,(40,125,168)),(1,(17,52,110))])).save(OUT/f'{slug}-ndwi.png')
        # RGB display stretch is visual only; never used to calculate indices.
        rgb=np.stack([a['red'],a['green'],a['blue']],axis=-1)
        # STAC reflectance is commonly scaled to [0,1]; handle raw DN assets explicitly.
        scale=1 if np.nanmedian(rgb)<2 else .0001
        rgb=np.clip(np.nan_to_num(rgb)*scale/0.25,0,1)**(1/1.4)
        Image.fromarray((rgb*255).astype('uint8')).save(OUT/f'{slug}-rgb.png')
        grid={'width':SIZE[0],'height':SIZE[1],
              'ndvi':[[round(float(v),3) if np.isfinite(v) else None for v in row] for row in ndvi],
              'ndwi':[[round(float(v),3) if np.isfinite(v) else None for v in row] for row in ndwi]}
        (OUT/f'{slug}-grid.json').write_text(json.dumps(grid,separators=(',',':')))
        scene={'id':item['id'],'slug':slug,'datetime':item['properties']['datetime'],
               'cloudCoverScene':item['properties']['eo:cloud_cover'],'validFractionLocal':fraction,
               'medianNDVI':round(float(np.nanmedian(ndvi)),3),'medianNDWI':round(float(np.nanmedian(ndwi)),3),
               'stacUrl':STAC+'/collections/'+COLLECTION+'/items/'+item['id'],
               'assets':{n:item['assets'][n] for n in ['red','green','blue','nir','scl']}}
        scenes.append(scene)
        print(f"Satellite ready: {scene['datetime']}, {fraction:.1%} valid pixels",flush=True)
    (OUT/'satellite.json').write_text(json.dumps({'bbox3857':BBOX,'bbox4326':WGSBOX,'scenes':scenes,
        'method':'EMERGE Textbook 1, Chapter 3, Lesson 3, adapted to individual Sentinel-2 L2A scenes. Reflectance scaling/offset from STAC raster:bands; SCL mask 4/5/6/7; nearest-neighbor reprojection.',
        'ndvi':'(B08-B04)/(B08+B04)','ndwi':'(B03-B08)/(B03+B08)',
        'resolution':'Source bands 10 m; display resampled to 128 x 100. Do not interpret individual trees or water quality.',
        'curriculum':'https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html'},indent=2))
    return scenes

if __name__=='__main__':
    which=sys.argv[1] if len(sys.argv)>1 else 'all'
    outputs={}
    tasks={'lidar':lidar,'aerial':aerial,'satellite':satellite}
    chosen=tasks if which=='all' else {which:tasks[which]}
    with futures.ThreadPoolExecutor(max_workers=3) as pool:
        running={pool.submit(fn):name for name,fn in chosen.items()}
        for future in futures.as_completed(running):
            name=running[future]
            try: outputs[name]=future.result()
            except Exception as error:
                print(f'{name} FAILED: {error}',flush=True)
                raise
    (OUT/'site.json').write_text(json.dumps({'name':'Lake Alice','location':'University of Florida · Gainesville',
        'longitude':LON,'latitude':LAT,'bbox3857':BBOX,'bbox4326':WGSBOX,'width':WIDTH,'height':HEIGHT,
        'preparedAt':dt.datetime.now(dt.timezone.utc).isoformat()},indent=2))
