"""Validate provenance, geometry, index calculations and alignment in the bundled study."""
from pathlib import Path
import json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'data'
lidar=json.loads((OUT/'lidar.json').read_text())
points=np.fromfile(OUT/'lake-alice.bin',dtype='<f4').reshape(-1,4)
assert len(points)==lidar['points']==650000
assert np.isfinite(points).all()
assert np.abs(points[:,0]).max()<=500.01
assert np.abs(points[:,2]).max()<=390.01
assert set(np.unique(points[:,3])).issubset({1,2,6,9,20})
assert (points[:,1].max()-points[:,1].min())>20, 'Scene must have measured vertical structure'
sat=json.loads((OUT/'satellite.json').read_text())
assert len(sat['scenes'])==2
for scene in sat['scenes']:
    assert '/sentinel-2-c1-l2a/' in scene['stacUrl'], 'Use reprocessed collection, not ambiguous legacy offsets'
    source=np.load(ROOT/'data-cache'/f"c1-window-v2-{scene['id']}.npz")
    grid=json.loads((OUT/f"{scene['slug']}-grid.json").read_text())
    assert (grid['width'],grid['height'])==(128,100)
    mask=np.isin(source['scl'],[4,5,6,7])
    for band in ['red','green','nir']:
        mask &= np.isfinite(source[band])
    for key,a,b in [('ndvi','nir','red'),('ndwi','green','nir')]:
        exported=np.array([[np.nan if v is None else v for v in row] for row in grid[key]])
        with np.errstate(invalid='ignore',divide='ignore'):
            expected=(source[a]-source[b])/(source[a]+source[b])
        expected[~mask]=np.nan
        expected[(expected<-1)|(expected>1)]=np.nan
        assert np.array_equal(np.isfinite(expected),np.isfinite(exported)), 'Mask mismatch'
        assert np.nanmax(np.abs(expected-exported))<=.00051, 'Index formula or rounding mismatch'
        assert np.nanmin(exported)>=-1 and np.nanmax(exported)<=1
    # Independently chosen open-water and tree-covered pixels from the aerial footprint.
    def sample(key,x,z): return grid[key][int((z/780+.5)*100)][int((x/1000+.5)*128)]
    water_ndvi=sample('ndvi',170,-80)
    canopy_ndvi=sample('ndvi',305,45)
    water_ndwi=sample('ndwi',170,-80)
    canopy_ndwi=sample('ndwi',305,45)
    assert canopy_ndvi>water_ndvi, 'Unexpected spatial alignment or spectral scaling'
    assert water_ndwi>canopy_ndwi, 'Unexpected spatial alignment or spectral scaling'
    print(scene['slug'],{'waterNDVI':water_ndvi,'canopyNDVI':canopy_ndvi,'waterNDWI':water_ndwi,'canopyNDWI':canopy_ndwi})
print('PASS: point geometry, provenance, quality masks, band ratios, rounding, and land/water alignment.')
