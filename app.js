require('dotenv').config();
// const md5=require('md5');
const bcrypt=require('bcrypt');
const saltRounds=10;


const express=require('express');
const app=express();
const bodyParser=require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
const ejs=require('ejs');
const mongoose=require('mongoose');
const findOrCreate = require('mongoose-findorcreate');


const session=require('express-session');
const passport=require('passport');

const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.set('view engine','ejs');
app.use(express.static('public'));
// const encrypt=require('mongoose-encryption');

app.use(session({
    secret:"Give me freedom give me fire",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session()); 

passport.serializeUser(function(user, done) {
    done(null,  {id:user._id, username:user.username});
  });
   
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });


mongoose.connect('mongodb://0.0.0.0:27017/userDB',{useNewUrlParser:true,useUnifiedTopology:true});
const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
userSecret:[String]
});
// userSchema.plugin(encrypt, { secret: process.env.SECRETS,encryptedFields: ['password'] });
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);
const User=mongoose.model('User',userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        console.log(user);
      return cb(err, user);
    });
  }
));




app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
  app.get("/auth/google",

  passport.authenticate("google", { scope: ["profile"] })
  
  );
 
app.get("/",function(req,res){
res.render('home');
});


app.get("/login",function(req,res){
    res.render('login');
    });

    app.get("/register",function(req,res){
        res.render('register');
        });

        app.get("/secrets", function (req, res) {
     User.find({userSecret:{$ne:null}}).then(function(result){
      res.render('secrets',{result:result});
      }).catch(function(err){
        console.log(err);
      })
     });
  



app.post('/submit',function(req,res){
  const submitSecret=req.body.secret;
  User.findById(req.user.id).then(function(result){
    if(result){
      result.userSecret.push(submitSecret);

      result.save().then(function(){
        res.redirect('/secrets');
      });
    }
  });
});


   app.post("/register",function(req,res){

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    //     const newUser=new User({
    //         email:req.body.username,
    //         password:hash
    //     });
    //     newUser.save().then(function(){
    //         res.render("secrets");
    //     }).catch(function(err){
    //         console.log(err);
    //     })

    // });
User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
        console.log(err);
        res.redirect('/register');
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets")
        })
    }
})


   });     

   app.post('/login',function(req,res){


    // User.findOne({email:req.body.username}).then(function(results){
    //     bcrypt.compare(req.body.password, results.password, function(err, result) {
    //     if(result===true){
    //         res.render('secrets');
    //     }
    //     });
    
    // }).catch(function(err){
    //     console.log(err);
    //  })
    const user =new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err)
        console.log(err);
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect('/secrets');
            })
        }
    })
   });

   app.post("/logout",function(req,res){
    req.logout(function(err){
        if(err){
        console.log(err);}
        else{
            res.redirect("/");
        }
    })
   });
   app.get("/logout",function(req,res){
    res.redirect("/");
   })

    
app.get("/submit",function(req,res){
    res.render('submit');
    });

app.listen(3000,function(req,res){
    console.log("Sucessfully connected");
});