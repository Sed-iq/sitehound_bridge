const dotenv = require("dotenv").config(),
  S3 = require("./s3"),
  request = require("request-promise"),
  fs = require("fs"),
  uploader = require("./uploader"),
  express = require("express"),
  app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.post("/update", uploader);

app.listen(
  process.env.PORT,
  console.log("Connector is running at", process.env.PORT)
);
function Caller() {
  // Calles the product.json of the shopify api
  request({
    url: process.env.SHOP_NAME,
    json: true,
    method: "GET",
    timeout: 5000,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.API_TOKEN,
    },
  })
    .then((data) => {
      const params = {
        Bucket: "shopifypool",
        Key: "products.json",
        Body: JSON.stringify(data),
        ContentType: "application/json",
      };
      S3.upload(params, (err, _data) => {
        if (err) console.error(err);
        else console.log("updated");
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

const interval = 60 * 200 * 5;
// the caller function will run every 1 minute
// setInterval(Caller, interval);
