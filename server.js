import express from "npm:express@4.18.2"; 
import { Worker } from "https://deno.land/std@0.151.0/node/cluster.ts";


const app = express();
const nodeType = Worker.isMaster ? 'Master' : 'Worker';

const port = 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


if (Worker.isMaster) {
  for (let i = 0; i < 1; i++) {
    const worker = Worker.fork();
    worker.on('message', function (msg) {
      console.log('Master receive msg :', msg.chat);
      Worker.fork({
        'waxaccount': JSON.parse(msg.chat)['waxaccount'],
        'difficulty': JSON.parse(msg.chat)['difficulty'],
        'lastMineTx': JSON.parse(msg.chat)['lastMineTx'],
        'timeticket': JSON.parse(msg.chat)['timeticket'],
      });
    });
  }

  Worker.on('exit', (worker, code, signal) => {
    //  console.log('Worker #' + worker.process.pid, 'exited', code, signal);
    if (code !== 255) {
      Worker.fork();
    }
  });
} else {
    app.get('/', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.write('<html>');
      res.write('<head>');
      res.write('<title>now-express</title>');
      res.write('</head>');
      res.write('<body>');
      res.write(`<h1>now-express</h1>`);
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
      //  console.log(`Server is booming on port ${port} Visit http://localhost:${port}`);
    });
}


