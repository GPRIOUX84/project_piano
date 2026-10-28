
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");

const startButton = document.getElementById("start-button");
const backButton = document.getElementById("back-button");

const scoreDisplay = document.getElementById("score");
const comboDisplay = document.getElementById("combo");
const gameMessage = document.getElementById("game-message");

const lanes = [...document.querySelectorAll(".lane")];

const noteTypes = [
  { key: "a", name: "SOL", lane: 0, className: "note-sol" },
  { key: "s", name: "MI", lane: 1, className: "note-mi" },
  { key: "d", name: "DO", lane: 2, className: "note-do" }
];

let score = 0;
let combo = 0;
let gameRunning = false;
let notes = [];
let nextBeatTime = 0; // mélodie//
let melodyIndex = 0;

const melody = [
  0, 1, 2, 1,
  0, 1, 2, 2,
  1, 0, 1, 2
];
let animationId = null;

const NOTE_SPEED = 220; // pixels par seconde
const BEAT_INTERVAL = 650; //récurrence des notes
const HIT_WINDOW = 35; // marge de timing en pixels

function updateScore() {
  scoreDisplay.textContent = String(score).padStart(6, "0");
  comboDisplay.textContent = "x" + combo;
}

function clearNotes() {
  notes.forEach(note => note.element.remove());
  notes = [];
}

function startGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  score = 0;
  combo = 0;
  updateScore();

  clearNotes();
  gameMessage.textContent = "GET READY";
  gameRunning = true;
  nextBeatTime = performance.now() + 500; //démarrage de la partie//
melodyIndex = 0;
gameLoop.lastTime = 0;

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
  clearNotes();
}

startButton.addEventListener("click", startGame);

backButton.addEventListener("click", () => {
  stopGame();
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
});

function spawnNote(laneIndex) {
  const type = noteTypes[laneIndex];
  const element = document.createElement("div");

  element.className = `note ${type.className}`;
  lanes[type.lane].appendChild(element);

  notes.push({
    ...type,
    element,
    y: -30,
    hit: false
  });
}


function gameLoop(timestamp) {
  if (!gameRunning) return;

  const delta = Math.min((timestamp - (gameLoop.lastTime || timestamp)) / 1000, 0.05);
  gameLoop.lastTime = timestamp;

  if (timestamp >= nextBeatTime) {
  spawnNote(melody[melodyIndex]);

  melodyIndex = (melodyIndex + 1) % melody.length;
  nextBeatTime += BEAT_INTERVAL;
}

  const hitLine = lanes[0].clientHeight - 65;

  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];

    note.y += NOTE_SPEED * delta;
    note.element.style.top = `${note.y}px`;

    if (!note.hit && note.y > hitLine + HIT_WINDOW) {
      note.element.remove();
      notes.splice(i, 1);
      combo = 0;
      updateScore();
      gameMessage.textContent = "MISS!";
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}


function handleNoteInput(noteName) {
  if (!gameRunning) return;

  const type = noteTypes.find(note => note.name === noteName);
  if (!type) return;

  const hitLine = lanes[0].clientHeight - 65;

  let closestNote = null;
  let closestDistance = Infinity;

  for (const note of notes) {
    if (note.lane !== type.lane) continue;

    const distance = Math.abs(note.y - hitLine);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestNote = note;
    }
  }

  if (closestNote && closestDistance <= HIT_WINDOW) {
    closestNote.element.remove();
    notes = notes.filter(note => note !== closestNote);

    score += 100;
    combo += 1;
    gameMessage.textContent = "PERFECT " + type.name + "!";
  } else {
    combo = 0;
    gameMessage.textContent = "TRY AGAIN";
  }

  updateScore();

  const lane = lanes[type.lane];
  lane.classList.add("lane-hit");

  setTimeout(() => {
    lane.classList.remove("lane-hit");
  }, 100);
}

// Conserver les commandes clavier
document.addEventListener("keydown", event => {
  if (event.repeat) return;

  const key = event.key.toLowerCase();
  const type = noteTypes.find(note => note.key === key);

  if (type) {
    handleNoteInput(type.name);
  }
});




const connectButton = document.getElementById("connect-controller");
const controllerStatus = document.getElementById("controller-status");
const controllerInput = document.getElementById("controller-input");

let serialPort = null;
let serialReader = null;

connectButton.addEventListener("click", async () => {
  if (!("serial" in navigator)) {
    controllerStatus.textContent = "WEB SERIAL NOT SUPPORTED";
    return;
  }

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });

    controllerStatus.textContent = "CONTROLLER CONNECTED";
    controllerStatus.classList.add("connected");
    connectButton.textContent = "CONTROLLER CONNECTED";
    connectButton.disabled = true;

    readSerial();
  } catch (error) {
    console.error(error);
    controllerStatus.textContent = "CONNECTION FAILED";
  }
});

async function readSerial() {
  const decoder = new TextDecoder();
  let buffer = "";

  serialReader = serialPort.readable.getReader();

  try {
    while (true) {
      const { value, done } = await serialReader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();

      for (const line of lines) {
        const note = line.trim();

        if (["DO", "MI", "SOL"].includes(note)) {
        controllerInput.textContent = "BUTTON: " + note;
        handleNoteInput(note);
        }
      }
    }
  } catch (error) {
    console.error("Serial read error:", error);
  } finally {
    serialReader.releaseLock();
  }
}
