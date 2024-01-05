import express from "npm:express@4.18.2";
import { Worker } from "https://deno.land/std@0.151.0/node/cluster.ts";



const app = express();

app.get("/", (req, res) => {
  res.send("Welcome to the Dinosaur API!");
});

app.listen(8000);
