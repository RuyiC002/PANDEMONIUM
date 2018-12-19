class Whale{
   constructor(tempX,tempY,tempR) {
    this.x = tempX;
    this.y = tempY;
    this.r = tempR;
}

  show() {
    noStroke();
    fill(255);
    ellipse(this.x, this.y, this.r*2);
  }

   move() {
    this.x = this.x + random(vol*200);
    this.y = this.y + random(vol*200);
  }

    enlarge() {
    this.r = this.r + random(vol*10);
  }
}
