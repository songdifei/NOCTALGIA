let planets = [];
let trails = [];
let gravitationalConstant = 1.0;
let isPaused = false;
let isNightMode = false;
let panelWidth = 250;
let planetCount = 3;
let sliderDragging = false;
let scaleSliderDragging = false;
let scaleLevel = 1.0;
let gravitySliderDragging = false;
let showParameters = true;
let customFrameCount = 0;
let lastW = 0, lastH = 0;

// Individual visibility controls
let showPlanet = [];
let showTrail = [];
let connections = []; // 存储所有连接线的数组
let showConnections = false; // 是否显示连接线
let connectionMode = false; // 是否处于连接线模式

// Trail style options
let trailStyles = ['solid', 'dashed', 'dotted', 'wave'];
let currentTrailStyle = 'solid';

// Control positions
let controlPositions = {
  buttons: [],
  planetCheckboxes: [],
  trailCheckboxes: [],
  slider: {},
  scaleSlider: {},
  gravitySlider: {},
  trailStyleButtons: [],
  connectionButton: {}
};

// Font and image variables
let universFont;
let headerImg;
let headerImgNight;

function preload() {
  // Load the font and image
  universFont = loadFont('UniversRegular.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(universFont);
  initializeSystem();
  lastW = windowWidth;
  lastH = windowHeight;
}

function draw() {
  isNightMode ? background(0) : background(255);
  
  if (!isPaused) {
    updateSystem();
    customFrameCount++;
  }
  
  // Apply scale transformation
  push();
  let centerX = panelWidth + (width - panelWidth) / 2;
  let centerY = height / 2;
  translate(centerX, centerY);
  scale(scaleLevel);
  translate(-centerX, -centerY);
  
  if (!connectionMode) {
    drawTrails();
    drawCelestialBodies();
  } else {
    drawAllConnections();
    drawTrails();
    drawCelestialBodies();
  }
  pop();
  
  // Draw parameters outside of scale transformation
  if (showParameters) displayScientificInfo();
  drawControlPanel();
}

function windowResized() {
  // 只有当窗口尺寸确实改了，才执行 resizeCanvas 和 initializeSystem
  if (windowWidth !== lastW || windowHeight !== lastH) {
    lastW = windowWidth;
    lastH = windowHeight;
    resizeCanvas(windowWidth, windowHeight);
  }
}

function initializeSystem() {
  customFrameCount = 0; 
  planets = [];
  trails = [];
  connections = [];
  showPlanet = [];
  showTrail = [];
  
  let centerX = panelWidth + (width - panelWidth) / 2;
  let centerY = height / 2;
  
  // Central star
  planets.push({
    id: 'A',
    x: centerX,
    y: centerY,
    radius: 30,
    color: isNightMode ? color(255) : color(0),
    parentIndex: -1,
    orbitRadius: 0,
    angle: 0,
    angularVelocity: 0,
    mass: 1000
  });
  showPlanet[0] = false;
  showTrail[0] = false;
  trails.push([]);

  let availableWidth = width - panelWidth - 40;
  let scaleFactor = min(
    map(planetCount, 3, 7, 1.0, 0.6),
    (availableWidth / 600) * 0.9
  );
  
  for (let i = 1; i < planetCount; i++) {
    let parent = planets[i-1];
    let orbitRadius = (60 + i * 50) * scaleFactor;
    let grayValue = map(i, 1, 6, 60, 200);
    
    let planetRadius = map(i, 1, 6, 18, 10) * scaleFactor;
    
    planets.push({
      id: String.fromCharCode(65 + i),
      x: 0,
      y: 0,
      radius: planetRadius,
      color: isNightMode ? color(255 - grayValue) : color(grayValue),
      parentIndex: i-1,
      orbitRadius: orbitRadius,
      angle: random(TWO_PI),
      angularVelocity: sqrt(gravitationalConstant * parent.mass / pow(orbitRadius, 3)) * 5,
      mass: 100 / i
    });
    
    showPlanet[i] = false;
    showTrail[i] = (i === 1) ? false : true;
    trails.push([]);
    
    if (random() > 0.5) planets[i].angularVelocity *= -1;
  }
}

function updateSystem() {
  for (let i = 1; i < planets.length; i++) {
    let planet = planets[i];
    let parent = planets[planet.parentIndex];
    
    planet.angle += planet.angularVelocity;
    planet.x = parent.x + planet.orbitRadius * cos(planet.angle);
    planet.y = parent.y + planet.orbitRadius * sin(planet.angle);
    
    if (showTrail[i]) {
      trails[i].push(createVector(planet.x, planet.y));
    }
  }
  
  // 记录所有相邻行星之间的连接线（从第2-3、3-4直到n-1-n）
  if (connectionMode && planets.length > 2) {
    for (let i = 2; i < planets.length; i++) {
      let prevPlanet = planets[i-1];
      let currPlanet = planets[i];
      
      connections.push({
        x1: prevPlanet.x,
        y1: prevPlanet.y,
        x2: currPlanet.x,
        y2: currPlanet.y,
        color: isNightMode ? color(255) : color(0),
        pair: `${i-1}-${i}` // 标记是哪对行星的连接线
      });
    }
  }
}

function drawTrails() {
  noFill();
  isNightMode ? stroke(255) : stroke(0);
  strokeWeight(1);
  
  for (let i = 1; i < trails.length; i++) {
    if (showTrail[i] && trails[i].length > 1) {
      switch (currentTrailStyle) {
        case 'solid':
          drawSolidTrail(trails[i]);
          break;
        case 'dashed':
          drawDashedTrail(trails[i]);
          break;
        case 'dotted':
          drawDottedTrail(trails[i]);
          break;
        case 'wave':
          drawWaveTrail(trails[i]);
          break;
      }
    }
  }
}

function drawSolidTrail(points) {
  beginShape();
  for (let p of points) vertex(p.x, p.y);
  endShape();
}

function drawDashedTrail(points) {
  let dashLength = 15;
  let gapLength = 10;
  let drawing = true;
  let distance = 0;
  
  beginShape();
  for (let i = 1; i < points.length; i++) {
    let prev = points[i-1];
    let curr = points[i];
    let segmentLength = dist(prev.x, prev.y, curr.x, curr.y);
    let segmentAngle = atan2(curr.y - prev.y, curr.x - prev.x);
    
    while (distance < segmentLength) {
      if (drawing) {
        let startX = prev.x + cos(segmentAngle) * distance;
        let startY = prev.y + sin(segmentAngle) * distance;
        let endDistance = min(distance + dashLength, segmentLength);
        let endX = prev.x + cos(segmentAngle) * endDistance;
        let endY = prev.y + sin(segmentAngle) * endDistance;
        
        line(startX, startY, endX, endY);
        distance = endDistance;
      } else {
        distance = min(distance + gapLength, segmentLength);
      }
      drawing = !drawing;
    }
    distance -= segmentLength;
  }
  endShape();
}

function drawDottedTrail(points) {
  let dotSpacing = 5;
  let distance = 0;
  
  for (let i = 1; i < points.length; i++) {
    let prev = points[i-1];
    let curr = points[i];
    let segmentLength = dist(prev.x, prev.y, curr.x, curr.y);
    let segmentAngle = atan2(curr.y - prev.y, curr.x - prev.x);
    
    while (distance < segmentLength) {
      let dotX = prev.x + cos(segmentAngle) * distance;
      let dotY = prev.y + sin(segmentAngle) * distance;
      point(dotX, dotY);
      distance += dotSpacing;
    }
    distance -= segmentLength;
  }
}

function drawWaveTrail(points) {
  const amp = 25;
  const freq = 0.3;

  beginShape();
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    let offsetX = sin(i * freq) * amp;
    let offsetY = cos(i * freq * 1.2) * amp;
    vertex(p.x + offsetX, p.y + offsetY);
  }
  endShape();
}

function drawAllConnections() {
  noFill();
  for (let c of connections) {
    stroke(isNightMode ? color(255) : color(0,150));
    strokeWeight(1);

    // 用一个临时的点数组，直接重用那些 Trail 绘制函数
    let pts = [ createVector(c.x1, c.y1), createVector(c.x2, c.y2) ];

    switch (currentTrailStyle) {
      case 'solid':
        line(c.x1, c.y1, c.x2, c.y2);
        break;
      case 'dashed':
        drawDashedTrail(pts);
        break;
      case 'dotted':
        drawDottedTrail(pts);
        break;
      case 'wave':
        drawWaveTrail(pts);
        break;
    }
  }
}

function drawCelestialBodies() {
  // Draw orbits
  isNightMode ? stroke(100) : stroke(200);
  noFill();
  for (let i = 1; i < planets.length; i++) {
    if (showPlanet[i]) {
      let parent = planets[planets[i].parentIndex];
      ellipse(parent.x, parent.y, planets[i].orbitRadius*2, planets[i].orbitRadius*2);
    }
  }
  
  // Draw planets
  noStroke();
  for (let i = 0; i < planets.length; i++) {
    if (showPlanet[i]) {
      fill(planets[i].color);
      ellipse(planets[i].x, planets[i].y, planets[i].radius, planets[i].radius);
      
      // Label planets
      isNightMode ? fill(0) : fill(255);
      textSize(12);
      textAlign(CENTER, CENTER);
      text(planets[i].id, planets[i].x, planets[i].y);
    }
  }
}

function drawControlPanel() {
  stroke(isNightMode ? 255 : 0);
  strokeWeight(1);
  line(panelWidth,0,panelWidth,height);
  isNightMode ? fill(0) : fill(255);
  noStroke();
  rect(0, 0, panelWidth, height);

  // 重置位置记录
  controlPositions = {
    buttons: [],
    planetCheckboxes: [],
    trailCheckboxes: [],
    slider: {},
    scaleSlider: {},
    gravitySlider: {},
    trailStyleButtons: [],
    connectionButton: {}
  };

  let yPos = 20;
    // 添加描述文字
  textSize(36); 
  textAlign(CENTER, TOP);
  isNightMode ? fill(255) : fill(0);
  text("NOCTALGIA", panelWidth/2-5, yPos);
  yPos = 70; //
  textSize(10);
  textAlign(LEFT, TOP);
  isNightMode ? fill(255) : fill(0);
  text("This tool generates trajectory images based on celestial motion, their forms embodying both order and complexity, reflecting the rational beauty of natural laws and the mystery of the structure of the cosmos.", 
       20, yPos, panelWidth - 40);
  
  // 计算文字高度并定位图片
  let textHeight = textAscent() * 5; // 大约5行文字
  yPos += textHeight + 30;

  // —— 按钮区 —— 
  // —— PLAY/PAUSE —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  let playLabel = isPaused ? "PLAY" : "PAUSE";
  drawButton(20, yPos, playLabel, isPaused);
  yPos += 40;

  // —— NEW PATTERN —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  drawButton(20, yPos, "NEW PATTERN", false);
  yPos += 40;

  // —— DAY/NIGHT —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  let dnLabel = isNightMode ? "DAY" : "NIGHT";
  drawButton(20, yPos, dnLabel, isNightMode);
  yPos += 40;

  // —— HIDE/SHOW PARAMETERS —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  let paramLabel = !showParameters ? "HIDE PARAMETERS" : "SHOW PARAMETERS";
  drawButton(20, yPos, paramLabel, !showParameters);
  yPos += 40;

  // —— TRAIL/CONNECTION MODE —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  let connLabel = connectionMode ? "TRAIL MODE" : "CONNECTION MODE";
  drawButton(20, yPos, connLabel, connectionMode);
  yPos += 40;

  // —— EXPORT IMAGE —— 
  controlPositions.buttons.push({ y: yPos, height: 30 });
  drawButton(20, yPos, "EXPORT IMAGE", false);
  yPos += 50;
  
  
//   // 绘制头部图片
//   if (headerImg) {
//     let imgWidth = panelWidth - 40;
//     let imgHeight = (headerImg.height / headerImg.width) * imgWidth;
//     if (isNightMode){
//       image(headerImgNight, 20, yPos, imgWidth, imgHeight);
//     }else{
//       image(headerImg, 20, yPos, imgWidth, imgHeight);
//     }
    
//     yPos += imgHeight + 5;
//   }

  // —— 缩放 Slider —— 
  isNightMode ? fill(255) : fill(0);
  textSize(12);
  textAlign(LEFT, TOP);
  text("SCALE: " + nf(scaleLevel * 100, 0, 0) + "%", 25, yPos);
  yPos += 20;

  controlPositions.scaleSlider = { y: yPos, height: 18 };
  drawScaleSlider(25, yPos, panelWidth - 50, scaleLevel, 1.0, 0.4);
  yPos += 20;

  // —— 重力 Slider —— 
  noStroke();
  isNightMode ? fill(255) : fill(0);
  text("GRAVITY: " + gravitationalConstant, 25, yPos);
  yPos += 20;

  controlPositions.gravitySlider = { y: yPos, height: 18 };
  drawGravitySlider(25, yPos, panelWidth - 50);
  yPos += 20;

  // —— 行星数量 Slider —— 
  isNightMode ? fill(255) : fill(0);
  noStroke();
  text("PLANET COUNT: " + planetCount, 25, yPos);
  yPos += 20;

  controlPositions.slider = { y: yPos, height: 18 };
  drawSlider(25, yPos, panelWidth - 50, planetCount, 3, 7);
  yPos += 35;

  // —— 轨迹样式 按钮 —— 
  noStroke();
  isNightMode ? fill(255) : fill(0);
  text("TRAIL STYLE", 25, yPos);
  yPos += 20;

  let btnW = (panelWidth-30) / 2;
  for (let i = 0; i < trailStyles.length; i++) {
    let x = 20 + (i % 2) * btnW;
    let yy = yPos + floor(i / 2) * 40;

    controlPositions.trailStyleButtons.push({
      x, y: yy, width: btnW , height: 30, style: trailStyles[i]
    });

    drawButton(
      x, yy,
      trailStyles[i].toUpperCase(),
      currentTrailStyle === trailStyles[i],
      btnW - 10
    );
  }
  yPos += ceil(trailStyles.length / 2) * 35;
  yPos += 20;

  let leftColX = 20;
  let rightColX = panelWidth / 2 + 10;
  let checkboxY = yPos;
  
    // 行星可见性标题
  textSize(12);
  textAlign(LEFT, TOP);
  text("VISIBILITY", leftColX, checkboxY);
  // text("TRAILS", rightColX, checkboxY);
  checkboxY += 20;

  // 绘制两列复选框
  for (let i = 0; i < planets.length; i++) {
    // 左边行星可见性
    controlPositions.planetCheckboxes.push({ y: checkboxY, height: 14 });
    drawCheckbox(leftColX+7, checkboxY, showPlanet[i], "Planet "+ planets[i].id);
    
    // 右边轨迹可见性
    controlPositions.trailCheckboxes.push({ y: checkboxY, height: 14 });
    drawCheckbox(rightColX, checkboxY, showTrail[i], "Trail " + planets[i].id);
    
    checkboxY += 18;
  }
  // —— Bottom attribution text —— 
  // —— Bottom attribution text with auto-wrapping —— 
let attributionText = 
  'Results of the course "Shapes Without Meaning" at Bauhaus-Universität Weimar\n' +
  'Design: Difei Song\n' + 
  'Supervision: Stephanie Specht\n' +
  'Summaery SoSe 2025';

textSize(10);
textAlign(LEFT, TOP);
isNightMode ? fill(255) : fill(0);

let maxWidth = panelWidth - 40;
let attribLineHeight = textAscent() * 1.5 + 10;
let wrappedHeight = attribLineHeight * 4 + 10;
let yOffset = height - wrappedHeight + 30;

text(attributionText, 20, yOffset, maxWidth); // 自动换行


}

function drawGravitySlider(x, y, w) {
  let r = 7; // 半径，直径为 14
  let sliderStart = x + r;
  let sliderEnd = x + w - r;
  let sliderW = sliderEnd - sliderStart;
  stroke(isNightMode ? 255 : 0);  
  strokeWeight(1);
  line(sliderStart, y + 7, sliderEnd, y + 7);
  
  let handleX;
  if (gravitationalConstant === 1) handleX = x+r;
  else if (gravitationalConstant === 10) handleX = x + w/3;
  else if (gravitationalConstant === 100) handleX = x + 2*w/3;
  else if (gravitationalConstant === 1000) handleX = x + w-r;
  
  fill(isNightMode ? 0 : 255);
  ellipse(handleX, y + 7, 14, 14); 
  
  if (gravitySliderDragging) {
    let segment = floor(map(mouseX, x, x + w, 0, 4));
    segment = constrain(segment, 0, 3);
    gravitationalConstant = pow(10, segment);
  }
}

function drawScaleSlider(x, y, w, val, maxVal, minVal) {
  let r = 7; // 滑块半径
  let sliderStart = x + r;
  let sliderEnd = x + w - r;

  // 轨道线
  stroke(isNightMode ? 255 : 0);  
  strokeWeight(1);
  line(sliderStart, y + 7, sliderEnd, y + 7); 

  // 滑块位置映射
  let handleX = map(val, maxVal, minVal, sliderStart, sliderEnd);
  stroke(isNightMode ? 255 : 0);
  strokeWeight(1);
  fill(isNightMode ? 0 : 255);
  ellipse(handleX, y + 7, 14, 14);
  
  if (scaleSliderDragging) {
    let newVal = map(mouseX, sliderStart, sliderEnd, maxVal, minVal);
    scaleLevel = constrain(newVal, minVal, maxVal);
  }
}

function drawButton(x, y, label, isActive, w = panelWidth - 40) {
  stroke(isNightMode ? 255 : 0);
  strokeWeight(1);
  if (isActive) {
    fill(isNightMode ? 100 : 200);
  } else {
    fill(isNightMode ? 0 : 255);
  }
  rect(x, y, w, 30);
  
  isNightMode ? fill(255) : fill(0);
  noStroke();
  textSize(12);
  textAlign(CENTER, CENTER);
  text(label, x + w/2, y + 13.5);
}

function drawSlider(x, y, w, val, minVal, maxVal) {
  let radius = 14;
  let r = radius / 2;
  let sliderX = x + r;
  let sliderW = w - radius;

  stroke(isNightMode ? 200 : 0);
  strokeWeight(1);
  line(sliderX, y + 7, sliderX + sliderW, y + 7);

  let handleX = map(val, minVal, maxVal, sliderX, sliderX + sliderW);

  stroke(isNightMode ? 255 : 0);
  strokeWeight(1);
  fill(isNightMode ? 0 : 255);
  ellipse(handleX, y + 7, radius, radius);

  if (sliderDragging) {
    let newVal = round(map(mouseX, sliderX, sliderX + sliderW, minVal, maxVal));
    planetCount = constrain(newVal, minVal, maxVal);
  }
}

function drawCheckbox(x, y, checked, label) {
  textSize(12); 
  stroke(isNightMode ? 255 : 0);
  strokeWeight(1);
  fill(isNightMode ? 0 : 255);
  ellipse(x + 7, y + 7, 14, 14); 
  
  if (checked) {
    noStroke();
    fill(isNightMode ? 255 : 0);
    ellipse(x + 7, y + 7, 8, 8);
  }
  
  isNightMode ? fill(255) : fill(0);
  noStroke();
  textAlign(LEFT, CENTER);
  text(label, x + 22, y + 7);
}

function displayScientificInfo() {
  push();
  resetMatrix();
  scale(1);

  isNightMode ? fill(255) : fill(0);
  textAlign(LEFT, TOP);
  textSize(8);

  const startX = panelWidth + 20;
  const startY = 20;
  let y = startY;
  const lineHeight = 8;
  const sectionGap = 8;

  text(`FRAME: ${customFrameCount}`, startX, y);
  y += lineHeight + sectionGap;

  text("SYSTEM OVERVIEW:", startX, y);
  y += lineHeight;
  text(`Mode: ${connectionMode ? "Connection" : "Trail"} (${currentTrailStyle})`, startX, y);
  y += lineHeight;
  text(`Scale: ${nf(scaleLevel * 100, 0, 0)}%`, startX, y);
  y += lineHeight;
  text(`Gravity: ${gravitationalConstant}`, startX, y);
  y += lineHeight;
  text(`Planets: ${planetCount}`, startX, y);
  y += sectionGap + lineHeight;

  text("CENTRAL STAR:", startX, y);
  y += lineHeight;
  text(`ID: ${planets[0].id}`, startX, y);
  y += lineHeight;
  text(`Mass: ${planets[0].mass}`, startX, y);
  y += lineHeight;
  text(`Radius: ${planets[0].radius}`, startX, y);
  y += sectionGap + lineHeight;

  text("ORBITAL DYNAMICS:", startX, y);
  y += lineHeight;
  
  let totalAngularMomentum = 0;
  for (let i = 1; i < planets.length; i++) {
    const p = planets[i];
    const velocity = p.angularVelocity * p.orbitRadius;
    totalAngularMomentum += p.mass * velocity * p.orbitRadius;
  }
  text(`Total Angular Momentum: ${nf(totalAngularMomentum, 0, 2)}`, startX, y);
  y += lineHeight;

  let totalEnergy = 0;
  for (let i = 1; i < planets.length; i++) {
    const p = planets[i];
    const parent = planets[p.parentIndex];
    const kinetic = 0.5 * p.mass * pow(p.angularVelocity * p.orbitRadius, 2);
    const potential = -gravitationalConstant * parent.mass * p.mass / p.orbitRadius;
    totalEnergy += kinetic + potential;
  }
  text(`Total Energy: ${nf(totalEnergy, 0, 2)}`, startX, y);
  y += sectionGap + lineHeight;

  text("PLANET DETAILS:", startX, y);
  y += lineHeight;
  
  for (let i = 1; i < planets.length; i++) {
    const p = planets[i];
    const parent = planets[p.parentIndex];
    const orbitalPeriod = TWO_PI / abs(p.angularVelocity);
    const orbitalVelocity = p.angularVelocity * p.orbitRadius;
    
    text(`${p.id}:`, startX, y);
    y += lineHeight;
    text(`  Orbit Radius: ${nf(p.orbitRadius, 0, 1)}`, startX, y);
    y += lineHeight;
    text(`  Angular Velocity: ${nf(p.angularVelocity, 0, 4)} rad/frame`, startX, y);
    y += lineHeight;
    text(`  Orbital Velocity: ${nf(orbitalVelocity, 0, 2)}`, startX, y);
    y += lineHeight;
    text(`  Period: ${nf(orbitalPeriod, 0, 1)} frames`, startX, y);
    y += lineHeight;
    text(`  Mass: ${p.mass}`, startX, y);
    y += lineHeight;
    text(`  Radius: ${p.radius}`, startX, y);
    y += lineHeight;
    text(`  Trail: ${showTrail[i] ? "ON" : "OFF"}`, startX, y);
    y += sectionGap;
  }

  pop();
}

function randomizePattern() {
  customFrameCount = 0;
  connections = [];
  for (let i = 1; i < trails.length; i++) {
    trails[i] = [];
  }

  let maxOrbit = min((width - panelWidth)/2, height/2) - 20;
  for (let i = 1; i < planets.length; i++) {
    let parent = planets[planets[i].parentIndex];
    planets[i].orbitRadius = random(50, maxOrbit);
    planets[i].angle = random(TWO_PI);
    let baseΩ = sqrt(gravitationalConstant * parent.mass / pow(planets[i].orbitRadius, 3)) * 5;
    planets[i].angularVelocity = baseΩ * (random() > 0.5 ? -1 : 1);
  }
}

function mousePressed() {
  if (mouseX < panelWidth) {
    // —— 1) 顶部按钮区 —— 
    for (let i = 0; i < controlPositions.buttons.length; i++) {
      const btn = controlPositions.buttons[i];
      if (mouseY > btn.y && mouseY < btn.y + btn.height) {
        switch (i) {
          case 0: // PLAY/PAUSE
            isPaused = !isPaused;
            return;
          case 1: // NEW PATTERN
            randomizePattern();
            return;
          case 2: // DAY/NIGHT 切换
            const prevSP_dn = [...showPlanet];
            const prevST_dn = [...showTrail];
            isNightMode = !isNightMode;
            initializeSystem();
            showPlanet = prevSP_dn;
            showTrail  = prevST_dn;
            return;
          case 3: // SHOW/HIDE PARAMETERS
            showParameters = !showParameters;
            return;
          case 4: // CONNECTION MODE 切换
            connectionMode = !connectionMode;
            if (connectionMode) {
              connections = [];
              showPlanet = showPlanet.map(() => false);
              showTrail  = showTrail.map(() => false);
            } else {
              for (let j = 1; j < showTrail.length; j++) {
                showTrail[j] = (j !== 1);
                if (showTrail[j]) trails[j] = [];
              }
            }
            return;
          case 5: // EXPORT IMAGE
            exportImage();
            return;
        }
      }
    }

    // —— 2) Sliders 区域 —— 
    let sx = 25, sw = panelWidth - 50;

    // Planet Count Slider
    const ps = controlPositions.slider;
    if (mouseY > ps.y && mouseY < ps.y + ps.height) {
      const prevSP_pc = [...showPlanet];
      const prevST_pc = [...showTrail];
      planetCount = constrain(round(map(mouseX, sx, sx + sw, 3, 7)), 3, 7);
      sliderDragging = true;
      initializeSystem();
      showPlanet = prevSP_pc;
      for (let j = 1; j < showTrail.length; j++) {
        if (j < prevST_pc.length) {
          showTrail[j] = prevST_pc[j];
        } else {
          showTrail[j] = (j !== 1);
        }
        if (showTrail[j]) trails[j] = [];
      }
      return;
    }

    // Scale Slider
    const ss = controlPositions.scaleSlider;
    if (mouseY > ss.y && mouseY < ss.y + ss.height) {
      scaleSliderDragging = true;
      scaleLevel = constrain(map(mouseX, sx, sx + sw, 1.0, 0.5), 0.5, 1.0);
      return;
    }

    // Gravity Slider
    const gs = controlPositions.gravitySlider;
    if (mouseY > gs.y && mouseY < gs.y + gs.height) {
      const prevSP_gr = [...showPlanet];
      const prevST_gr = [...showTrail];
      let rel = constrain((mouseX - sx) / sw, 0, 1);
      let idx = round(rel * 3);
      const levels = [1, 10, 100, 1000];
      gravitationalConstant = levels[idx];
      gravitySliderDragging = true;
      initializeSystem();
      showPlanet = prevSP_gr;
      showTrail  = prevST_gr;
      return;
    }

    // —— 3) Trail Style 按钮 —— 
    for (let btn of controlPositions.trailStyleButtons) {
      if (
        mouseX > btn.x && mouseX < btn.x + btn.width &&
        mouseY > btn.y && mouseY < btn.y + btn.height
      ) {
        currentTrailStyle = btn.style;
        return;
      }
    }

    // —— 4) 星球可见性复选框 —— 
    for (let i = 0; i < controlPositions.planetCheckboxes.length; i++) {
      const cb = controlPositions.planetCheckboxes[i];
      if (
        mouseX > 30 && mouseX < 46 &&
        mouseY > cb.y && mouseY < cb.y + cb.height
      ) {
        showPlanet[i] = !showPlanet[i];
        return;
      }
    }

    // —— 5) 轨迹可见性复选框 —— 
    for (let i = 0; i < controlPositions.trailCheckboxes.length; i++) {
  const cb = controlPositions.trailCheckboxes[i];
  const checkboxX = panelWidth / 2 + 10;  // 右半边起始点
  if (
    mouseX > checkboxX && mouseX < checkboxX + 16 &&  // 16px for 14px circle + margin
    mouseY > cb.y && mouseY < cb.y + cb.height
  ) {
    showTrail[i] = !showTrail[i];
    if (showTrail[i]) trails[i] = [];
    return;
      }
    }
  }
}

function mouseReleased() {
  sliderDragging = false;
  scaleSliderDragging = false;
  gravitySliderDragging = false;
}

function exportImage() {
  let pg = createGraphics(width - panelWidth, height);
  isNightMode ? pg.background(0) : pg.background(255);
  pg.textFont(universFont);

  pg.push();
  let centerX = (width - panelWidth) / 2;
  let centerY = height / 2;
  pg.translate(centerX, centerY);
  pg.scale(scaleLevel);
  pg.translate(-centerX, -centerY);
  
  if (connectionMode) {
    for (let i = 0; i < connections.length; i++) {
      let c = connections[i];
      pg.stroke(c.color);
      pg.strokeWeight(1);
      pg.line(
        c.x1 - panelWidth, c.y1,
        c.x2 - panelWidth, c.y2
      );
    }

    for (let i = 1; i < planets.length; i++) {
      if (!showPlanet[i]) continue;
      let planet = planets[i];
      pg.noStroke();
      pg.fill(planet.color);
      pg.ellipse(
        planet.x - panelWidth, planet.y,
        planet.radius, planet.radius
      );
      pg.textSize(12);
      pg.textAlign(CENTER, CENTER);
      isNightMode ? pg.fill(0) : pg.fill(255);
      pg.text(
        planet.id,
        planet.x - panelWidth,
        planet.y
      );
    }
  } else {
    pg.noFill();
    isNightMode ? pg.stroke(255) : pg.stroke(0);
    pg.strokeWeight(1);

    for (let i = 1; i < trails.length; i++) {
      if (showTrail[i] && trails[i].length > 1) {
        if (currentTrailStyle === 'wave') {
          pg.beginShape();
          for (let p of trails[i]) {
            let waveOffset = sin(p.x * 0.01) * 2;
            pg.vertex(p.x - panelWidth + waveOffset, p.y + waveOffset);
          }
          pg.endShape();
        } else {
          pg.beginShape();
          for (let p of trails[i]) {
            pg.vertex(p.x - panelWidth, p.y);
          }
          pg.endShape();

          if (currentTrailStyle === 'dotted') {
            for (let p of trails[i]) {
              pg.point(p.x - panelWidth, p.y);
            }
          }
        }
      }
    }

    isNightMode ? pg.stroke(100) : pg.stroke(200);
    pg.noFill();
    for (let i = 1; i < planets.length; i++) {
      if (showPlanet[i]) {
        let parent = planets[planets[i].parentIndex];
        pg.ellipse(parent.x - panelWidth, parent.y, planets[i].orbitRadius * 2, planets[i].orbitRadius * 2);
      }
    }

    pg.noStroke();
    for (let i = 0; i < planets.length; i++) {
      if (showPlanet[i]) {
        pg.fill(planets[i].color);
        pg.ellipse(planets[i].x - panelWidth, planets[i].y, planets[i].radius, planets[i].radius);
        isNightMode ? pg.fill(0) : pg.fill(255);
        pg.textSize(12);
        pg.textAlign(CENTER, CENTER);
        pg.text(planets[i].id, planets[i].x - panelWidth, planets[i].y);
      }
    }
  }

  pg.pop();
  
  if (showParameters) {
    isNightMode ? pg.fill(255) : pg.fill(0);
    pg.textAlign(LEFT, TOP);
    pg.textSize(12);

    const startX = 20;
    const startY = 20;
    let y = startY;
    const lineHeight = 12;
    const sectionGap = 12;

    pg.text(`FRAME: ${customFrameCount}`, startX, y);
    y += lineHeight + sectionGap;

    pg.text("SYSTEM OVERVIEW:", startX, y);
    y += lineHeight;
    pg.text(`• Mode: ${connectionMode ? "Connection" : "Trail"} (${currentTrailStyle})`, startX, y);
    y += lineHeight;
    pg.text(`• Scale: ${nf(scaleLevel * 100, 0, 0)}%`, startX, y);
    y += lineHeight;
    pg.text(`• Gravity: ${gravitationalConstant}`, startX, y);
    y += lineHeight;
    pg.text(`• Planets: ${planetCount}`, startX, y);
    y += sectionGap + lineHeight;

    pg.text("CENTRAL STAR:", startX, y);
    y += lineHeight;
    pg.text(`• ID: ${planets[0].id}`, startX, y);
    y += lineHeight;
    pg.text(`• Mass: ${planets[0].mass}`, startX, y);
    y += lineHeight;
    pg.text(`• Radius: ${planets[0].radius}`, startX, y);
    y += sectionGap + lineHeight;

    pg.text("ORBITAL DYNAMICS:", startX, y);
    y += lineHeight;
    
    let totalAngularMomentum = 0;
    for (let i = 1; i < planets.length; i++) {
      const p = planets[i];
      const velocity = p.angularVelocity * p.orbitRadius;
      totalAngularMomentum += p.mass * velocity * p.orbitRadius;
    }
    pg.text(`• Total Angular Momentum: ${nf(totalAngularMomentum, 0, 2)}`, startX, y);
    y += lineHeight;

    let totalEnergy = 0;
    for (let i = 1; i < planets.length; i++) {
      const p = planets[i];
      const parent = planets[p.parentIndex];
      const kinetic = 0.5 * p.mass * pow(p.angularVelocity * p.orbitRadius, 2);
      const potential = -gravitationalConstant * parent.mass * p.mass / p.orbitRadius;
      totalEnergy += kinetic + potential;
    }
    pg.text(`• Total Energy: ${nf(totalEnergy, 0, 2)}`, startX, y);
    y += sectionGap + lineHeight;

    pg.text("PLANET DETAILS:", startX, y);
    y += lineHeight;
    
    for (let i = 1; i < planets.length; i++) {
      const p = planets[i];
      const parent = planets[p.parentIndex];
      const orbitalPeriod = TWO_PI / abs(p.angularVelocity);
      const orbitalVelocity = p.angularVelocity * p.orbitRadius;
      
      pg.text(`${p.id}:`, startX, y);
      y += lineHeight;
      pg.text(`  Orbit Radius: ${nf(p.orbitRadius, 0, 1)}`, startX, y);
      y += lineHeight;
      pg.text(`  Angular Velocity: ${nf(p.angularVelocity, 0, 4)} rad/frame`, startX, y);
      y += lineHeight;
      pg.text(`  Orbital Velocity: ${nf(orbitalVelocity, 0, 2)}`, startX, y);
      y += lineHeight;
      pg.text(`  Period: ${nf(orbitalPeriod, 0, 1)} frames`, startX, y);
      y += lineHeight;
      pg.text(`  Mass: ${p.mass}`, startX, y);
      y += lineHeight;
      pg.text(`  Radius: ${p.radius}`, startX, y);
      y += lineHeight;
      pg.text(`  Parent: ${parent.id}`, startX, y);
      y += lineHeight;
      pg.text(`  Trail: ${showTrail[i] ? "ON" : "OFF"}`, startX, y);
      y += sectionGap;
    }
  }

  save(pg, 'solar_system_' + (connectionMode ? 'connections' : 'trails') + '_' + planetCount + '_planets.png');
}

function keyPressed() {
  if (key === 'n' || key === 'N') initializeSystem();
  else if (key === ' ') isPaused = !isPaused;
  else if (key === 'd' || key === 'D') {
    isNightMode = !isNightMode;
    initializeSystem();
  } else if (key === 'c' || key === 'C') {
    connectionMode = !connectionMode;
    if (connectionMode) {
      connections = [];
    } else {
      for (let i = 1; i < trails.length; i++) {
        if (showTrail[i]) trails[i] = [];
      }
    }
  }
}