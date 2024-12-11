const express = require('express');
const app = express();
const port = 5000;
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcrypt');
// Middleware & Cors
app.use(express.json());
// app.use();
app.use(cors({ origin: 'http://localhost:3000' }));


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixszr3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // collection
        const usersCollections = client.db('nihongo-dojo').collection('all-users')



        // user management
        // register/ create a new user
        app.post('/register', async (req, res) => {
            const { user_name, email, img, password } = req.body;
            console.log(req.body)
            // field evaluation
            if (!user_name || !email || !img || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            try {
                // is user existed
                const isExisted = await usersCollections.findOne({ email });
                if (isExisted) {
                    return res.status(400).json({ error: 'Email already exists please login' });
                }
                // password has by bcrypt
                const hasPassword = bcrypt.hashSync(password, 10);
                // insert a new user 
                const newUser = { user_name, email, img, password: hasPassword, role: 'User' }
                const result = await usersCollections.insertOne(newUser);
                // res send to front end
                res.status(201).json({ message: 'User registered successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        })

        // get all user
        app.get('/all-users', async (req, res) => {
            const result = await usersCollections.find().toArray() || [];
            res.send(result);
        })



        // login user















        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// test server
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})