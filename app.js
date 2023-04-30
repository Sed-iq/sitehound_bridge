const dotenv = require("dotenv").config(),
  S3 = require("./s3"),
  request = require("request-promise"),
  fs = require("fs"),
  uploader = require("./uploader"),
  express = require("express"),
  app = express(),
  json2csv = require("json2csv");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.post("/update", uploader);

app.get("/", (req, res) => {
  res.send("Running");
});
app.listen(
  process.env.PORT,
  console.log("Connector is running at", process.env.PORT)
);
try {
  const sitehound = fs.readFileSync("sitehound.json");
  // fs.readFile("./")
  function Caller() {
    // Calles the product.json of the shopify api
    request({
      url: process.env.SHOP_NAME,
      json: true,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.API_TOKEN,
      },
    })
      .then((d) => {
        if (sitehound != "") {
          var depleted_product = [];
          var data = d.products.map((item) => {
            return {
              Location: "SEATTLE HUB",
              Handle: item.handle,
              Title: item.title,
              Body: item.body_html,
              Vendor: item.vendor,
              Price: item.variants[0].price,
              Quantity: item.variants[0].inventory_quantity,
              Type: item.product_type,
              Status: item.status,
            };
          });
          for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < sitehound.length; j++) {
              if (sitehound[j].title == data[i].Title) {
                const remainder = sitehound[j].quantity - data[i].Quantity;
                if (remainder > 0) {
                  depleted_product.push({
                    Location: "SEATTLE HUB",
                    Title: sitehound[j].title,
                    Body: sitehound[j].body_html,
                    Price: sitehound[j].price,
                    Quantity: remainder,
                  });
                  break;
                }
                break;
              }
            }
          }

          const csv = json2csv.parse(depleted_product);
          const params = {
            Bucket: "updatepool",
            Key: "products.csv",
            Body: csv,
            ContentType: "application/json",
          };
          S3.upload(params, (err, _data) => {
            if (err) console.error(err);
            else console.log("updated");
          });
        } else {
          console.log("no update");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
} catch (err) {
  console.log("No update");
}
// Caller();
// const interval = 60 * 200 * 5;
// the caller function will run every 1 minute
// setInterval(Caller, interval);
