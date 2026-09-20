import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { photoMapPosition } from './photo-location.js';

export class Landscape {
  constructor(host,{views,photos,markers,onInteract,isVisible}) {
    Object.assign(this,{host,views,photos,markers,onInteract,isVisible});
    this.fly=false;this.keys=new Set();this.animation=null;this.dirty=true;this.heightColor=false;this.lastHeight=false;this.lastTime=performance.now();
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor('#14222b');this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(44,1,1,5000);this.camera.position.set(...views[0].camera);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(...views[0].target);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.minDistance=20;this.controls.maxDistance=1550;this.controls.maxPolarAngle=Math.PI*.49;
    this.controls.addEventListener('start',()=>{this.animation=null;onInteract();});this.controls.addEventListener('change',()=>this.dirty=true);
    this.photoVectors=photos.map(p=>{const q=photoMapPosition(p);return new THREE.Vector3((q.left/100-.5)*1000,15,(q.top/100-.5)*780);});
    this.viewVectors=views.map(v=>new THREE.Vector3(...v.position));
    this.resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(this.material)this.material.uniforms.uViewport.value=height*this.renderer.getPixelRatio();this.dirty=true;};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.resize();
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{host.focus({preventScroll:true});if(!this.fly)return;this.animation=null;onInteract();this.drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!this.fly||!this.drag)return;const rotation=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');rotation.y-=(e.clientX-this.drag.x)*.004;rotation.x=THREE.MathUtils.clamp(rotation.x-(e.clientY-this.drag.y)*.004,-1.48,1.48);this.camera.quaternion.setFromEuler(rotation);this.controls.target.copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(60));this.drag.x=e.clientX;this.drag.y=e.clientY;this.dirty=true;});
    const end=()=>this.drag=null;canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('dblclick',e=>{if(this.fly||!this.cloud)return;const rect=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.params.Points.threshold=2;ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),this.camera);const hit=ray.intersectObject(this.cloud)[0];if(hit){onInteract();this.animation=null;this.controls.target.copy(hit.point);this.dirty=true;}});
    host.addEventListener('keydown',e=>{if(!this.fly||e.ctrlKey||e.metaKey||e.altKey||!['w','a','s','d','q','e','shift'].includes(e.key.toLowerCase()))return;e.preventDefault();this.keys.add(e.key.toLowerCase());onInteract();});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>this.keys.clear());host.addEventListener('blur',()=>this.keys.clear());
  }
  async load(buffer,aerialUrl){
    const values=new Float32Array(buffer);const texture=await new THREE.TextureLoader().loadAsync(aerialUrl);texture.colorSpace=THREE.SRGBColorSpace;
    const interleaved=new THREE.InterleavedBuffer(values,4);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(interleaved,3,0));geometry.computeBoundingSphere();
    this.material=new THREE.ShaderMaterial({uniforms:{uMap:{value:texture},uHeight:{value:0},uViewport:{value:Math.max(1,this.host.clientHeight)*this.renderer.getPixelRatio()}},vertexShader:`varying vec2 vUv;varying float vHeight;varying float vDepth;uniform float uViewport;void main(){vUv=vec2(position.x/1000.0+0.5,0.5-position.z/780.0);vHeight=position.y;vec4 mv=modelViewMatrix*vec4(position,1.0);vDepth=-mv.z;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(1.7*uViewport/(0.81*max(-mv.z,1.0)),1.1,16.0);}`,fragmentShader:`uniform sampler2D uMap;uniform float uHeight;varying vec2 vUv;varying float vHeight;varying float vDepth;void main(){vec2 p=gl_PointCoord-0.5;if(dot(p,p)>0.25)discard;vec3 natural=texture2D(uMap,vUv).rgb*(0.87+0.2*smoothstep(0.0,28.0,vHeight));vec3 elev=mix(vec3(0.13,0.3,0.32),vec3(0.90,0.77,0.48),clamp(vHeight/35.0,0.0,1.0));vec3 color=mix(natural,elev,uHeight);float fog=1.0-exp(-0.00000004*vDepth*vDepth);gl_FragColor=vec4(mix(color,vec3(0.03,0.045,0.06),fog),1.0);
#include <colorspace_fragment>
}`});
    this.cloud=new THREE.Points(geometry,this.material);this.scene.add(this.cloud);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(1000,780),new THREE.MeshBasicMaterial({map:texture,color:'#bcc6ba',side:THREE.DoubleSide}));plane.rotation.x=-Math.PI/2;plane.position.y=-1.25;this.scene.add(plane);
    // Anchor each photographic camera marker to the nearest measured ground return.
    for(const point of this.photoVectors){let nearest=Infinity,height=0;for(let i=0;i<values.length;i+=4){if(values[i+3]!==2)continue;const distance=(values[i]-point.x)**2+(values[i+2]-point.z)**2;if(distance<nearest){nearest=distance;height=values[i+1];}}point.y=height+4;}
    this.controls.update();this.dirty=true;this.frame();
  }
  pose(){return {camera:this.camera.position.toArray(),target:this.controls.target.toArray()};}
  setFly(enabled){this.fly=enabled;this.controls.enabled=!enabled;this.keys.clear();if(enabled){this.animation=null;this.host.focus({preventScroll:true});}this.dirty=true;}
  moveTo(view,instant=false){this.setFly(false);if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){this.camera.position.set(...view.camera);this.controls.target.set(...view.target);this.animation=null;this.dirty=true;return;}this.animation={start:performance.now(),from:this.camera.position.clone(),targetFrom:this.controls.target.clone(),to:new THREE.Vector3(...view.camera),targetTo:new THREE.Vector3(...view.target)};}
  thumbnails(){
    const pose=this.pose();const size=this.renderer.getSize(new THREE.Vector2());const pixelRatio=this.renderer.getPixelRatio();this.renderer.setPixelRatio(1);this.renderer.setSize(320,180,false);this.camera.aspect=16/9;this.camera.updateProjectionMatrix();this.material.uniforms.uViewport.value=180;
    const result=this.views.map(v=>{this.camera.position.set(...v.camera);this.camera.lookAt(new THREE.Vector3(...v.target));this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/jpeg',.72);});
    this.renderer.setPixelRatio(pixelRatio);this.renderer.setSize(size.x,size.y);this.moveTo(pose,true);this.controls.update();this.resize();return result;
  }
  projectPins(){
    const project=(vector,button)=>{if(!button)return;const point=vector.clone().project(this.camera);const visible=point.z>-1&&point.z<1&&Math.abs(point.x)<.98&&Math.abs(point.y)<.88;button.style.visibility=visible?'visible':'hidden';if(visible)button.style.transform=`translate(${(point.x*.5+.5)*this.host.clientWidth}px,${(-point.y*.5+.5)*this.host.clientHeight}px) translate(-50%,-50%)`;};
    this.viewVectors.forEach((p,i)=>project(p,this.markers.views[i]));this.photoVectors.forEach((p,i)=>project(p,this.markers.photos[i]));
  }
  frame=()=>{
    requestAnimationFrame(this.frame);const now=performance.now();const delta=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
    if(document.hidden||!this.isVisible())return;
    if(this.animation){const a=this.animation;const raw=Math.min(1,(now-a.start)/1250);const t=raw*raw*(3-2*raw);this.camera.position.lerpVectors(a.from,a.to,t);this.controls.target.lerpVectors(a.targetFrom,a.targetTo,t);if(raw===1)this.animation=null;this.dirty=true;}
    if(this.fly&&this.keys.size){const forward=this.camera.getWorldDirection(new THREE.Vector3());const right=new THREE.Vector3().crossVectors(forward,this.camera.up).normalize();const shift=new THREE.Vector3();if(this.keys.has('w'))shift.add(forward);if(this.keys.has('s'))shift.sub(forward);if(this.keys.has('d'))shift.add(right);if(this.keys.has('a'))shift.sub(right);if(this.keys.has('e'))shift.y+=1;if(this.keys.has('q'))shift.y-=1;shift.normalize().multiplyScalar(delta*80*(this.keys.has('shift')?3:1));this.camera.position.add(shift);this.controls.target.add(shift);this.dirty=true;}
    if(!this.fly)this.controls.update();
    if(this.lastHeight!==this.heightColor){this.lastHeight=this.heightColor;this.dirty=true;}
    if(!this.dirty)return;this.dirty=false;this.material.uniforms.uHeight.value=this.heightColor?1:0;this.renderer.render(this.scene,this.camera);this.projectPins();
  }
}
