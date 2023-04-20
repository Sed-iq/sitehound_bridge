const request = require("request-promise");

module.exports = (req, res) => {
  const second = JSON.parse(req.body.second);
  second.forEach((item) => pusher(item));
};
function pusher(item) {
  const new_product = {
    product: {
      title: item.item_number,
      body_html: item.description || null,
      product_type: item.barcode,
      variants: [
        {
          price: item.value || 0,
          inventory_management: "shopify",
          inventory_quantity: item.available_quantity || null,
        },
      ],
    },
  };
  request({
    url: process.env.SHOP_NAME,
    method: "POST",
    json: true,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.API_TOKEN,
    },
    body: new_product,
  })
    .catch((err) => {
      console.log("Error has occrred \n\n");
      console.log(err);
    })
    .then((data) => {
      console.log("done", data.product.id);
    });
}
