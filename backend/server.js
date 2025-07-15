// Express server entry point
require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rate    = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss     = require('xss-clean');
const compression = require('compression');
const morgan  = require('morgan');
const path    = require('path');
const { connectDB } = require('./config/database');

const app = express();
connectDB();

app.use(express.static(path.join(__dirname, '../public')));




app.use(express.json());
app.use(helmet());
app.use(cors({ origin:process.env.FRONTEND_URL||'*' }));
app.use(compression());
app.use(mongoSanitize());
app.use(xss());
if(process.env.NODE_ENV!=='production') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});


app.get('/health', (_,res)=>res.json({success:true,message:'OK'}));

app.use((err,_,res,__)=>
  res.status(500).json({ success:false, message:err.message||'Server error' })
);

app.listen(process.env.PORT||5000, ()=>console.log(`🚀 Server on ${process.env.PORT||5000}`));
