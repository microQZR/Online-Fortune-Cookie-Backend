const express = require("express");
const mongoose = require("mongoose");

const { getTriviaController, getTopEarnersController, postTriviaController } = require("./controllers");

const app = express();

app.use(express.json()); // Parses request body; appends parsed data to $req.body

// Setting CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  //intercepts OPTIONS method
  if ("OPTIONS" === req.method) {
    //respond with 200
    res.send(200);
  } else {
    //move on
    next();
  }
});

// Main business logic handlers
app.get("/trivia", getTriviaController);

app.post("/trivia", postTriviaController);

app.get("/top-earners", getTopEarnersController);

// Error handler for unsupported routes
app.use((req, res, next) => {
  res.status(404);
  res.json({ message: "Could not find this route" });
});

// Error handler for catching other errors. (delegates to default express error handler if already streaming response)
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status ?? 500);
  res.json({ message: err.message || "An unspecified error occured." });
});

// Connect to DB and start Express server
mongoose
  .connect(process.env.DB_CONNECTION_STRING)
  .then(() => {
    console.log("OK, DB Connected!");
    app.listen(process.env.PORT || 5000);
  })
  .catch(err => console.log(err));
