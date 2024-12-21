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
app.use(cors({
    origin: ['http://localhost:3000', 'https://nihongo-dojo-client.vercel.app'],
    credentials: true
}));
app.use(cookieParser());

// Custom middleWare for Jwt
// JWT authorization
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
    console.log(token)
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        // Decode and verify the token
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user data (like email) to the request object
        req.user = verified;
        console.log(verified)

        next();
    } catch (err) {
        res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};


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
        const tutorialsCollections = client.db('nihongo-dojo').collection('all-tutorials')
        const vocabularyCollections = client.db('nihongo-dojo').collection('all-vocabulary');
        const progressCollections = client.db('nihongo-dojo').collection('all-progress');


        // admin management
        // user management
        // register/ create a new user
        app.post('/register', async (req, res) => {
            const { user_name, email, img, password } = req.body;
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

            // Validate request body
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
                    return res.status(400).json({ error: 'Invalid credentials' });
                }
                const { password: usePassword, ...userInfo } = user;
                // Generate JWT token
                const token = jwt.sign(
                    {
                        id: user._id,
                        role: user.role,
                        name: user.user_name,
                        img: user.img,
                        email: user.email,
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '12h' }
                );
                console.log(token)

                res.json({ token, message: 'Login successful' });



            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // get user info
        app.get('/user', authenticateUser, async (req, res) => {
            try {
                console.log(req.user, 'req')
                // Find the user by email (from the decoded JWT)
                const user = await usersCollections.findOne({ email: req.user.email });
                console.log(user);

                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }

                // Remove password from the user object
                const { password, ...userWithoutPassword } = user;

                res.status(200).json({ user: userWithoutPassword });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Error fetching user data" });
            }
        });
        // update role
        app.patch('/update-users/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { value } = req.body;
                const query = { _id: new ObjectId(id) };
                const update = { $set: { role: value } };
                const result = await usersCollections.updateOne(query, update);
                res.send(result)
            } catch (error) {
                console.error('Error updating user role:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        })
        // 
        app.put('/update-status/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body;
                const query = { _id: new ObjectId(id) };
                const option = { upsert: true }
                const update = { $set: { status: status } };
                const result = await usersCollections.updateOne(query, update, option);
                res.send(result)
            } catch (error) {
                console.error('Error updating status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        })
        // delete user
        app.delete('/all-users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollections.deleteOne(query);
            res.send(result);
        })


        // lesson management
        // get all lesson
        app.get('/all-lesson', async (req, res) => {
            try {
                // Get the lessons and vocabulary collections
                const vocabulary = await vocabularyCollections.find().toArray();
                const lessons = await lessonsCollections.find().toArray() || [];

                // Create a map for counting lesson_no in the vocabulary collection
                const lessonNoCounts = vocabulary.reduce((acc, item) => {
                    const lessonNo = item.lesson_no; // Assuming 'lesson_on' is the lesson number
                    acc[lessonNo] = (acc[lessonNo] || 0) + 1;
                    return acc;
                }, {});

                // Add vocabulary count to each lesson
                const result = lessons.map(lesson => {
                    const vocabularyCount = lessonNoCounts[lesson.lesson_no] || 0;
                    return {
                        ...lesson,
                        vocabulary_count: vocabularyCount
                    };
                });

                // Send the response with the lessons and vocabulary count
                res.send(result);
            } catch (error) {
                console.error("Error fetching lessons:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // create a lesson
        app.post('/all-lesson', async (req, res) => {
            const new_vocabulary = req.body;
            const result = await lessonsCollections.insertOne(new_vocabulary);
            res.send(result);
        })

        // Dropdown lesson
        app.get('/all-lesson-filter', async (req, res) => {
            try {
                const result = await lessonsCollections.find({}, { projection: { lesson_name: 1, lesson_no: 1, _id: 0 } }).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching lessons:', error);
                res.status(500).send('Internal Server Error');
            }
        });


        // tutorial management
        // get all tutorial
        app.get('/all-tutorials', async (req, res) => {
            const result = await tutorialsCollections.find().toArray() || [];
            res.send(result)
        })
        // create a tutorial
        app.post('/all-tutorials', async (req, res) => {
            const embed_link = req.body;
            console.log(embed_link)
            const result = await tutorialsCollections.insertOne(embed_link);
            res.send(result)
        })

        // delete tutorial
        app.delete('/all-tutorials/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tutorialsCollections.deleteOne(query);
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
        // update vocabulary

        app.patch('/all-vocabulary/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const update_info = req.body;
                const query = { _id: new ObjectId(id) };
                console.log(query)
                const update_Doc = {
                    $set: { ...update_info },
                };

                const result = await vocabularyCollections.updateOne(query, update_Doc);
                console.log(result)
                res.send(result)

            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error updating vocabulary', error: error.message });
            }
        });



        // delete vocabulary
        app.delete('/all-vocabulary/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await vocabularyCollections.deleteOne(query);
            res.send(result)
        })
        // Progress Management
        app.post('/progress', async (req, res) => {
            try {
                const newProgress = req.body;
                const query = { email: newProgress.email };
                const isExisted = await progressCollections.findOne(query);

                if (!isExisted) {
                    // If the user doesn't exist, create a new document
                    const newUserProgress = {
                        email: newProgress.email,
                        lessons: [newProgress.lesson],
                    };
                    const result = await progressCollections.insertOne(newUserProgress);
                    res.status(201).send({ message: 'New progress added', result });
                } else {
                    // If the user exists, update their lessons array
                    const updateDoc = {
                        $push: {
                            lessons: newProgress.lesson, // Append new progress to the lessons array
                        },
                    };
                    const result = await progressCollections.updateOne(query, updateDoc);
                    res.status(200).send({ message: 'Progress updated', result });
                }
            } catch (error) {
                console.error('Error updating progress:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.get('/progress', async (req, res) => {
            const result = await progressCollections.find().toArray() || [];
            res.send(result)
        })

        // user / Public API
        // get all lesson
        app.get('/all-lesson-users', async (req, res) => {
            try {
                // Get the lessons and vocabulary collections
                const vocabulary = await vocabularyCollections.find().toArray();
                const lessons = await lessonsCollections.find().toArray() || [];

                // Create a map for counting lesson_no in the vocabulary collection
                const lessonNoCounts = vocabulary.reduce((acc, item) => {
                    const lessonNo = item.lesson_no; // Assuming 'lesson_on' is the lesson number
                    acc[lessonNo] = (acc[lessonNo] || 0) + 1;
                    return acc;
                }, {});

                // Add vocabulary count to each lesson
                const result = lessons.map(lesson => {
                    const vocabularyCount = lessonNoCounts[lesson.lesson_no] || 0;
                    return {
                        ...lesson,
                        vocabulary_count: vocabularyCount
                    };
                });

                // Send the response with the lessons and vocabulary count
                res.send(result);
            } catch (error) {
                console.error("Error fetching lessons:", error);
                res.status(500).send("Internal Server Error");
            }
        })

        // get lesson content by lesson_no
        app.get('/all-lesson-users/:lesson_no', async (req, res) => {
            try {
                const lesson_no = parseFloat(req.params.lesson_no);
                const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
                const limit = 1; // 1 card per page
                const query = { lesson_no };
                console.log(query);
                // Calculate the skip value
                const skip = (page - 1) * limit;
                const result = await vocabularyCollections.find(query).skip(skip).limit(limit).toArray() || [];
                const totalCount = await vocabularyCollections.countDocuments(query);

                res.send({
                    data: result,
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                });
            } catch (error) {
                console.error("Error fetching lesson content:", error);
                res.status(500).send({ error: "An error occurred while fetching lessons content." });
            }
        });
        // get lesson by id
        app.get('/lesson-heading/:lesson_no', async (req, res) => {
            try {
                const lesson_no = parseFloat(req.params.lesson_no);
                const query = { lesson_no };
                console.log(query);

                const result = await lessonsCollections.findOne(query);
                res.send(result);
            } catch (error) {
                console.error("Error fetching lesson data:", error);
                res.status(500).send({ error: "An error occurred while fetching lessons." });
            }
        })
        // update a lesson
        app.patch('/all-lesson/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const update_info = req.body;
                const query = { _id: new ObjectId(id) };
                console.log(query)
                const update_Doc = {
                    $set: { ...update_info },
                };

                const result = await lessonsCollections.updateOne(query, update_Doc);
                console.log(result)
                res.send(result)

            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error updating Lesson', error: error.message });
            }
        });
        // delete lesson
        app.delete('/all-lesson/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await lessonsCollections.deleteOne(query);
            res.send(result)
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