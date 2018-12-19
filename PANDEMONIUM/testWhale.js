var mic;
var vol;

//ocean
var simulator, choppinessDiv;
var volMapped;

var BITS = 3;
var TEXTURE_WIDTH = 256; // points on the texture

var orca;
var texture;
var uniforms;
var bufferUniforms = {};

var modifierObject = new THREE.Object3D();
var referenceGeometry = new THREE.Geometry();
referenceGeometry.vertices = Array(2).fill().map(_ => new THREE.Vector3());

var container, stats;
var whaleCam, scene, renderer;
var splineHelperObjects = [],
  splineOutline;
var splinePointsLength = 4;
var positions = [];
var options;

var bgcolor=0xFAFAFA;
//var newBackground;

//the scale of the boxes
var boxGeometry = new THREE.BoxGeometry(20,20,20);
var transformControl;

var ARC_SEGMENTS = 200;
var splineMesh;

var splines = {};

var params = {
  path: 0,
  flow: true,

  /**/
  uniform: false,
  tension: 0.5,
  centripetal: true,
  chordal: false,

  addPoint: addPoint,
  removePoint: removePoint,

  closed: true,
  play: true,

  scale: 100,

  rotationX: 0,
  rotationY: 0.5,
  rotationZ: 0,

  wireframe: true,
};

init();
animate();

function init() {

  mic = new p5.AudioIn();
  mic.start(); //start to listen to the mic

  container = document.getElementById('container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(bgcolor);


  whaleCam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
  whaleCam.position.set(0, 250, 1000);
  scene.add(whaleCam);


  var planeGeometry = new THREE.PlaneGeometry(2000, 2000);
  planeGeometry.rotateX(-Math.PI / 2);
  var planeMaterial = new THREE.ShadowMaterial({
    opacity: 0.2
  });


  var helper = new THREE.GridHelper(2000, 100);
  helper.position.y = -199;
  helper.material.opacity = 0.25;
  helper.material.transparent = true;
  scene.add(helper);

  // var axes = new THREE.AxesHelper( 1000 );
  // axes.position.set( - 500, - 500, - 500 );
  // scene.add( axes );

  renderer = new THREE.WebGLRenderer({
    antialias: false
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  gui = new dat.GUI();



  //gui.add(params, 'addPoint');

  // gui.add(params, 'removePoint');
  // gui.add(params, 'scale', 0.1, 400).step(0.01).onChange(updateModel);

  // Controls
  var controls = new THREE.OrbitControls(whaleCam, renderer.domElement);

  controls.damping = 0.2;
  controls.addEventListener('change', render);

  controls.addEventListener('start', function() {
    cancelHideTransorm();
  });

  controls.addEventListener('end', function() {
    delayHideTransform();
  });

  transformControl = new THREE.TransformControls(whaleCam, renderer.domElement);
  transformControl.addEventListener('change', render);
  scene.add(transformControl);

  // Hiding transform situation is a little in a mess :()
  transformControl.addEventListener('change', function(e) {
    cancelHideTransorm();
  });
  transformControl.addEventListener('mouseDown', function(e) {
    cancelHideTransorm();
  });

  transformControl.addEventListener('mouseUp', function(e) {
    delayHideTransform();
  });

  transformControl.addEventListener('objectChange', function(e) {
    updateSplineOutline();
  });

  var dragcontrols = new THREE.DragControls(splineHelperObjects, whaleCam, renderer.domElement); //
  dragcontrols.enabled = false;
  dragcontrols.addEventListener('hoveron', function(event) {
    transformControl.attach(event.object);
    cancelHideTransorm();
  });

  dragcontrols.addEventListener('hoveroff', function(event) {
    delayHideTransform();
  });

  var hiding;

  function delayHideTransform() {
    cancelHideTransorm();
    hideTransform();
  }

  function hideTransform() {
    hiding = setTimeout(function() {
      transformControl.detach(transformControl.object);
    }, 2500)
  }

  function cancelHideTransorm() {
    if (hiding) clearTimeout(hiding);
  }
  /*******
   * Curves
   *********/
  for (var i = 0; i < splinePointsLength; i++) {
    addSplineObject(positions[i]);
  }

  positions = [];

  for (var i = 0; i < splinePointsLength; i++) {
    positions.push(splineHelperObjects[i].position);
  }

  var geometry = new THREE.Geometry();

  for (var i = 0; i < ARC_SEGMENTS; i++) {
    geometry.vertices.push(new THREE.Vector3());
  }

  var curve = new THREE.CatmullRomCurve3(positions);
  curve.curveType = 'catmullrom';
  curve.mesh = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({
    color: 0xff0000,
    opacity: 0.35,
    linewidth: 2
  }));

  curve.mesh.castShadow = true;
  splines.uniform = curve;

  curve = new THREE.CatmullRomCurve3(positions, true);
  curve.curveType = 'centripetal';
  curve.mesh = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({
    color: 0x00ff00,
    opacity: 0.35,
    linewidth: 2
  }));
  curve.mesh.castShadow = true;
  curve.closed = true;
  splines.centripetal = curve;

  curve = new THREE.CatmullRomCurve3(positions);
  curve.curveType = 'chordal';
  curve.mesh = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({
    color: 0x0000ff,
    opacity: 0.35,
    linewidth: 2
  }));
  curve.mesh.castShadow = true;
  splines.chordal = curve;

  for (var k in splines) {

    var spline = splines[k];
    scene.add(spline.mesh);

  }
  var controlPoints = [];
  for (var i = 0; i < 5; i++) {
    var angle = i / 5 * Math.PI * 2;
    controlPoints.push(
      // new THREE.Vector3( (Math.random() - 0.5) * 1500, 0,  (Math.random() - 0.5) * 1500 )
      new THREE.Vector3(Math.cos(angle) * 600, Math.random() * 800 - 300, Math.sin(angle) * 600)
    )
  }

  load(controlPoints)

  initPathShader()
  splinePosHelper = makeBox()
  scene.add(splinePosHelper)
}

/****************************/

function updateModel() {
  modifierObject.scale.setScalar(params.scale)
  modifierObject.rotation.x = params.rotationX * Math.PI;
  modifierObject.rotation.y = params.rotationY * Math.PI;
  modifierObject.rotation.z = params.rotationZ * Math.PI;

  orca.matrixAutoUpdate = false
  modifierObject.updateMatrix()
  orca.matrix.copy(modifierObject.matrix);

  moo = referenceGeometry.clone().applyMatrix(modifierObject.matrix)
  console.log(moo);

  // use x-axis aligned
  min = Math.min(...moo.vertices.map(v => v.x))
  len = Math.max(...moo.vertices.map(v => v.x)) - min
  console.log(len, min);

  updateUniform('spineOffset', -min);
  updateUniform('spineLength', len);

  updateSplineOutline()
  customMaterial.wireframe = params.wireframe;
}

function updateUniform(name, v) {
  if (!uniforms) {
    bufferUniforms[name] = v;
    // console.log('buffering uniform value', name);
    return
  }
  uniforms[name].value = v;
}

function updateSplineTexture() {
  if (!texture) return;

  splines.centripetal.arcLengthDivisions = 200;
  splines.centripetal.updateArcLengths()
  splineLen = splines.centripetal.getLength()
  var pathSegment = len / splineLen // should clam max to 1

  // updateUniform('spineOffset', 0);
  updateUniform('pathSegment', pathSegment);

  var splineCurve = splines.centripetal;
  // uniform chordal centripetal
  var points = splineCurve.getSpacedPoints(TEXTURE_WIDTH - 1);
  // getPoints() - unequal arc lengths
  var frenetFrames = splineCurve.computeFrenetFrames(TEXTURE_WIDTH - 1, params.closed);
  // console.log(frenetFrames);

  // console.log('points', points);
  for (var i = 0; i < TEXTURE_WIDTH; i++) {
    var pt = points[i];
    setTextureValue(i, pt.x, pt.y, pt.z, 0);
    pt = frenetFrames.tangents[i];
    setTextureValue(i, pt.x, pt.y, pt.z, 1);
    pt = frenetFrames.normals[i];
    setTextureValue(i, pt.x, pt.y, pt.z, 2);
    pt = frenetFrames.binormals[i];
    setTextureValue(i, pt.x, pt.y, pt.z, 3);
  }
  texture.needsUpdate = true;
}

function makeBox(position) {

  var material = new THREE.MeshLambertMaterial({
    color: Math.random() * 0xffffff
  });
  var object = new THREE.Mesh(boxGeometry, material);

  if (position) {

    object.position.copy(position);

  } else {
    object.position.x = Math.random() * 1000 - 500;
    object.position.y = Math.random() * 600;
    object.position.z = Math.random() * 800 - 400;
  }
  scene.add(object);
  return object;
}

function addSplineObject(position) {
  var object = makeBox(position);
  splineHelperObjects.push(object);
  return object;
}

function addPoint() {
  splinePointsLength++;
  positions.push(addSplineObject().position);
  updateSplineOutline();
  //setInterval(1000);
  //setInterval(addPoint, 500);
  //setTimeout( addPoint, 5000);
}



function removePoint() {

  if (splinePointsLength > 5) {
    console.log("Remove");
    splinePointsLength--;
    positions.pop();
    scene.remove(splineHelperObjects.pop());
    updateSplineOutline();
  } else {
    console.log("you take too much");
  }
}

function updateSplineOutline() {
  for (var k in splines) {
    var spline = splines[k];
    splineMesh = spline.mesh;
    for (var i = 0; i < ARC_SEGMENTS; i++) {
      var p = splineMesh.geometry.vertices[i];
      var t = i / (ARC_SEGMENTS - 1);
      spline.getPoint(t, p);
    }
    splineMesh.geometry.verticesNeedUpdate = true;
  }
  updateSplineTexture();
}

function load(new_positions) {
  while (new_positions.length > positions.length) {
    addPoint();
  }
  while (new_positions.length < positions.length) {
    removePoint();
  }
  for (var i = 0; i < positions.length; i++) {
    positions[i].copy(new_positions[i]);
  }
  updateSplineOutline();
}

// function changeBackground(){
//
//   bgcolor = 0xFF0000;
//
// }

var numberOfAddingPoints =1;
var numberOfRemovingPoints=1;

function animate() {


  vol = mic.getLevel();
  console.log(vol);

//ocean
  //volMapped=map(vol,0.01,0.2,1.5,30);
  //setChoppiness(vol);

  if (vol > 0.1) {
    //addPoint();
    numberOfAddingPoints++;

  } else {
    removePoint();
    // numberOfRemovingPoints++;
    // console.log("removePoint")
  }

  if (numberOfAddingPoints > 3) {
    addPoint();
    numberOfAddingPoints = 0;
    console.log("addPoint");
  }

  // if (numberOfRemovingPoints > 3) {
  //   removePoint();
  //   numberOfRemovingPoints = 0;
  //
  // }


if (splinePointsLength>30){
  BITS=BITS+0.1;
  console.log(BITS);
}else {
  BITS=3;
}


if (splinePointsLength>30) {
  scene.background.r = 225;
  scene.background.g = 0;
  scene.background.b = 0;
  console.log(scene.background)
}else{
  scene.background.r = 255;
  scene.background.g = 255;
  scene.background.b = 255;
}


  requestAnimationFrame(animate);
  render();
  stats.update();
  transformControl.update();

  if (params.play) {
    params.path += 0.005;
    params.path %= 1;
    gui.updateDisplay();
    updateUniform('pathOffset', params.path);
    splinePosHelper.position.copy(
      splines.centripetal.getPointAt(params.path)
    )
  }



}

function render() {
  splines.uniform.mesh.visible = params.uniform;
  splines.centripetal.mesh.visible = params.centripetal;
  splines.chordal.mesh.visible = params.chordal;
  renderer.render(scene, whaleCam);
}
