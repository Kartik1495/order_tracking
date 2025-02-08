const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Shopify API Credentials (replace with your actual values)

const SHOPIFY_STORE="1643f7.myshopify.com"
require("dotenv").config();
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;


// Route to fetch tracking info
app.post("/get-tracking", async (req, res) => {
    const { orderID, awbNumber } = req.body;
	console.log(orderID,awbNumber)
    let trackingNumber = awbNumber || null; // Use AWB number if provided

    // If Order ID is provided, fetch the AWB number from Shopify
    if (orderID && !awbNumber) {
        try {
            const query = `
            {
              order(id: "gid://shopify/Order/${orderID}") {
                fulfillments {
                  trackingInfo {
                    number
                  }
                }
              }
            }`;

            const response = await axios.post(
                `https://${SHOPIFY_STORE}/admin/api/2023-10/graphql.json`,
                { query },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": ACCESS_TOKEN,
                    },
                }
            );
		console.log(response.data)
            const fulfillments = response.data?.data?.order?.fulfillments;
            if (fulfillments && fulfillments.length > 0) {
                trackingNumber = fulfillments[0]?.trackingInfo[0]?.number || null;
            }
        } catch (error) {
            console.error("Error fetching tracking number from Shopify:", error.message);
            return res.status(500).json({ error: "Failed to fetch tracking number." });
        }
    }

    // If tracking number is found, fetch tracking details from Tirupati
    if (trackingNumber) {
        try {
            const tirupatiUrl = `http://shreetirupaticourier.net/frm_doctrackweb.aspx?docno=${trackingNumber}`;
            const tirupatiResponse = await axios.get(tirupatiUrl);
		console.log(tirupatiResponse.data)
            return res.send(tirupatiResponse.data); // Send the HTML response to the frontend
        } catch (error) {
            console.error("Error fetching tracking details from Tirupati:", error.message);
            return res.status(500).json({ error: "Either Order Id or Tracking Id is incorrect, or the order has not been dispatched yet. Please check the id or the dispatch timeline." });
        }
    } else {
        return res.status(404).json({ error: "Tracking number not found." });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

