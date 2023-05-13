const arr = [
  {
    title: "VINYL DOOR WITH SIDELIGHT",
    quantity: 1,
    body_html: null,
    product_type: null,
    price: 0,
    uid: null,
    barcode: "VINYL DOOR WITH SIDELIGHT",
    status: "ACTIVE",
  },
  {
    title: "6 LIGHT POLYCHROME CHANDELIER",
    quantity: 1,
    body_html: null,
    product_type: null,
    price: 300,
    uid: null,
    barcode: "6 LIGHT POLYCHROME CHANDELIER",
    status: "ACTIVE",
  },

  {
    title: "VINYL DOOR WITH SIDELIGHT",
    quantity: 3,
    body_html: null,
    product_type: null,
    price: 0,
    uid: null,
    barcode: "VINYL DOOR WITH SIDELIGHT",
    status: "ACTIVE",
  },
];
function mergeItemsByTitle(items) {
  const mergedItems = {};

  for (const item of items) {
    if (!mergedItems[item.title]) {
      mergedItems[item.title] = { ...item };
    } else {
      mergedItems[item.title].quantity += item.quantity;
    }
  }

  return Object.values(mergedItems);
}

const trimmedItems = mergeItemsByTitle(arr);

console.log(trimmedItems);
