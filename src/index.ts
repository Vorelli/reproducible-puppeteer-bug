import { PuppeteerLaunchOptions } from "puppeteer";
import puppeteer from "puppeteer-extra";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Socket } from "net";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { writeFileSync } from "fs";
import { inspect } from "node:util";
import PlaySound from "play-sound";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const extensionPath = path.resolve(__dirname, "./extensions/devtoolsSimple");

let args = [
  `--window-size=1366,983`,
  `--ignore-certificate-errors`,
  `--allow-insecure-localhost`,
  `--disable-dev-shm-usage`,
  `--no-first-run`,
  `--mute-audio`,
  `--disable-gpu`,
  `--no-sandbox`,
  "--disable-web-security",
  "--disable-features=site-per-process",
  "--disable-extensions-except=" + extensionPath,
  "--load-extension=" + extensionPath,
  //"--enable-logging=stderr",
  //"--v=1"
];

const launchOptions = {
  headless: false, //'new',
  args,
  defaultViewport: { width: 1366, height: 983 },
  executablePath:
    process.env.CONTAINER !== undefined
      ? "/usr/bin/google-chrome-stable"
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ignoreDefaultArgs: ["--enable-automation"],
  slowMo: 250,
  timeout: 90000,
  devtools: true,
  //dumpio: true
} as PuppeteerLaunchOptions;

let sockets: Socket[] = [];
let status: Record<string, number> = {};
const app = express();
const start = new Date();
let lastCollection = new Date(start.getTime() - 71_000);
let lastStatusLog = start;
app.use(express.json({ limit: "1gb" }));
let command = "NOP";
app.get("/command", (_req, res) => {
  status[command] = (status[command] || 0) + 1;
  return res.send(command);
});
app.post("/network", (req, res) => {
  const network = req.body;
  const networkJSON = JSON.stringify(network);
  console.log("received network log from HAR extension");
  writeFileSync(path.resolve(__dirname, "../network.json"), networkJSON);
  lastCollection = new Date();
  res.sendStatus(200);
  if (command === "NETWORK") command = "NOP";
});
app.put("/ack", (req, res) => {
  if (req.body === command) {
    command = "NOP";
  }
});
setInterval(() => {
  if (new Date().getTime() - lastStatusLog.getTime() > 10_000) {
    console.log("status: ", JSON.stringify(status));
    status = {};
    lastStatusLog = new Date();
  }
});
const server = app.listen(1234, "127.0.0.1");
server.on("connection", (socket) => {
  sockets.push(socket);
});
server.on("close", (closingSocket: Socket) => {
  sockets = sockets.filter((socket) => socket !== closingSocket);
});

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch(launchOptions);
try {
  const pages = await browser.pages();
  const page = pages.length ? pages[0] : await browser.newPage();
  await page.goto("https://www.lufthansa.com/de/en/homepage");
  console.log("Finished 'going to' lufthansa homepage");
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  await page.evaluate(
    `document.querySelectorAll('button[id="cm-acceptAll"]')[0]?.click()`,
  );
  console.log("Finished 'clicking on' the 'accept all cookies' button");
  await waitAndCollectHar(8_000);
  await page.evaluate(`document.querySelectorAll('button[aria-label="open menu"]')[0].click();
setTimeout(function() { 
document.querySelectorAll('li[class="sel-item"]')[0].click();
}, 1500);`);
  console.log("Finished 'opening' the 'travel' menu");
  await waitAndCollectHar(8_000);
  await page.evaluate(`var input = document.querySelectorAll('input[placeholder="From"]')[0]; 
var lastValue = input.value; 
input.value = 'London'; 
var event = new Event('input', { bubbles: true }); 
event.simulated = true; 
var tracker = input._valueTracker; 
if (tracker) { 
	tracker.setValue(lastValue); 
} 
input.dispatchEvent(event);
input.dispatchEvent(new Event ('focus',{bubbles:true}));
input.dispatchEvent(new Event ('click',{bubbles:true}));
input.dispatchEvent(new Event ('mouseup',{bubbles:true}));
setTimeout(function() { 
document.querySelectorAll('li[class="sel-item"]')[0].click();
}, 2000);
`);
  await waitAndCollectHar(8_000);
  console.log("Finished 'setting' the 'from' destination");
  await page.evaluate(`
var input = document.querySelectorAll('input[placeholder="To"]')[0]; 
var lastValue = input.value; 
input.value = 'Paris'; 
var event = new Event('input', { bubbles: true }); 
event.simulated = true; 
var tracker = input._valueTracker; 
if (tracker) { 
	tracker.setValue(lastValue); 
} 
input.dispatchEvent(event);
input.dispatchEvent(new Event ('focus',{bubbles:true}));
input.dispatchEvent(new Event ('click',{bubbles:true}));
input.dispatchEvent(new Event ('mouseup',{bubbles:true}));

setTimeout(function() { 
document.querySelectorAll('li[class="sel-item"]')[0].click();
}, 2000);

`);
  await waitAndCollectHar(8_000);
  console.log("Finished 'setting' the 'to' destination");
  await page.evaluate(
    `document.querySelectorAll('input[name="flightQuery.flightSegments[0].travelDatetime"]')[0].click();`,
  );
  await waitAndCollectHar(5000);
  console.log("Finished 'clicking' the 'travel date time' modal button");
  await page.evaluate(`
document.querySelectorAll('td[class*="CalendarDay"][aria-disabled="false"]')[1].click();
setTimeout(function() { 
document.querySelectorAll('td[class*="CalendarDay"][aria-disabled="false"]')[1]?.click();
}, 3500);

`);
  await waitAndCollectHar(8_000);
  console.log("Finished 'setting' the the travel dates");
  await page.evaluate(`
document.querySelectorAll('button[aria-label="Continue"]')[0].click();

`);
  await waitAndCollectHar(5_000);
  console.log("Preparing to go next");

  await page.evaluate(`
document.querySelectorAll('button[type="submit"]')[0].click();

`);
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  console.log("Continuing to fare type selection");

  await page.evaluate(`
document.querySelectorAll('button[data-fare-family-group="eco"]')[0].click();

`);
  await waitAndCollectHar(8_000);
  console.log("Selected eco fare type");
  await page.evaluate(`
document.querySelectorAll('button[id*="selectFare-"]')[0].click();

`);
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  console.log("Finished fare selection");

  await page.evaluate(`
document.querySelectorAll('button[class*="next-step-button"]')[0].click();

`);
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  console.log("On billing information");
  await page.evaluate(`
document.querySelectorAll('div[class*="mat-select-trigger"]')[0].click();
setTimeout(function() { 
document.querySelectorAll('span[aria-label="Mr."]')[0].click();
}, 1500);

var el = document.querySelectorAll('input[formcontrolname="firstName"]')[0];
el.value = 'Test';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[formcontrolname="lastName"]')[0];
el.value = 'LHG';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var rand = Math.floor((Math.random() * 99999) + 1);
rand = 'test' + '_' + rand + '@test.com';
var el = document.querySelectorAll('input[placeholder*="email address"]')[0];
el.value = rand;
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

setTimeout(function() { 
//document.querySelectorAll('input[aria-describedby*="countryCodes"]')[0].click();
var el = document.querySelectorAll('input[aria-describedby*="countryCodes"]')[0];
el.dispatchEvent(new Event ('blur',{bubbles:true}));
el.value = '+49';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusin',{bubbles:true}));
el.dispatchEvent(new Event ('click',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('keydown',{bubbles:true}));
}, 2500);
setTimeout(function() { 
//document.querySelectorAll('mat-option[id="mat-option-410"]')[0].click();
document.querySelectorAll('mat-option[id*="mat-option-"]')[82].click();
$("span:contains('Germany (+49)')")[1].click();
$("span:contains('Germany (+49)')")[0].click();
}, 4500);

setTimeout(function() { 
var rand = Math.floor((Math.random() * 999999) + 1);
rand = '7700' + rand;
var el = document.querySelectorAll('input[placeholder*="mobile phone"]')[0];
el.value = rand;
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));
}, 5500);
`);
  await waitAndCollectHar(8_000);
  console.log("Finished entering billing information. Going next");

  await page.evaluate(`
document.querySelectorAll('button[class*="nextBtn"]')[0].click();`);
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  console.log("Finished going next. Clicking next step button");
  await page.evaluate(`
document.querySelectorAll('button[class*="next-step-button"]')[0].click();

`);
  try {
    await waitAndCollectHar(8_000);
    await page.waitForNetworkIdle({ timeout: 10_000, idleTime: 2_000 });
  } catch (err) { }
  console.log("On next step");

  // why did this fail
  await page.evaluate(`
document.querySelectorAll('input[id="radio_1"]')[0].click();

`);
  await waitAndCollectHar(1_000);
  await page.evaluate(`
document.querySelectorAll('div[class*="mdc-select__anchor"]')[0].click();
setTimeout(function() { 
document.querySelectorAll('li[data-value="CA"]')[0].click();
}, 1500);
setTimeout(function() { 
document.querySelectorAll('div[class*="mdc-select__anchor"]')[0].dispatchEvent(new Event ('focus',{bubbles:true}));
document.querySelectorAll('div[class*="mdc-select__anchor"]')[0].dispatchEvent(new Event ('keydown',{bubbles:true}));
document.querySelectorAll('div[class*="mdc-select__anchor"]')[0].dispatchEvent(new Event ('blur',{bubbles:true}));
}, 2500);

`);
  await waitAndCollectHar(8_000);
  console.log("Finished entering some information");

  await page.evaluate(`
var el = document.querySelectorAll('input[aria-labelledby="number-label"]')[0];
el.value = '5200000000001005';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[id="cardholdername__id"]')[0];
el.value = 'Test Booking';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[aria-labelledby="expirydate-month-label"]')[0];
el.value = '09';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[aria-labelledby="expirydate-year-label"]')[0];
el.value = '30';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[aria-labelledby="cvv-label"]')[0];
el.value = '123';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

`);
  await waitAndCollectHar(8_000);
  console.log("Finished entering credit card information");

  await page.evaluate(`
var el = document.querySelectorAll('input[aria-labelledby="street-label"]')[0];
el.value = 'Test Address';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[aria-labelledby="zip-label"]')[0];
el.value = '60549';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

var el = document.querySelectorAll('input[aria-labelledby="city-label"]')[0];
el.value = 'Frankfurt';
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));

document.querySelectorAll('div[aria-labelledby="country-outlined-select-label"]')[0].click();
setTimeout(function() { 
document.querySelectorAll('li[data-value="DE"]')[0].click();
}, 3500);
`);
  await waitAndCollectHar(8_000);
  console.log("Finished entering address information");

  await page.evaluate(`
var el = document.querySelectorAll('input[id="terms-checkbox"]')[0];
el.dispatchEvent(new Event ('focus',{bubbles:true}));
el.dispatchEvent(new Event ('focusout',{bubbles:true}));
el.dispatchEvent(new Event ('input',{bubbles:true}));
el.dispatchEvent(new Event ('change',{bubbles:true}));
el.dispatchEvent(new Event ('pinterdown',{bubbles:true}));
el.dispatchEvent(new Event ('keydown',{bubbles:true}));
el.dispatchEvent(new Event ('mousedown',{bubbles:true}));
el.dispatchEvent(new Event ('touchstart',{bubbles:true}));
el.dispatchEvent(new Event ('blur',{bubbles:true}));
el.click();
`);
  console.log("Finished checking box.");
  tryToCollectHar();
} catch (err) {
  console.error("Caught error:", err);
} finally {
  const audioPath = path.resolve(__dirname, "../chime.mp3");
  console.log("path:", audioPath);
  const a = PlaySound({ player: "afplay" });
  a.play(audioPath);
  const wait = new Promise<void>((res) => setTimeout(() => res(), 1_500));
  console.log("Closing browser. Either finished or caught an error.");
  await close(wait);
}

process.on("uncaughtException", (err) => {
  console.error("uncaught:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

function close(waitFor: Promise<any> = Promise.resolve()) {
  return new Promise((res, rej) => {
    sockets.forEach((socket) => socket.destroy());
    server.close((err) => {
      if (err) console.log("ran into error closing the server socket:", err);
      browser.close();
      waitFor.finally(() => process.exit());
    });
  });
}

async function wait(ms = 1_000) {
  await new Promise<void>((res) => setTimeout(() => res(), ms));
}

async function waitAndCollectHar(ms = 1000) {
  const start = new Date();
  tryToCollectHar();
  if (new Date().getTime() - start.getTime() < ms) {
    await wait(ms - (new Date().getTime() - start.getTime()));
  }
}

async function waitUnless(ms = 1_000, waitFor: () => Promise<Boolean>) {
  let timeout: ReturnType<typeof setTimeout>, interval: ReturnType<typeof setTimeout>;
  await new Promise<void>((res) => {
    timeout = setTimeout(() => res(), ms);
    interval = setInterval(waitFor, Math.min(500, ms / 2));
  }).then(() => {
    clearTimeout(timeout);
    clearInterval(interval);
  });
}

async function tryToCollectHar() {
  try {
    const originalCollectionTime = lastCollection;
    command = "NETWORK";
    console.log("Waiting up to 60 seconds to collect HAR");
    await waitUnless(60_000, async () => {
      return lastCollection !== originalCollectionTime;
    });
    if (lastCollection === originalCollectionTime) {
      throw new Error("Failed to collect HAR after 60 seconds!!!");
    }
  } catch (err) {
    console.error(inspect(err));
  }
}
