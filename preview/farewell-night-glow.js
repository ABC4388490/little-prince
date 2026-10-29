import * as THREE from './three-prototype/vendor/three.module.js';
// Transparent atmospheric layer; the existing illustrations and hit targets remain DOM.
export function createNightGlow(scene) {
 const cameraLayer=scene.querySelector('.c03-camera'), bounds=cameraLayer.getBoundingClientRect(), dome=scene.querySelector('.c03-dome').getBoundingClientRect();
 const width=bounds.width,height=bounds.height;
 if(!width || !height) throw new Error('Empty story stage');
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const canvas=renderer.domElement;canvas.className='c03-night-glow';canvas.setAttribute('aria-hidden','true');cameraLayer.append(canvas);
 const scene3d=new THREE.Scene(), camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,20);camera.position.z=10;
 const textureCanvas=document.createElement('canvas');textureCanvas.width=8;textureCanvas.height=256;const ctx=textureCanvas.getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'rgba(25,42,72,.88)');gradient.addColorStop(.55,'rgba(52,70,99,.75)');gradient.addColorStop(1,'rgba(108,128,155,.52)');ctx.fillStyle=gradient;ctx.fillRect(0,0,8,256);
 const skyTexture=new THREE.CanvasTexture(textureCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;const skyMat=new THREE.MeshBasicMaterial({map:skyTexture,transparent:true,depthWrite:false});const sky=new THREE.Mesh(new THREE.PlaneGeometry(width,height),skyMat);scene3d.add(sky);
 const sheenCanvas=document.createElement('canvas');sheenCanvas.width=128;sheenCanvas.height=128;const c=sheenCanvas.getContext('2d'),g=c.createLinearGradient(25,0,92,100);g.addColorStop(0,'rgba(224,238,255,0)');g.addColorStop(.42,'rgba(224,238,255,0)');g.addColorStop(.49,'rgba(224,238,255,.32)');g.addColorStop(.57,'rgba(224,238,255,0)');g.addColorStop(1,'rgba(224,238,255,0)');c.fillStyle=g;c.beginPath();c.ellipse(64,66,34,49,0,0,Math.PI*2);c.fill();const sheenTex=new THREE.CanvasTexture(sheenCanvas);const sheenMat=new THREE.MeshBasicMaterial({map:sheenTex,transparent:true,depthWrite:false});const sheen=new THREE.Mesh(new THREE.PlaneGeometry(dome.width,dome.height),sheenMat);sheen.position.set(dome.left-bounds.left+dome.width/2-width/2,height/2-(dome.top-bounds.top+dome.height/2),1);scene3d.add(sheen);renderer.render(scene3d,camera);
 return {canvas,dispose(){canvas.remove();sky.geometry.dispose();sheen.geometry.dispose();skyMat.dispose();sheenMat.dispose();skyTexture.dispose();sheenTex.dispose();renderer.dispose();}};
}
