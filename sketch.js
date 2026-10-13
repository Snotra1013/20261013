// ==========================================================
// p5.js 高一英文單字測驗系統 (sketch.js)
// Google 試算表遠端讀取版
// 每條指令均附帶中文註解
// ==========================================================

// Google 試算表發布的 CSV 連結（請將下方引號內的網址替換成您的 Google 試算表 CSV 連結）
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx3jpfrpKl5tYTr4VrjAtPyM9moWKolE-0sAfsQ8d1HUNQM2R8HTdo5ifEt0ssq5SqdIJAiUlSEcNX/pub?gid=481985299&single=true&output=csv';

let allQuestions = [];      // 從 Google 試算表讀取的所有 15 題題庫
let questions = [];         // 每次隨機抽出的 5 道題目
let table;                  // p5.js 表格物件

// ---------- 配色主題集中管理 ----------
const PALETTE = {
  bg:        [233, 229, 223],    // 暖灰米色背景
  card:      [249, 247, 243],    // 奶油白卡片底色
  cardLine:  [222, 217, 209],    // 卡片邊框色
  ink:       [78, 73, 70],       // 主文字深灰褐色
  muted:     [154, 147, 140],    // 次要文字灰褐色
  track:     [224, 219, 211],    // 進度條軌道色
  accent:    [118, 134, 150],    // 主點綴灰藍色
  accentDk:  [96, 112, 128],     // 點綴色懸停加深
  optBg:     [244, 241, 236],    // 選項按鈕預設底色
  optHover:  [236, 232, 225],    // 選項按鈕懸停底色
  optLine:   [218, 212, 204],    // 選項按鈕預設邊框
  okBg:      [220, 228, 213],    // 答對時的綠色底色
  okLine:    [138, 163, 132],    // 答對時的綠色邊框
  okText:    [66, 88, 62],       // 答對時的綠色文字
  badBg:     [238, 218, 214],    // 答錯時的紅色底色
  badLine:   [190, 134, 128],    // 答錯時的紅色邊框
  badText:   [112, 68, 64],      // 答錯時的紅色文字
  hintBg:    '#caf0f8',          // 答錯時，提示正確答案的亮藍色底色
  hintLine:  [124, 152, 166],    // 提示正確答案的邊框
  hintText:  [58, 80, 92]        // 提示正確答案的文字色
};

// 系統狀態變數
let currentQuestion = 0;    // 當前題目索引 (0 ~ 4)
let score = 0;              // 答對累積題數
let selectedOption = -1;    // 玩家點選的選項 (-1 代表尚未點選)
let isAnswered = false;     // 目前題目是否已經作答
let isCorrect = false;      // 目前題目是否答對
let isLoading = true;       // 是否正在載入遠端題庫

// 響應式 UI 按鈕座標儲存物件
let optionButtons = [];     // 儲存 4 個選項按鈕的座標區域
let nextButton = {};        // 儲存「下一題」按鈕的座標區域
let restartButton = {};     // 儲存「重新開始」按鈕的座標區域

// 預先載入 Google 試算表 CSV 檔案
function preload() {
  table = loadTable(csvUrl, 'header', 'csv', 
    () => { console.log("Google 試算表題庫載入成功"); },
    (err) => { console.error("Google 試算表載入失敗，請檢查網址或發布狀態: ", err); }
  );
}

// 初始化 setup 函式：只執行一次
function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  
  // 設定字型：中文使用 LXGW WenKai Mono TC，英文與數字使用 Bitcount Ink
  textFont('LXGW WenKai Mono TC, Bitcount Ink');

  // 解析 Google 試算表資料轉換成題庫物件陣列
  if (table) {
    for (let r = 0; r < table.getRowCount(); r++) {
      let qText = table.getString(r, 'question');
      let opts = [
        table.getString(r, 'optA'),
        table.getString(r, 'optB'),
        table.getString(r, 'optC'),
        table.getString(r, 'optD')
      ];
      let ans = int(table.getString(r, 'answer'));

      if (qText && qText.trim() !== "") {
        allQuestions.push({
          question: qText,
          options: opts,
          answer: ans
        });
      }
    }
  }

  // 開始遊戲時隨機抽出 5 題
  startNewQuiz();
}

// 隨機抽題並重置測驗
function startNewQuiz() {
  if (allQuestions.length === 0) return;

  // 複製一份題庫並隨機打亂順序 (Fisher-Yates shuffle)
  let shuffled = [...allQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 取前 5 題，並將題目的編號自動重新編排 (1. 2. 3. 4. 5.)
  questions = shuffled.slice(0, 5).map((q, idx) => {
    let cleanQ = q.question.replace(/^\d+\.\s*/, `${idx + 1}. `);
    return {
      question: cleanQ,
      options: q.options,
      answer: q.answer
    };
  });

  currentQuestion = 0;
  score = 0;
  selectedOption = -1;
  isAnswered = false;
  isCorrect = false;
  isLoading = false;
}

// 主繪製迴圈
function draw() {
  background(...PALETTE.bg);
  cursor(ARROW);

  if (isLoading || questions.length === 0) {
    fill(...PALETTE.ink);
    textSize(18);
    text("正在從 Google 試算表載入題庫...", width / 2, height / 2);
    return;
  }

  if (currentQuestion < questions.length) {
    drawQuizScreen();
  } else {
    drawResultScreen();
  }
}

// 繪製卡片底圖與陰影
function drawCard(x, y, w, h, r) {
  push();
  drawingContext.shadowColor = 'rgba(90, 80, 70, 0.12)';
  drawingContext.shadowBlur = 20;
  drawingContext.shadowOffsetY = 6;
  fill(...PALETTE.card);
  stroke(...PALETTE.cardLine);
  strokeWeight(1);
  rect(x, y, w, h, r);
  pop();
}

// 繪製膠囊按鈕
function drawPillButton(btn, label, baseCol, hoverCol) {
  let hover = isMouseOver(btn.x, btn.y, btn.w, btn.h);
  if (hover) cursor(HAND);

  push();
  drawingContext.shadowColor = 'rgba(90, 80, 70, 0.16)';
  drawingContext.shadowBlur = 10;
  drawingContext.shadowOffsetY = 3;
  noStroke();
  fill(...(hover ? hoverCol : baseCol));
  rect(btn.x, btn.y, btn.w, btn.h, btn.h / 2);
  pop();

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(constrain(btn.h * 0.38, 13, 16));
  textStyle(BOLD); 
  text(label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  textStyle(NORMAL); 
}

// 繪製測驗主介面
function drawQuizScreen() {
  let q = questions[currentQuestion];

  let cardW = min(width * 0.92, 620);
  let cardH = min(height * 0.92, 580);
  cardH = max(cardH, 420);
  
  let cardX = (width - cardW) / 2;
  let cardY = (height - cardH) / 2;

  let padX = constrain(cardW * 0.06, 16, 36);
  let innerW = cardW - padX * 2;

  drawCard(cardX, cardY, cardW, cardH, 20);

  // 1. 頂部頁籤與進度條
  let topY = cardY + cardH * 0.06;

  noStroke();
  fill(...PALETTE.muted);
  textSize(constrain(cardW * 0.028, 12, 14));
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  text("高一英文單字測驗 (Google 試算表連線版)", cardX + padX, topY);

  textAlign(RIGHT, CENTER);
  text(`${currentQuestion + 1} / ${questions.length}`, cardX + cardW - padX, topY);

  let barY = topY + 18;
  let progressRatio = (currentQuestion + 1) / questions.length;
  fill(...PALETTE.track);
  rect(cardX + padX, barY, innerW, 4, 2);
  fill(...PALETTE.accent);
  rect(cardX + padX, barY, innerW * progressRatio, 4, 2);

  // 2. 題目文字繪製
  let qY = barY + 22;
  let qH = cardH * 0.16;
  fill(...PALETTE.ink);
  textSize(constrain(cardW * 0.035, 15, 20));
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(q.question, cardX + padX, qY, innerW, qH);
  textStyle(NORMAL);

  // 3. 選項按鈕區域
  optionButtons = [];
  let optStartY = qY + qH + 8;
  let bottomReservedH = cardH * 0.15;
  let availH = (cardY + cardH - bottomReservedH) - optStartY;
  let gap = constrain(availH * 0.05, 6, 12);
  let btnHeight = constrain((availH - gap * 3) / 4, 38, 54);

  for (let i = 0; i < q.options.length; i++) {
    let btnX = cardX + padX;
    let btnY = optStartY + i * (btnHeight + gap);
    let btnW = innerW;

    let bgColor = color(...PALETTE.optBg);
    let strokeColor = color(...PALETTE.optLine);
    let textColor = color(...PALETTE.ink);
    let badgeFill = color(...PALETTE.track);
    let badgeText = color(...PALETTE.muted);
    let offsetY = 0;

    if (isMouseOver(btnX, btnY, btnW, btnHeight) && !isAnswered) {
      cursor(HAND);
      bgColor = color(...PALETTE.optHover);
      strokeColor = color(...PALETTE.accent);
      badgeFill = color(...PALETTE.accent);
      badgeText = color(255);
    }

    if (isAnswered) {
      if (i === q.answer) {
        if (!isCorrect) {
          bgColor = color(PALETTE.hintBg);
          strokeColor = color(...PALETTE.hintLine);
          textColor = color(...PALETTE.hintText);
          badgeFill = color(...PALETTE.hintLine);
          badgeText = color(255);
          offsetY = sin(frameCount * 0.18) * 6;
        } else {
          bgColor = color(...PALETTE.okBg);
          strokeColor = color(...PALETTE.okLine);
          textColor = color(...PALETTE.okText);
          badgeFill = color(...PALETTE.okLine);
          badgeText = color(255);
        }
      } else if (i === selectedOption && !isCorrect) {
        bgColor = color(...PALETTE.badBg);
        strokeColor = color(...PALETTE.badLine);
        textColor = color(...PALETTE.badText);
        badgeFill = color(...PALETTE.badLine);
        badgeText = color(255);
      }
    }

    optionButtons.push({ x: btnX, y: btnY, w: btnW, h: btnHeight, index: i });

    push();
    translate(0, offsetY);

    fill(bgColor);
    stroke(strokeColor);
    strokeWeight(1.2);
    rect(btnX, btnY, btnW, btnHeight, 10);

    // 圓形字母徽章
    let badgeR = constrain(btnHeight - 16, 22, 30);
    let badgeCX = btnX + 12 + badgeR / 2;
    let badgeCY = btnY + btnHeight / 2;
    noStroke();
    fill(badgeFill);
    ellipse(badgeCX, badgeCY, badgeR, badgeR);

    fill(badgeText);
    textAlign(CENTER, CENTER);
    textSize(constrain(badgeR * 0.48, 11, 14));
    textStyle(BOLD);
    text(q.options[i].charAt(0), badgeCX, badgeCY + 1);
    textStyle(NORMAL);

    // 選項文字
    fill(textColor);
    textAlign(LEFT, CENTER);
    textSize(constrain(cardW * 0.026, 13, 15));
    text(q.options[i].substring(3), badgeCX + badgeR / 2 + 10, btnY + btnHeight / 2 + 1);
    pop();
  }
  textAlign(CENTER, CENTER);

  // 4. 下一題按鈕
  if (isAnswered) {
    let nextW = constrain(cardW * 0.28, 120, 160);
    let nextH = constrain(cardH * 0.08, 36, 44);
    
    nextButton = {
      x: cardX + cardW - padX - nextW,
      y: cardY + cardH - (cardH * 0.04) - nextH,
      w: nextW,
      h: nextH
    };
    
    let label = (currentQuestion === questions.length - 1) ? "查看結果  →" : "下一題  →";
    drawPillButton(nextButton, label, PALETTE.accent, PALETTE.accentDk);
  }
}

// 繪製結算畫面
function drawResultScreen() {
  let cardW = min(width * 0.9, 450);
  let cardH = min(height * 0.85, 420);
  cardH = max(cardH, 360);

  let cardX = (width - cardW) / 2;
  let cardY = (height - cardH) / 2;

  drawCard(cardX, cardY, cardW, cardH, 20);

  noStroke();
  fill(...PALETTE.muted);
  textSize(constrain(cardW * 0.03, 12, 14));
  textAlign(CENTER, CENTER);
  text("高一英文單字測驗", width / 2, cardY + cardH * 0.1);

  fill(...PALETTE.ink);
  textSize(constrain(cardW * 0.06, 20, 26));
  textStyle(BOLD);
  text("測驗完成！", width / 2, cardY + cardH * 0.2);

  // 得分圓環
  let ringX = width / 2;
  let ringY = cardY + cardH * 0.48;
  let ringD = constrain(cardH * 0.28, 80, 110);

  noFill();
  strokeWeight(8);
  stroke(...PALETTE.track);
  ellipse(ringX, ringY, ringD, ringD);

  if (score > 0) {
    stroke(...PALETTE.accent);
    strokeCap(ROUND);
    arc(ringX, ringY, ringD, ringD, -HALF_PI, -HALF_PI + TWO_PI * (score / questions.length));
    strokeCap(SQUARE);
  }

  noStroke();
  fill(...PALETTE.ink);
  textSize(constrain(ringD * 0.28, 22, 32));
  textStyle(BOLD);
  text(`${score} / ${questions.length}`, ringX, ringY + 1);
  textStyle(NORMAL);

  let feedback = "";
  if (score === 5) feedback = "太厲害了！英文單字量非常紮實！";
  else if (score >= 3) feedback = "表現不錯！繼續保持學習的習慣！";
  else feedback = "加油！多複習高一常見單字會更進步！";

  fill(...PALETTE.muted);
  textSize(constrain(cardW * 0.035, 13, 15));
  text(feedback, cardX + 20, cardY + cardH * 0.72, cardW - 40, 30);

  let btnW = constrain(cardW * 0.45, 150, 190);
  let btnH = constrain(cardH * 0.11, 40, 48);
  restartButton = {
    x: width / 2 - btnW / 2,
    y: cardY + cardH - (cardH * 0.08) - btnH,
    w: btnW,
    h: btnH
  };
  
  drawPillButton(restartButton, "↻  再次挑戰 (重新抽題)", PALETTE.accent, PALETTE.accentDk);
}

// 輔助函式：判斷滑鼠座標
function isMouseOver(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

// 滑鼠點擊觸發事件
function mousePressed() {
  if (currentQuestion < questions.length) {
    if (!isAnswered) {
      for (let btn of optionButtons) {
        if (isMouseOver(btn.x, btn.y, btn.w, btn.h)) {
          selectedOption = btn.index;
          isAnswered = true;

          if (selectedOption === questions[currentQuestion].answer) {
            isCorrect = true;
            score++;
          } else {
            isCorrect = false;
          }
          break;
        }
      }
    } else {
      if (isMouseOver(nextButton.x, nextButton.y, nextButton.w, nextButton.h)) {
        currentQuestion++;
        isAnswered = false;
        selectedOption = -1;
        isCorrect = false;
      }
    }
  } else {
    if (isMouseOver(restartButton.x, restartButton.y, restartButton.w, restartButton.h)) {
      startNewQuiz(); // 點擊後重新隨機抽 5 題
    }
  }
}

// 視窗縮放事件
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}