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
    console.log("Received:", { orderID, awbNumber });

    let trackingNumber = awbNumber || null; // Use AWB number if provided

    // If Order ID is provided, fetch the AWB number from Shopify
    if (orderID && !awbNumber) {
        try {
	const query = `
            {
              orders(first: 1, query: "name:${orderID}") {
                edges {
                  node {
                    id
                    name
                    fulfillments {
                      trackingInfo {
                        number
                      }
                    }
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

            console.log("📦 Shopify Response:", response.data);
            
		const orders = response.data?.data?.orders?.edges;
		console.log(orders)
if (!orders || orders.length === 0) {
    console.log("❌ Order not found or invalid Order ID");
    return res.status(404).json({ error: "Order Id is not correct." });
}

		const fulfillments = orders[0].node.fulfillments || [];
            trackingNumber = fulfillments[0]?.trackingInfo[0]?.number || null;

            // ✅ Handling when there is no fulfillment (Pending Order)
            if (!fulfillments || fulfillments.length === 0) {
                console.log("❌ No fulfillment found");
                return res.status(200).json({ 
			message: "Order Id is correct but your Order might not have been shipped yet. Usual dispatch timeline is 7 - 10 days after an order is placed. If it is a COD order, please contact support: teamhues2019@gmail.com" 
                });
            }

            // Extract tracking number if fulfillment exists
            trackingNumber = fulfillments[0]?.trackingInfo[0]?.number || null;

            // ✅ Handling when fulfillment exists but no tracking number
            if (!trackingNumber) {
                console.log("❌ Fulfillment found but no tracking number");
                return res.status(200).json({ 
                    message: "Order is fulfilled but no tracking number is available yet." 
                });
            }

        } catch (error) {
            console.error("❌ Shopify API Error:", error.response?.data || error.message);
            return res.status(500).json({ error: "Failed to fetch tracking number from Shopify." });
        }
    }

    // ✅ Fetch tracking details from Tirupati only if a tracking number is found
    if (trackingNumber) {
        try {
            const tirupatiUrl = `http://shreetirupaticourier.net/frm_doctrackweb.aspx?docno=${trackingNumber}`;
            const tirupatiResponse = await axios.get(tirupatiUrl);
            console.log("📦 Tirupati Response:", tirupatiResponse.data);
            return res.send(tirupatiResponse.data);
        } catch (error) {
            console.error("❌ Tirupati API Error:", error.message);
            return res.status(500).json({ error: "Your Package has been picked up. Tracking Details will be available soon." });
        }
    } else {
        return res.status(404).json({ error: "Tracking number not found." });
    }
});



// Start the server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

