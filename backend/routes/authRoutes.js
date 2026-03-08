const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const passport = require("../config/passport");

const router = express.Router(); // ✅ router FIRST

router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});


// ================= SIGNUP =================
const { body, validationResult } = require("express-validator");

router.post(
"/signup",

[
  body("name")
  .isLength({ min: 3 })
  .withMessage("Name must be at least 3 characters"),

  body("email")
  .isEmail()
  .withMessage("Enter valid email"),

  body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be 8 characters")
  .matches(/[A-Z]/)
  .withMessage("Password must contain uppercase")
  .matches(/[0-9]/)
  .withMessage("Password must contain number")
  .matches(/[!@#$%^&*]/)
  .withMessage("Password must contain special character"),

  body("mobile")
.matches(/^(\+91)?[6-9]\d{9}$/)
.withMessage("Invalid Indian mobile number")

],

async (req,res)=>{

const errors = validationResult(req);

if(!errors.isEmpty()){
return res.status(400).json({
message: errors.array()[0].msg
});
}

try{

const {name,email,password,mobile,country} = req.body;

const existing = await User.findOne({
$or:[{email},{mobile}]
});

if(existing){
return res.status(400).json({
message:"Email or mobile already registered"
});
}

const hashed = await bcrypt.hash(password,10);

const user = await User.create({
name,
email,
password:hashed,
mobile,
country
});

res.json({
message:"Signup successful"
});

}catch(err){
console.log(err);
res.status(500).json({message:"Server error"});
}

});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        country: user.country
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get(
"/google",
passport.authenticate("google", {
scope:["profile","email"]
})
);

router.get(
"/google/callback",
passport.authenticate("google",{session:false}),
(req,res)=>{

const jwt = require("jsonwebtoken");

const token = jwt.sign(
{ userId: req.user._id },
process.env.JWT_SECRET,
{ expiresIn:"7d" }
);

res.redirect(
`https://expense-manager-sigma-sandy.vercel.app/dashboard.html?token=${token}`
);

}
);


const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

router.post("/forgot-password", async (req,res)=>{

const { email } = req.body;

if(!email){
return res.status(400).json({message:"Email required"});
}

const user = await User.findOne({ email });

if(!user){
return res.status(404).json({message:"User not found"});
}

const token = crypto.randomBytes(32).toString("hex");

user.resetToken = token;
user.resetTokenExpire = Date.now()+3600000;

await user.save();

const link =
`https://fluffy-peony-3a5444.netlify.app/reset-password.html?token=${token}`;

try {

await sendEmail(
email,
"Password Reset",
`Click this link to reset password: ${link}`
);

} catch (err) {

console.log("Email send failed", err);

}

res.json({message:"Reset link sent to email"});

});

// ================= RESET PASSWORD =================
router.post("/reset-password/:token", async (req, res) => {
  try {

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token"
      });
    }

    const { password } = req.body;

if(!password || password.length < 8){
return res.status(400).json({
message:"Password must be at least 8 characters"
});
}

    const hashed = await bcrypt.hash(password, 10);

    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= UPDATE PROFILE =================
router.put("/update-profile", authMiddleware, async (req,res)=>{

try{

const { name, mobile, country } = req.body;

const user = await User.findByIdAndUpdate(
req.user.id,
{ name, mobile, country },
{ new:true }
);

res.json({
message:"Profile updated",
user
});

}catch(err){

console.log(err);
res.status(500).json({message:"Server error"});

}

});
// ================= ME =================
router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

module.exports = router;
