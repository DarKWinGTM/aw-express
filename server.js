import * as crypto from 'crypto';
import { sha256 } from 'js-sha256';
import { Api, JsonRpc, Serialize } from 'eosjs';
import fetch from 'node-fetch';
import { cpus } from 'os';
import * as cluster from 'cluster';
import { TextEncoder, TextDecoder } from 'text-encoding';
import * as url from 'url';
import * as fs from 'fs';
//  import * as cloudscraper from 'cloudscraper';
import express from "npm:express@4.18.2";
//  import { exec } from 'child_process';

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
  ) {
    guess({
      'waxaccount': process.env.waxaccount,
      'difficulty': process.env.difficulty,
      'lastMineTx': process.env.lastMineTx,
    }).then((result) => {
      try {
        fs.writeFile(
          `data/${process.env.timeticket}.json`,
          JSON.stringify({
            'waxaccount': process.env.waxaccount,
            'difficulty': process.env.difficulty,
            'lastMineTx': process.env.lastMineTx,
            'timeticket': process.env.timeticket,
            'result': result,
            'status': result['nonce'] ? 200 : 201,
          }),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );
      } catch (err) {
        console.error(
          {
            'waxaccount': process.env.waxaccount,
            'difficulty': process.env.difficulty,
            'lastMineTx': process.env.lastMineTx,
          },
          process.env.timeticket,
          err
        );
        fs.writeFile(`data/${process.env.timeticket}.json`, '', (err) => {});
      }
      setTimeout(function () {
        process.exit(255);
      }, 2000);
    });
  } else {
    setInterval(function () {
      if (
        new Date() - platformgu['timestamps'] > 60 * 60 * 1000 &&
        platformgu['waxaccount']
      ) {
        exec('kill 1', (err, stdout, stderr) => {
          if (err) console.log(err);
        });
      }
      if (
        new Date() - requestpip['cosmicclashio']['timestamps'] >
          120 * 60 * 1000 &&
        requestpip['cosmicclashio']['waxaccount']
      ) {
        exec('kill 1', (err, stdout, stderr) => {
          if (err) console.log(err);
        });
      }
    }, 10 * 60 * 1000);

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

    app.get('/v1/open/:args', (req, res) => {
      if (
        req.url.match('waxaccount') &&
        req.url.match('difficulty') &&
        req.url.match('lastMineTx') &&
        url.parse(req.url, true).query &&
        url.parse(req.url, true).query.waxaccount &&
        url.parse(req.url, true).query.difficulty &&
        url.parse(req.url, true).query.lastMineTx
      ) {
        console.log(req.url);
        console.log(url.parse(req.url, true).query.waxaccount);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('timeticket', new Date().getTime());
        process.send({
          chat: JSON.stringify({
            'waxaccount': url.parse(req.url, true).query.waxaccount,
            'difficulty': url.parse(req.url, true).query.difficulty,
            'lastMineTx': url.parse(req.url, true).query.lastMineTx,
            'timeticket': res.getHeaders()['timeticket'],
          }),
        });
        fs.writeFile(
          `data/${res.getHeaders()['timeticket']}.json`,
          JSON.stringify({
            'waxaccount': url.parse(req.url, true).query.waxaccount,
            'difficulty': url.parse(req.url, true).query.difficulty,
            'lastMineTx': url.parse(req.url, true).query.lastMineTx,
            'timeticket': res.getHeaders()['timeticket'],
            'result': {
              account: url.parse(req.url, true).query.waxaccount,
              nonce: '',
              answer: '',
            },
            'status': 400,
          }),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );
        res.end(
          JSON.stringify({ timeticket: res.getHeaders()['timeticket'] })
        );
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.send('?');
      }
    });
    app.get('/v1/call/:args', (req, res) => {
      if (req.params.args) {
        console.log(req.url);
        console.log(req.params.args);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('timeticket', req.params.args);
        fs.readFile(`data/${req.params.args}.json`, 'utf-8', function (
          err,
          json
        ) {
          try {
            res.end(JSON.stringify(JSON.parse(json)));
          } catch (err) {
            res.end(
              JSON.stringify({ status: 500, msg: err })
            );
          }
        });
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.send('?');
      }
    });

    app.get('/:args', (req, res) => {
      if (
        req.url.match('waxaccount') &&
        req.url.match('difficulty') &&
        req.url.match('lastMineTx') &&
        url.parse(req.url, true).query &&
        url.parse(req.url, true).query.waxaccount &&
        url.parse(req.url, true).query.difficulty &&
        url.parse(req.url, true).query.lastMineTx
      ) {
        console.log(req.url);
        console.log(url.parse(req.url, true).query.waxaccount);
        guess({
          'waxaccount': url.parse(req.url, true).query.waxaccount,
          'difficulty': url.parse(req.url, true).query.difficulty,
          'lastMineTx': url.parse(req.url, true).query.lastMineTx,
        }).then((result) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        });
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.send('?');
      }
    });

    app.listen(port, () => {
      console.log(`Server is booming on port ${port} Visit http://localhost:${port}`);
    });
  }
}

console.log(nodeType + ' #' + process.pid, 'is running');

async function guess(DATA) {
  const nameToArray = (name) => {
    const sb = new Serialize.SerialBuffer({
      textEncoder: new TextEncoder(),
      textDecoder: new TextDecoder(),
    });
    sb.pushName(name);
    return sb.array;
  };

  const getRand = () => {
    const arr = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      arr[i] = (Math.random() * 256) >> 0;
    }
    return arr;
  };
  const toHex = (buffer) => {
    return [...new Uint8Array(buffer)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };
  const unHex = (hexed) => {
    const arr = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      arr[i] = parseInt(hexed.slice(i * 2, (i + 1) * 2), 16);
    }
    return arr;
  };
  const fromHexString = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  var mining_account = 'm.federation';
  var account = nameToArray(DATA.waxaccount);
  var account_str = DATA.waxaccount;
  var difficulty = DATA.difficulty;
  var last_mine_tx = DATA.lastMineTx.substr(0, 16);
  var last_mine_arr = fromHexString(last_mine_tx);
  console.log('NEW', last_mine_arr, last_mine_arr.length);

  account = account.slice(0, 8);

  const is_wam = account_str.substr(-4) === '.wam';

  let good = false,
    itr = 0,
    rand = 0,
    hash,
    hex_digest,
    rand_arr,
    last;

  console.log(`Performing work with difficulty ${difficulty}, last tx is ${last_mine_tx}...`);
  if (is_wam) {
    console.log(`Using WAM account`);
  }

  var start = new Date().getTime();
  var end = new Date().getTime();

  while (!good) {
    //    for(;;){

    rand_arr = getRand();

    const combined = new Uint8Array(
      account.length + last_mine_arr.length + rand_arr.length
    );
    combined.set(account);
    combined.set(last_mine_arr, account.length);
    combined.set(rand_arr, account.length + last_mine_arr.length);

    hex_digest = await sha256.create().update(combined.slice(0, 24)).hex('');

    good = hex_digest.substr(0, 4) === '0000';

    if (good) {
      last = parseInt(hex_digest.substr(4, 1), 16);
      good &= last <= difficulty;
    }

    itr++;

    if (itr % 10000 === 0) {
      console.log(
        `Still mining - tried ${itr} iterations ${((new Date().getTime() - start) / 1000).toFixed(2)}s`
      );
      end = new Date().getTime();
    }

    if ((end - start) / 1000 >= 20 / (Number(difficulty) || 1)) {
      rand_arr = '';
      hex_digest = `SORRY WE CAN NOT SOLVED LOOP ${itr}`;
      break;
    }
  }

  end = new Date().getTime();

  const rand_str = toHex(rand_arr);

  console.log(
    `Found hash in ${itr} iterations with ${account} ${rand_str}, last = ${last}, hex_digest ${hex_digest} taking ${(end -
      start) /
      1000}s`
  );
  const mine_work = { account: account_str, nonce: rand_str, answer: hex_digest };

  console.log(mine_work);

  return new Promise(function (resolve, reject) {
    resolve({ account: account_str, nonce: rand_str, answer: hex_digest });
  });
}

function arrayToHex(data) {
  let result = '';
  for (const x of data) {
    result += ('00' + x.toString(16)).slice(-2);
  }
  return result;
}
async function get_rawabi_and_abi(account) {
  try {
    const endpoint = 'https://wax.blokcrafters.io';
    const rpc = new JsonRpc(endpoint, { fetch });
    const api = new Api({
      rpc,
      signatureProvider,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder(),
    });

    const rawAbi = (await api.abiProvider.getRawAbi(account)).abi;
    const abi = await api.rawAbiToJson(rawAbi);

    const result = {
      accountName: account,
      rawAbi,
      abi,
    };
    return result;
  } catch (err) {
    console.log(err);
  }
}
