require("dotenv").config();
const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();
const config = JSON.parse(fs.readFileSync(__dirname + "/config.json"))
const types = JSON.parse(fs.readFileSync(__dirname + "/types.json"))

function randomString(length) {
  const keys = Array.from("abcdefghijklmnopqrstuvwxyz1234567890");
	let key = "";
	for (let i = 0; i < length; i++) {
	    key += keys[Math.floor(Math.random() * keys.length)];
	}
	return key;
}

app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
if (config.debug)
  app.use(require("morgan")("dev"));

app.post("/upload", (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", config.baseURL);
    res.setHeader("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    if (req.headers.key !== process.env.uploadKey) {
      return res.status(403).send({ status: 403, message: "Invalid token" });
    } else {
      if (!req.files) {
        res.status(404).send({
          status: 404,
          message: "No file uploaded",
        });
      } else {
        const data = req.files
        if (!!data.image) {
          let image = data.image;
          let name = randomString(config.length);
          let type = image.name.split(".").pop()
          image.mv("./host/" + type + "/" + name + "." + type);
          res.status(200).send(`${config.baseURL}${name}`);
        }
      }
    }
  } catch (err) {
    res.status(500).send(err);
    console.log(err)
  }
});
app.use("/panel", (req, res) => {
  const type = req.headers.type
  if (!type) {
    res.sendFile(__dirname + "/panel.html");
  } else {
    if (req.headers.key != process.env.adminKey) {
      return res.status(403).send({})
    }
  }
  if (type === "getAllFiles") {
    const l = {}
    for (let type of fs.readdirSync(__dirname + "/host")) {
      l[type] = fs.readdirSync(__dirname + "/host/" + type)
    }
    res.status(200).send({"types":types,"folders": l});
  } else if (type === "renameFile") {
    fs.rename(__dirname + "/host/" + req.headers.file.split(".").pop() + "/" + req.headers.file, __dirname + "/host/" + req.headers.rename.split(".").pop() + "/" + req.headers.rename, (err) => {
      if (err) {
        console.log(err)
        res.status(500).send(err)
      } else {
        res.status(200).send("")
      }
    });
  } else if (type === "deleteFile") {
    fs.unlink(__dirname + "/host/" + req.headers.file.split(".").pop() + "/" + req.headers.file, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err)
      }
      res.status(200).send("")
    });
  } else if (type === "editFile") {
    const value = req.headers.body.toString()
    fs.writeFile(__dirname + "/host/" + req.headers.file.split(".").pop() + "/" + req.headers.file, `${value}`,(err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err)
      }
      res.status(200).send("")
    });
  }
});
app.get("/:path", (req, res) => {
  const file = req.params.path
  if (file.includes(".")) {
    const type = file.split(".")[file.split(".").length - 1]
    if (fs.existsSync("./host/" + type)) {
      if (fs.existsSync("./host/" + type + "/" + file)) {
        res.status(200).sendFile(__dirname + "/host/" + type + "/" + file)
      } else {
        res.status(404).send("")
      }
    } else {
      res.status(404).send("")
    }
  } else {
    let type = ""
    if (fs.existsSync("./host/png/" + file + ".png")) {
      type = "png"
    } else if (fs.existsSync("./host/jpg/" + file + ".jpg")) {
      type = "jpg"
    } else {
      return res.status(404).send("")
    }
    res.status(200).send(`<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv='X-UA-Compatible' content='IE=edge,chrome=1'>
    <meta name='viewport' content='width=device-width'>
    <meta name='viewport' content='width=1024'>
    <meta charset='utf-8'>
    <meta name="theme-color" content="#169DE6">
    <meta name="og:title" content="Screenshot">
    <meta name="og:image" content="${config.baseURL + file + "." + type}"
    <meta name="twitter:card" content="summary_large_image">
  </head>
  <body>
    <script>
      window.location.replace("${config.baseURL + file + "." + type}")
    </script>
  </body>
</html>`)
  }
});
app.listen(3000, () => {

});