import { cpus } from "https://deno.land/x/dos@v0.11.0/mod.ts";
import * as cluster from "https://deno.land/std@0.110.0/node/cluster.ts";
import * as url from "https://deno.land/x/module_url/mod.ts";
import * as mod from "https://deno.land/std@0.211.0/fs/mod.ts";
import express from "npm:express@4.18.2";

const app = express();
const nodeType = cluster.isMaster ? 'Master' : 'Worker';

const port = 9999;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const timeticket = {};
const platformgu = {
  'waxaccount': '',
  'timestamps': Date.now(),
};
const requestpip = {
  'cosmicclashio': {
    'waxaccount': '',
    'timestamps': Date.now(),
  },
};

if (cluster.isMaster) {
  for (let i = 0; i < 1; i++) {
    const worker = cluster.fork();
    worker.on('message', function (msg) {
      console.log('Master receive msg :', msg.chat);
      cluster.fork({
        'waxaccount': JSON.parse(msg.chat)['waxaccount'],
        'difficulty': JSON.parse(msg.chat)['difficulty'],
        'lastMineTx': JSON.parse(msg.chat)['lastMineTx'],
        'timeticket': JSON.parse(msg.chat)['timeticket'],
      });
    });
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log('Worker #' + worker.process.pid, 'exited', code, signal);
    if (code !== 255) {
      cluster.fork();
    }
  });
} else {
  if (
    'waxaccount' in process.env &&
    'difficulty' in process.env &&
    'lastMineTx' in process.env &&
    'timeticket' in process.env &&
    process.env.waxaccount &&
    process.env.difficulty &&
    process.env.lastMineTx &&
    process.env.timeticket &&
    !process.env.waxaccount == '' &&
    !process.env.difficulty == '' &&
    !process.env.lastMineTx == '' &&
    !process.env.timeticket == ''
  ) {} else {

    app.get('/', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.write('<html>');
      res.write('<head>');
      res.write('<title>now-express</title>');
      res.write('</head>');
      res.write('<body>');
      res.write(`<h1>now-express ${process.pid}</h1>`);
      res.write('</body>');
      res.write('<html>');
      res.end();
    });

    app.get('/trace/ip', (req, res) => {
      fetch('https://www.cloudflare.com/cdn-cgi/trace')
        .then((result) => result.text())
        .then((result) => {
          console.log(result);
          res.setHeader('Content-Type', 'text/html');
          res.write('<html>');
          res.write('<head>');
          res.write('<title>trace</title>');
          res.write('</head>');
          res.write('<body>');
          res.write(`<pre>${result}</pre>`);
          res.write('</body>');
          res.write('<html>');
          res.end();
        });
    });

    app.listen(port, () => {
      console.log(`Server is booming on port ${port} Visit http://localhost:${port}`);
    });
  }
}

console.log(nodeType + ' #' + process.pid, 'is running');
