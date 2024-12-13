const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/final8020', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Admin Schema (No hashing of passwords)
const adminSchema = new mongoose.Schema({
    uname: String,
    pass: String, // Store plain text password directly
});

const Admin = mongoose.model('Admin', adminSchema);

// Order Schema
const Order = mongoose.model('Order', {
    name: String,
    phone: String,
    mangoJuices: Number,
    berryJuices: Number,
    appleJuices: Number,
});

const myApp = express();

//---------------- Do not modify anything above this --------------------------

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(path.join(__dirname, 'public')));
myApp.set('view engine', 'ejs');
myApp.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
myApp.use(
    session({
        secret: 'secureAdminSession',
        resave: false,
        saveUninitialized: true,
    })
);

// Check if user is logged in
function checkLogin(req, res, next) {
    if (!req.session.admin) {
        return res.redirect('/login');
    }
    next();
}

//------------- Use this space only for your routes ---------------------------

// Home page - Order Form (Requires login)
myApp.get('/', checkLogin, function (req, res) {
    res.render('orderForm', { errors: [], data: {} });
});

// Submit Order
myApp.post(
    '/submitOrder',
    [
        body('name', 'Name is required').isLength({ min: 1 }),
        body('phone', 'Phone must be a valid Canadian number').isMobilePhone('en-CA'),
        body('mangoJuices', 'Mango juice quantity must be a number').isNumeric(),
        body('berryJuices', 'Berry juice quantity must be a number').isNumeric(),
        body('appleJuices', 'Apple juice quantity must be a number').isNumeric(),
    ],
    function (req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('orderForm', { errors: errors.array(), data: req.body });
        }

        const { name, phone, mangoJuices, berryJuices, appleJuices } = req.body;

        let mangoPrice = 2.99,
            berryPrice = 1.99,
            applePrice = 2.49;
        let subTotal = mangoJuices * mangoPrice + berryJuices * berryPrice + appleJuices * applePrice;
        let tax = subTotal * 0.13;
        let totalCost = subTotal + tax;

        let newOrder = new Order({
            name,
            phone,
            mangoJuices: parseInt(mangoJuices),
            berryJuices: parseInt(berryJuices),
            appleJuices: parseInt(appleJuices),
        });

        newOrder.save().then(() => {
            // Pass the phone number to the confirmation view
            res.render('confirmation', { name, phone, mangoJuices, berryJuices, appleJuices, subTotal, tax, totalCost });
        });
    }
);



// Admin Login Page
myApp.get('/login', function (req, res) {
    res.render('login', { error: '' });
});

// Admin Login Submission
myApp.post('/login', function (req, res) {
    const { uname, pass } = req.body;

    console.log(`Attempting login with username: ${uname} and password: ${pass}`);

    Admin.findOne({ uname }).then((admin) => {
        if (!admin) {
            console.log('Invalid username or password');
            return res.render('login', { error: 'Username not found' });
        }

        // Directly compare the plain text password with the stored one
        if (admin.pass === pass) {
            console.log('Login successful');
            req.session.admin = true;
            res.redirect('/');
        } else {
            console.log('Incorrect password');
            res.render('login', { error: 'Incorrect password' });
        }
    }).catch((err) => {
        console.error('Error during login:', err);
        res.render('login', { error: 'An error occurred, please try again.' });
    });
});
myApp.get('/orders', checkLogin, function (req, res) {
    Order.find().then((orders) => {
        res.render('orders', { orders });
    }).catch((err) => {
        console.error('Error fetching orders:', err);
        res.status(500).send('An error occurred while fetching orders.');
    });
});




// Admin Logout
myApp.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/login');
});


//---------------- Do not modify anything below this --------------------------

//------------------------ Setup the database ---------------------------------
myApp.get('/setup', async function (req, res) {
    try {
        let adminData = [
            {
                uname: 'admin',
                pass: 'admin',  // Plain text password, no hashing
            },
        ];

        // Insert admin data without hashing
        await Admin.insertMany(adminData);

        var firstNames = ['John ', 'Alana ', 'Jane ', 'Will ', 'Tom ', 'Leon ', 'Jack ', 'Kris ', 'Lenny ', 'Lucas '];
        var lastNames = ['May', 'Riley', 'Rees', 'Smith', 'Walker', 'Allen', 'Hill', 'Byrne', 'Murray', 'Perry'];

        let ordersData = [];

        for (let i = 0; i < 10; i++) {
            let tempName =
                firstNames[Math.floor(Math.random() * 10)] + lastNames[Math.floor(Math.random() * 10)];
            let tempOrder = {
                name: tempName,
                phone: Math.floor(Math.random() * 10000000000),
                mangoJuices: Math.floor(Math.random() * 10),
                berryJuices: Math.floor(Math.random() * 10),
                appleJuices: Math.floor(Math.random() * 10),
            };
            ordersData.push(tempOrder);
        }

        // Insert orders data
        await Order.insertMany(ordersData);

        res.send('Database setup complete. You can now proceed with your exam.');
    } catch (error) {
        console.error('Error during setup:', error);
        res.status(500).send('Error setting up database');
    }
});

//----------- Start the server -------------------
myApp.listen(8080);
console.log('Server started at 8080 for mywebsite...');
