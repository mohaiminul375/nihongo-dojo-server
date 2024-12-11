const express = require('express');
const app = express();
const port = 5000;
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
// Middleware & Cors
app.use(express.json());
// app.use();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const lessonsCollections = client.db('nihongo-dojo').collection('all-lesson')
        const vocabularyCollections = client.db('nihongo-dojo').collection('all-vocabulary');

        // admin management
        // user management
        // register/ create a new user
        app.post('/register', async (req, res) => {
            const { user_name, email, img, password } = req.body;
            // console.log(req.body)
            //  Check if email and password are provide
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
                // console.log(hasPassword)
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
        app.post('/login', async (req, res) => {
            const { email, password } = req.body;
            console.log(req.body);

            // Check if email and password are provided
            if (!email || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            try {
                // Find user by email
                const user = await usersCollections.findOne({ email });
                if (!user) {
                    return res.status(400).json({ error: 'User not found' });
                }
                // Compare password with the stored hash
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(400).json({ error: 'Wrong Password' });
                }
                // Remove the password field from the user object
                const { password: userPassword, ...userInfo } = user;

                // Is JWT_SECRET is set
                if (!process.env.JWT_SECRET) {
                    console.log("JWT_SECRET is not defined");
                    return res.status(500).json({ error: "Internal server error: JWT_SECRET not set" });
                }

                // Create JWT token
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
                console.log(token);

                // Send the token as a cookie and user info (excluding password)
                res.cookie('token', token, { httpOnly: true }).json({
                    message: 'Login successful',
                    token,
                    user: userInfo
                });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });





        // lesson management
        // get all lesson
        app.get('/all-lesson', async (req, res) => {
            const result = await lessonsCollections.find().toArray() || [];
            res.send(result)
        })
        // create a lesson
        app.post('/all-lesson', async (req, res) => {
            const embed_link = req.body;
            console.log(embed_link)
            const result = await lessonsCollections.insertOne(embed_link);
            res.send(result)
        })

        // delete lesson
        app.delete('/all-lesson/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await lessonsCollections.deleteOne(query);
            res.send(result)
        })
        // vocabulary management
        app.get('/all-vocabulary', async (req, res) => {
            const { lesson_no } = req.query;
            console.log(lesson_no)
            let query = {};
            if (lesson_no) {
                query.lesson_no = parseFloat(lesson_no)
            }
            console.log(query);
            const result = await vocabularyCollections.find(query).toArray() || [];
            res.send(result);
        })
        // create vocabulary
        app.post('/all-vocabulary', async (req, res) => {
            const newVocabulary = req.body;
            const result = await vocabularyCollections.insertOne(newVocabulary);
            res.send(result);
        })





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