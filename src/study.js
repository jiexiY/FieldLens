export const views = [
  {title:'Whole-site overview',camera:[-400,510,690],target:[20,10,-10],position:[170,4,-80],photo:0,layer:'ndwi',tag:'WATER & REFLECTANCE',heading:'The lake, at different scales.',body:'An archived laser scan gives the landscape its measured shape. Ground photographs reveal details beneath the canopy; satellites measure the light reflected from broader patches.',question:'Does open water stand apart from the surrounding trees?',insight:'NDWI compares green and near-infrared reflectance. It does not measure water quality or depth.'},
  {title:'Canopy & shoreline',camera:[430,200,345],target:[255,18,20],position:[305,22,45],photo:1,layer:'ndvi',tag:'VEGETATION & SCALE',heading:'Where the boundaries blur.',body:'The eastern shore is a transition between land and water. Trees add vertical structure, and an overhead satellite pixel can mix leaves, water, soil, and shade.',question:'What can the canopy hide from an overhead image?',insight:'NDVI compares near-infrared and red reflectance. Higher values commonly indicate more green vegetation, not a count of individual trees.'},
  {title:'At the water’s edge',camera:[-195,68,115],target:[-20,10,-45],position:[-68,7,-15],photo:0,layer:'rgb',tag:'GROUND & CONTEXT',heading:'Closer is a different perspective.',body:'Paths, structures, trees, and water share the western edge. Features that stand out in the scan or a photograph can occupy just a few satellite pixels.',question:'Which details disappear at satellite scale?',insight:'The scan, photographs, and satellite observations have different dates. They are complementary observations, not a synchronized reconstruction.'},
  {title:'Campus meets lake',camera:[-510,255,325],target:[-130,12,50],position:[-240,12,115],photo:2,layer:'ndvi',tag:'LAND COVER & QUESTIONS',heading:'A landscape connected by water.',body:'UF describes Lake Alice as part of an interconnected system of creeks, ponds, wetlands, and campus stormwater. Its built surroundings are part of that story.',question:'Where does the vegetation signal differ across the site?',insight:'Two satellite scenes invite investigation, but cannot establish a long-term trend or explain its cause.'},
];

export const observations = [
  {date:'2018–19',type:'LiDAR',title:'The measured landscape',detail:'USGS surveyed Alachua County between December 2018 and December 2019. The viewer displays a deterministic subset of 650,000 measured points, without vertical exaggeration.',mode:'scene',source:'https://portal.opentopography.org/usgsDataset?dsid=FL_Peninsular_FDEM_Alachua_2018'},
  {date:'11 Nov 2022',type:'Photographs',title:'Beneath the canopy',detail:'Alexander Abair photographed the wooded margin, boardwalk, and sunset. These photographs show ground-level context; they did not generate the 3D scene.',mode:'photos',photo:1,source:'https://commons.wikimedia.org/wiki/File:Lake_Alice_margins.jpg'},
  {date:'26 Jan 2023',type:'Aerial',title:'Color from above',detail:'The NAIP mosaic’s center tile was acquired on this date. Its RGB colors are projected onto the older LiDAR; acquisition dates can vary across the mosaic.',mode:'map',layer:'aerial',source:'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer'},
  {date:'21 Mar 2024',type:'Sentinel-2',title:'A spring observation',detail:'A single Sentinel-2 L2A Collection 1 scene. Red, green, and near-infrared source bands are 10 m; cloud and other invalid classifications are masked.',mode:'map',layer:'ndvi',season:'spring',source:'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T17RLN_20240321T161815_L2A'},
  {date:'22 Sep 2024',type:'Sentinel-2',title:'A second satellite view',detail:'A second dated scene lets you compare the same extent. Differences can reflect multiple factors; these two dates alone do not establish a trend.',mode:'map',layer:'ndvi',season:'autumn',source:'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T17RLN_20240922T162015_L2A'},
  {date:'6 Aug 2026',type:'Photograph',title:'Water at eye level',detail:'Michael Rivera photographed the lake from its grassy edge. Contributor-reported coordinates identify the camera location, not a verified viewing direction.',mode:'photos',photo:0,source:'https://commons.wikimedia.org/wiki/File:Lake_Alice,_University_of_Florida,_Gainesville.jpg'},
];

export function initialState(){return {mode:'scene',view:0,activePhoto:null,lastPhoto:0,locatedPhoto:null,peek:false,panel:'notes',event:0,layer:'ndvi',season:'spring',compare:false,swipe:50,showCameras:true,expanded:false,fly:false,inspected:null};}
export function transition(state, action){
  const next={...state,inspected:null,locatedPhoto:null};
  switch(action.type){
    case 'MODE': return {...next,mode:action.mode,activePhoto:action.mode==='photos'?state.lastPhoto:null,peek:false,fly:false};
    case 'VIEW': return {...next,mode:'scene',view:action.index,activePhoto:null,peek:false,fly:false};
    case 'PHOTO': return {...next,mode:state.mode==='photos'?'photos':'scene',activePhoto:action.index,lastPhoto:action.index,peek:false,fly:false};
    case 'PEEK': return state.activePhoto!==null&&state.mode==='scene'?{...next,peek:!state.peek}:state;
    case 'BACK': return {...next,mode:'scene',activePhoto:null,peek:false,fly:false};
    case 'EVENT': {
      const e=observations[action.index];
      if(!e)return state;
      return {...next,event:action.index,panel:'log',mode:e.mode,view:e.mode==='scene'?0:state.view,activePhoto:e.photo??null,lastPhoto:e.photo??state.lastPhoto,peek:false,fly:false,layer:e.layer??state.layer,season:e.season??state.season,compare:false};
    }
    default:return state;
  }
}
