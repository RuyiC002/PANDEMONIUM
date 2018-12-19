var mic;
var vol;
let whales = [];

function setup() {
  //createTheCanvas
  createCanvas(400, 400);
  //create the mic
  mic = new p5.AudioIn();
  mic.start(); //start to listen to the mic
  //create the whale array
  for (let i = 0; i < 15; i++) {
  let x =50+20*i;
  whales[i] = new Whale(x, 20, 4);
  }
}

function draw() {
  changeBackground();
  micGraphic();
  console.log(vol);
  drawWhale();
}

function micGraphic() {
  vol = mic.getLevel();
  stroke(255,0,0);
  strokeWeight(3);
  fill(255,255,255);
  ellipse(100, 50, 200, vol * 1000);
}

//background turn to red when volumn hits a certain point
function changeBackground() {
  if (vol > 0.01) {
    background(255, 0, 0);
  } else background(0);
}

function drawWhale(){
for (let i = 0; i < whales.length; i++) {
  whales[i].show();
  whales[i].move();
  //whales[i].enlarge();
}
}
