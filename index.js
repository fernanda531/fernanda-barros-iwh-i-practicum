const express = require('express');
const axios = require('axios');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// * Please DO NOT INCLUDE the private app access token in your repo. Don't do this practicum in your normal account.
const PRIVATE_APP_ACCESS = '';
const CUSTOM_OBJ_TYPE = '2-202933022';

const hubspotHeaders = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    'Content-Type': 'application/json'
};

// Helper: fetch ALL records with pagination and sort by latest task created
async function fetchAllRecords() {
    const properties = 'hours_spent,billable_amount,billable_rate,task';
    let allResults = [];
    let after = undefined;

    do {
        const params = `limit=100&properties=${properties}${after ? `&after=${after}` : ''}`;
        const url = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJ_TYPE}?${params}`;
        const response = await axios.get(url, { headers: hubspotHeaders });

        allResults = allResults.concat(response.data.results);
        after = response.data.paging?.next?.after || null;
    } while (after);

    // Sort newest first
    allResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return allResults;
}

// TODO: ROUTE 1 - Create a new app.get route for the homepage to call your custom object data. Pass this data along to the front-end and create a new pug template in the views folder.

app.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');

    try {
        const data = await fetchAllRecords();
        res.render('homepage', {
            title: 'Time Tracking | HubSpot Custom Objects',
            data
        });
    } catch (error) {
        console.error('Error fetching records:', error.response?.data || error.message);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Could not load time tracking records. Please check your HubSpot configuration.'
        });
    }
});

// TODO: ROUTE 2 - Create a new app.get route for the form to create or update new custom object data. Send this data along in the next route.

app.get('/update-cobj', (req, res) => {
    res.render('updates', {
        title: 'Add Time Entry | Time Tracking'
    });
});

// TODO: ROUTE 3 - Create a new app.post route for the custom objects form to create or update your custom object data. Once executed, redirect the user to the homepage.

app.post('/update-cobj', async (req, res) => {
    const { hours_spent, task } = req.body;

    const newRecord = {
        properties: {
            hours_spent,
            task
        }
    };

    const url = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJ_TYPE}`;

    try {
        await axios.post(url, newRecord, { headers: hubspotHeaders });
        res.redirect('/');
    } catch (error) {
        console.error('Error creating record:', error.response?.data || error.message);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Could not create the time tracking record. Please try again.'
        });
    }
});

// * Localhost
app.listen(9000, () => console.log('Listening on http://localhost:3000'));