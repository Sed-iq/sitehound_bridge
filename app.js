const dotenv = require("dotenv").config(),
  S3 = require("./s3"),
  request = require("request-promise"),
  fs = require("fs"),
  uploader = require("./uploader"),
  express = require("express"),
  app = express(),
  json2csv = require("json2csv"),
  csv2json = require("csvtojson");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.post("/update", uploader);

app.get("/", (req, res) => {
  res.send("Connector is Running");
});

app.get("/status", (req, res) => {
  fs.readFile("sitehound.json", (err, data) => {
    res.json(JSON.parse(data));
  });
});
app.get("/csv", (req, res) => {
  // Generate csv on command
  res.send("csv generated");
  fs.readFile("sitehound.json", (err, data) => {
    Caller(JSON.parse(data));
  });
});
app.listen(
  process.env.PORT,
  console.log("Connector is running at", process.env.PORT)
);
const interval = 200 * 5 * 60
setInterval(async () => {
  try {
    const sitehound = await getArchive();
    Caller(sitehound);
  } catch (error) {
    console.error(error);
  }
}, interval);

function Caller(sitehound) {
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
            Location: item.location,
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
                console.log(
                  `${data[i].Quantity},${data[i].Title}\n, ${sitehound[j].quantity}, ${sitehound[j].title} `
                );
                depleted_product.push({
                  Location: sitehound[j].location,
                  Title: sitehound[j].title,
                  Body: sitehound[j].body_html,
                  Price: sitehound[j].price,
                  Quantity: remainder,
                  To_status: "SOLD",
                  Status: sitehound[j].status,
                });
                break;
              }
              break;
            }
          }
        }
        if (depleted_product != "") {
          const csv = json2csv.parse(depleted_product);
          const params = {
            Bucket: "updatepool",
            Key: "products.csv",
            Body: csv,
            ContentType: "application/json",
          };

          uploadToS3(params, depleted_product)
            .then(() => {
              updateArchive(sitehound, depleted_product);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          console.log("no update");
          console.log(depleted_product);
        }
      } else console.log("data invalid");
    })
    .catch((err) => {
      console.log(err);
    });
}
function updateArchive(data, depleted_product) {
  const new_archive = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < depleted_product.length; j++) {
      if (depleted_product[j].Title === data[i].title) {
        new_archive.push({
          title: data[i].title,
          quantity: data[i].quantity - depleted_product[j].Quantity,
          body_html: data[i].body_html,
          product_type: data[i].product_type,
          price: data[i].price,
          uid: data[i].uid,
          location: data[i].location,
          barcode: data[i].barcode,
          status: data[i].status,
        });
        console.log("match");
        break;
      } else {
        new_archive.push(data[i]);
        break;
      }
    }
  }
  fs.writeFile("sitehound.json", JSON.stringify(new_archive), (err) => {
    console.log("Archive updated");
  });
}
function getArchive() {
  return new Promise((resolve, reject) => {
    fs.readFile("sitehound.json", (err, data) => {
      if (err) reject(err);
      else {
        const readAble = JSON.parse(data);
        resolve(readAble);
      }
    });
  });
}
async function uploadToS3(uploadData, putData) {
  // putdata is the data to be added on to it.
  return new Promise(async (resolve, reject) => {
    try {
      const filedata = await S3.getObject({
        Bucket: "updatepool",
        Key: "products.csv",
      }).promise();
      const products = filedata.Body.toString();
      console.log(products);
      csv2json()
        .fromString(products)
        .then(async (json) => {
          putData.map((item) => {
            json.push(item);
          });
          const csv = json2csv.parse(json); // parsing back to csv
          const params = {
            Bucket: "updatepool",
            Key: "products.csv",
            Body: csv,
          };
          S3.putObject(params)
            .promise()
            .then(() => resolve(null))
            .catch((err) => reject(err));
        });
    } catch (err) {
      // Update normally
      S3.upload(uploadData, (err, _data) => {
        if (err) reject(err);
        else resolve(null); // updated
      });
    }
  });
}
