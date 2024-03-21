import { PuppeteerLaunchOptions } from "puppeteer";
import puppeteer from 'puppeteer-extra';
import express from 'express';
import path from "path";
import { fileURLToPath } from 'url';
import { Socket } from "net";
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

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
  '--disable-web-security',
  "--disable-features=site-per-process",
  "--disable-extensions-except=" + extensionPath,
  "--load-extension=" + extensionPath,
  "--enable-logging=stderr",
  "--v=1"
];

const launchOptions = {
  headless: 'new',
  args,
  defaultViewport: { width: 1366, height: 983 },
  executablePath: process.env.CONTAINER !== undefined ? '/usr/bin/google-chrome-stable' : '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
  ignoreDefaultArgs: ['--enable-automation'],
  slowMo: 250,
  timeout: 90000,
  devtools: true,
  dumpio: true
} as PuppeteerLaunchOptions

let sockets: Socket[] = [];
const app = express();
const start = new Date();
let hasNeverSentNetwork = true;
app.use(express.json({ limit: '1gb' }))
app.get('/command', (_req, res) => {
  const time = new Date().getTime() - start.getTime();
  console.log('time:', time);
  if (time > 9000 && hasNeverSentNetwork) {
    hasNeverSentNetwork = false;
    return res.send("NETWORK");
  }
  return res.send("NOP");
});
app.post('/network', (req, res) => {
  const network = req.body;
  console.log('received network log', JSON.stringify(network));
  res.sendStatus(200);
})
const server = app.listen(1234, '127.0.0.1');
server.on('connection', socket => {
  sockets.push(socket);
})
server.on('close', (closingSocket: Socket) => {
  sockets = sockets.filter(socket => socket !== closingSocket)
})

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch(launchOptions);
try {
  const pages = await browser.pages();
  const page = pages.length ? pages[0] : await browser.newPage()
  await page.goto("https://vorelli.github.io/index.html");
} catch (err) {
  console.error("Caught error:", err);
}

process.on('uncaughtException', (err) => {
  console.error('uncaught:', err);
})

process.on('unhandledRejection', err => {
  console.error("Unhandled rejection:", err);
})

setTimeout(() => {
  sockets.forEach(socket => socket.destroy())
  server.close((err) => {
    if (err) console.log('ran into error:', err);
    browser.close();
    process.exit();
  })
}, 11000)
