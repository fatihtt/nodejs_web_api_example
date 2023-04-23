const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./authRoutes');
const talepRoutes = require('./talepRoutes');
const sayacRoutes = require('./sayacRoutes');
const talepRoutesGelismeli = require('./talepRoutesGelismeli');

const app = express();

app.use(bodyParser.json());
app.use(authRoutes);
app.use(talepRoutes);
app.use(sayacRoutes);
app.use(talepRoutesGelismeli);

app.get('/', (req, res) => {
    res.send('Hi theree');
});

app.listen(process.env.PORT || 3000, () => {
    const port = process.env.PORT || 3000;
    console.log("listening port " + port);
});