const request = require("request-promise");
const fs = require("fs");
module.exports = async (req, res) => {
  const second = JSON.parse(req.body.second);
  const $ = second.map((data) => {
    return {
      title: data.item_number,
      quantity: data.quantity,
      body_html: data.description,
      product_type: null,
      price: data.value,
      uid: data.uid,
      location: data.location,
      barcode: data.barcode,
      status: data.status || null,
    };
  });
  const sitehound = $.filter((c) => c.quantity > 0);
//	console.log($)
  fs.writeFile("sitehound.json", JSON.stringify($), (err) => {
    console.log(err || "done");
  });
  const shopify = await getShopify();
  const matches = checkTitlesAndStore(sitehound, shopify).matchingItems;
  const noMatch = checkTitlesAndStore(sitehound, shopify).nonMatchingItems;
	if(matches.length > 0) matches.forEach((item) => update(item, item.id, res));
  if (noMatch.length > 0) noMatch.forEach((item) => saveNew(item));
};
// function mergeItemsByTitle(items) {
//   const mergedItems = {};

//   for (const item of items) {
//     if (!mergedItems[item.title]) {
//       mergedItems[item.title] = { ...item };
//     } else {
//       mergedItems[item.title].quantity += item.quantity;
//     }
//   }

//   return Object.values(mergedItems);
// }
function getShopify() {
  return new Promise((resolve, reject) => {
    request({
      method: "GET",
      url: process.env.SHOP_NAME,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.API_TOKEN,
      },
    })
      .then((data) => {
        const _product = JSON.parse(data);
        const Data = _product.products.map((item) => {
          return {
            id: item.id,
            title: item.title,
            quantity: item.variants[0].inventory_quantity,
            body_html: item.body_html,
            product_type: item.product_type,
            price: item.variants[0].price,
          };
        });
        resolve(Data);
      })
      .catch((err) => reject(err));
  });
}
function update(sitehound_data, shopify_id, res) {
  request({
    method: "PUT",
    json: true,
    url: `https://executivesalvage.myshopify.com/admin/api/2023-04/products/${shopify_id}.json`,
    body: {
      product: {
        title: sitehound_data.title || null,
        body_html: sitehound_data.body_html || null,
        product_type: sitehound_data.product_type || null,
        variants: [
          {
            inventory_quantity: sitehound_data.quantity || 0,
            inventory_management: "shopify",
            price: sitehound_data.price || 0,
          },
        ],
      },
    },
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.API_TOKEN,
    },
  })
    .then((data) => {
      res.end();
    })
    .catch((err) => {
      res.end();
      console.log("error");
    });
}
function checkTitlesAndStore(arr1, arr2) {
  const matchingItems = [];
  const nonMatchingItems = [];
  for (let i = 0; i < arr1.length; i++) {
    let matchFound = false;
    for (let j = 0; j < arr2.length; j++) {
      if (arr1[i].title === arr2[j].title) {
        matchingItems.push({
          title: arr1[i].title,
          quantity: arr1[i].quantity,
          body_html: arr1[i].body_html,
          product_type: arr1[i].product_type,
          price: arr1[i].price,
          id: arr2[j].id,
        });
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
      nonMatchingItems.push(arr1[i]);
    }
  }
  return { matchingItems, nonMatchingItems };
}
function saveNew(sitehound_data) {
  if (sitehound_data.quantity == 0) {
    return 0;
  } else {
    const new_product = {
      product: {
        title: sitehound_data.title,
        body_html: sitehound_data.body_html,
        product_type: sitehound_data.product_type,
        variants: [
          {
            inventory_quantity: sitehound_data.quantity,
            inventory_management: "shopify",
            price: sitehound_data.price,
          },
        ],
      },
    };
    request({
      method: "POST",
      url: process.env.SHOP_NAME,
      json: true,
      body: new_product,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.API_TOKEN,
      },
    })
      .then((d) => console.log("New product added"))
      .catch((err) => console.log(sitehound_data.title, "Error here"));
  }
}
